import { Request, Response } from 'express';
import 'dotenv/config';
import { useBackend } from '../hooks/useActor';
import { AzureKeyCredential } from '@azure/core-auth';
import ImageAnalysisClient, { isUnexpected } from '@azure-rest/ai-vision-image-analysis';
import Groq from 'groq-sdk';
import { randomUUID } from 'crypto';
import { sanitize } from '../utils/sanitize';
import { Principal } from '@dfinity/principal';
import { storeImageToStorage } from '../utils/storeImageToStorage';
import { imageBuffer } from '../utils/imageBuffer';
import { giveReward } from './tokenControllers';

// ---------- Helper for Error Response ----------
function errorResponse(res: Response, msg: string, error?: unknown, code = 500) {
  console.error(msg, error);
  return res.status(code).json({
    error: msg,
    details: error instanceof Error ? error.message : undefined,
  });
}

// ---------- Core Handlers ----------

// Get all valid reports
export const getValidReports = async (req: Request, res: Response) => {
  try {
    const Actor = await useBackend();
    const reports = await Actor.getValidReports();
    res.json({ success: true, reports: sanitize(reports) });
  } catch (error) {
    return errorResponse(res, 'Failed to fetch report', error);
  }
};

// Get this week reports (array)
export const getReportsThisWeek = async (req: Request, res: Response) => {
  try {
    const Actor = await useBackend();
    const reportsThisWeek = await Actor.getReportsThisWeek();
    res.json({ success: true, reports: sanitize(reportsThisWeek) });
  } catch (error) {
    return errorResponse(res, 'Failed to fetch reports this week', error);
  }
};

// Get total number of reports this week (bukan array)
export const getTotalReportsThisWeek = async (req: Request, res: Response) => {
  try {
    const Actor = await useBackend();
    const total = await Actor.getReportsThisWeek();
    res.json({ success: true, total });
  } catch (error) {
    return errorResponse(res, 'Failed to fetch total reports this week', error);
  }
};

// Category reward calculation helper
const countTokenReward = (confidence: string): number => {
  switch ((confidence || '').toLowerCase()) {
    case 'high': return 8;
    case 'medium': return 6;
    case 'low': return 4;
    default: return 0;
  }
};

// Image AI Analysis + Reward Pipeline
export const processImage = async (req: Request, res: Response) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  const { identity, delegation, location = 'Balikpapan', user, coordinates } = req.body;
  const features = ["Caption", "DenseCaptions", "Tags", "Objects"];
  const endpoint = process.env.AZURE_COMPUTER_VISION_API_ENDPOINT!;
  const credential = new AzureKeyCredential(process.env.AZURE_COMPUTER_VISION_API_KEY!);
  const client = ImageAnalysisClient(endpoint, credential);
  const repId = "rep-" + randomUUID();
  const Actor = await useBackend(identity, delegation);
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY! });

  // Store image to Azure Blob Storage
  const url = await storeImageToStorage(req.file, req, res, 'reports');

  // Fetch weather data
  const weatherData = await fetch(
    `${process.env.WEATHER_API_URL}/current.json?key=${process.env.WEATHER_API_KEY}&q=${location}`
  );
  const weatherResponse = await weatherData.json();

  try {
    // Run Azure AI Vision
    const result = await client.path("/imageanalysis:analyze").post({
      body: req.file.buffer,
      queryParameters: {
        features,
        "smartCrops-aspect-ratios": [0.9, 1.33],
      },
      contentType: "application/octet-stream"
    });
    if (isUnexpected(result)) throw new Error(result.body.error?.message);

    // Prompt engineering
    const PromptRoleSystem =
      "You are an expert in disaster prediction and image analysis. Provide comprehensive, step-by-step analysis of images for disaster detection and prediction.";
    const PromptRoleUser = `
      Analyze the following image data and weather information in a step-by-step manner:
      Image Analysis Data: ${JSON.stringify(result.body)}
      Weather Data: ${JSON.stringify(weatherResponse)}
      Location: ${location}
      - Analyze the location context...
      - Consider the current weather conditions...
      - Identify geographical/environmental factors...
      - Note any location-specific vulnerabilities...
      Validate the Image:
      - Check if clear/not blurry...
      - Verify environmental/geographical features...
      - Confirm image quality...
      - Determine content appropriateness...
      Provide output as JSON:
      {
        "image_status": "valid/invalid",
        "confidence": "High/Medium/Low/None",
        "presentage_confidence": "90%",
        "category": "...",
        "description": "..."
      }
      First Note: Only return JSON object. No code block.
      Second Note: If invalid, set confidence="None", presentage_confidence="0%", category="Invalid Image", explain reason.
    `;

    const analysis = await groq.chat.completions.create({
      model: 'gemma2-9b-it',
      messages: [
        { role: 'system', content: PromptRoleSystem },
        { role: 'user', content: PromptRoleUser }
      ],
      temperature: 0.7,
      max_completion_tokens: 1000,
      stream: false,
      top_p: 0.9,
    });

    // Parse analysis result
    let analysisResult = analysis.choices[0].message.content;
    let parsedAnalysis = {};
    try { parsedAnalysis = JSON.parse(analysisResult || '{}'); }
    catch (e) { /* fallback to empty obj */ }

    const { confidence = 'None', category = 'Normal', description = 'No description provided', presentage_confidence = '0%', image_status = 'invalid' } = parsedAnalysis as any;
    const totalTokenReward = countTokenReward(confidence);

    // Send reward if valid
    console.log(`Processing report for user: ${user}`);
    if (identity && delegation && totalTokenReward > 0) {
      console.log(`Total token reward for user ${user}: ${totalTokenReward}`);
      try {
        await giveReward({
          identity: identity, delegation, amount: BigInt(totalTokenReward)
        }).then((data) => {
          console.log(`Reward of ${totalTokenReward} tokens sent to user: ${user}`);
          console.log('Reward transaction details:', data);
        });
      }
      catch (rewardError) { console.error('Error sending reward:', rewardError); }
    }

    // Save report
    await Actor.addReport(repId, {
      id: repId,
      user: Principal.fromText('3gzjj-udemb-yhgo6-dyii6-sxlue-eo237-2egks-yvafd-vxnrx-swnwn-5qe') as any, // the process at the motoko canister automatically get the user from the identity
      category,
      description,
      location,
      coordinates: coordinates || { latitude: 0, longitude: 0 },
      imageCid: url || '',
      status: image_status === 'valid' ? 'valid' : 'invalid',
      timestamp: BigInt(Date.now()),
      confidence,
      presentage_confidence,
      rewardGiven: [totalTokenReward],
    });

    res.json({ status: 'success' });
  } catch (error) {
    return errorResponse(res, 'Failed to process image', error);
  }
};

// // Token reward util
// export const sendReportReward = async (tokenAmount: number) => {
//   try {
//     const Actor = await useToken();
//     const Reward = await Actor.icrc1_transfer({
//       from_subaccount: [],
//       to: {
//         owner: Principal.fromText('3gzjj-udemb-yhgo6-dyii6-sxlue-eo237-2egks-yvafd-vxnrx-swnwn-5qe') as any,
//         subaccount: []
//       },
//       amount: BigInt(tokenAmount),
//       fee: [],
//       memo: [],
//       created_at_time: []
//     });
//     return Reward;
//   } catch (error) {
//     console.error('Error sending token reward:', error);
//     throw new Error(`Failed to send token reward: ${(error as Error).message}`);
//   }
// };

// Get most reported category
export async function getMostReportedCategory(req: Request, res: Response) {
  try {
    const Actor = await useBackend();
    const category = await Actor.getMostReportedCategory();
    res.json({ success: true, category });
  } catch (error) {
    return errorResponse(res, 'Failed to fetch most reported category', error);
  }
}

// Get report by ID
export async function getReportById(req: Request, res: Response) {
  const { id } = req.params;
  try {
    const Actor = await useBackend();
    const report = await Actor.getReport(id);
    if (!report) return res.status(404).json({ error: 'Report not found' });
    res.json({ success: true, report: sanitize(report) });
  } catch (error) {
    return errorResponse(res, 'Failed to fetch report by ID', error);
  }
}

// Get latest reports
export async function getLatestReports(req: Request, res: Response) {
  try {
    const Actor = await useBackend();
    const latestReports = await Actor.getLatestReport();
    res.json({ success: true, reports: sanitize(latestReports) });
  } catch (error) {
    return errorResponse(res, 'Failed to fetch latest reports', error);
  }
}

// Get my report (per user)
export async function getMyReport(req: Request, res: Response) {
  const { identity, delegation } = req.body;
  console.log('getMyReport called with identity:', identity, 'delegation:', delegation);
  if (!identity || !delegation) {
    return res.status(400).json({
      error: 'Missing required fields: identity and delegation are required'
    });
  }
  try {
    const Actor = await useBackend(identity, delegation);
    const myReport = await Actor.getReportByUser();
    if (!myReport) {
      return res.status(404).json({ error: 'No report found for this user' });
    }
    res.json({ success: true, report: sanitize(myReport) });
  } catch (error) {
    return errorResponse(res, 'Failed to fetch my report', error);
  }
}
