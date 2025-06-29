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


  const { identity, delegation, location = 'Balikpapan' } = req.body;

  const locationData = typeof location === 'string' ? JSON.parse(location) : location;
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
    `${process.env.WEATHER_API_URL}/current.json?key=${process.env.WEATHER_API_KEY}&q=${locationData.latitude || 0},${locationData.longitude || 0}`);
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
      You are an AI expert in environmental risk analysis. Your primary task is to determine if an image shows an outdoor environmental condition that could indicate an anomaly or a natural disaster, based on the provided image, weather, and location data.

      DATA FOR ANALYSIS:
      1. Image Analysis Data: ${JSON.stringify(result.body)}
      2. Weather Data: ${JSON.stringify(weatherResponse)}
      3. Image Location: ${location}

      FOLLOW THIS STEP-BY-STEP PROCESS:

      STEP 1: CRITICAL IMAGE VALIDATION
      This is the most crucial step. You must validate the image against the following criteria:
      - Was the image taken OUTDOORS? This is a MANDATORY requirement. Images clearly taken INDOORS (e.g., inside an office, a house, a bedroom, or any other building interior) are automatically INVALID.
      - Is the image clear and not blurry? A severely blurry image is INVALID.
      - Is the image content relevant for environmental analysis? Images like selfies, food pictures, or objects unrelated to the environment are INVALID.

      STEP 2: DETERMINE OUTPUT BASED ON VALIDATION
      - IF THE IMAGE IS INVALID (because it's indoors, blurry, or irrelevant): Immediately stop the analysis. Directly provide the JSON output with an "invalid" status. Briefly explain the reason in the "description" field (e.g., "Invalid image because it was taken indoors.").
      - IF THE IMAGE IS VALID: Proceed to Step 3.

      STEP 3: IN-DEPTH ANALYSIS (FOR VALID IMAGES ONLY)
      - Location Context Analysis: Based on the location data (${location}), identify the area's characteristics (e.g., dense urban area, near a river, hilly region, coastal area).
      - Weather Condition Analysis: Correlate the current weather data (e.g., heavy rain, strong winds, extreme heat) with what is visible in the image.
      - Image Element Analysis: Identify key elements in the picture (e.g., river water level, vegetation health, trash piles, dark clouds, soil condition).
      - Risk Assessment: Based on all the information above, determine a risk category (e.g., "Potential Flood," "Normal Conditions," "Signs of Drought," "Poorly Maintained Environment"). Write a description that explains your analysis.

      FINAL OUTPUT RULES:
        Provide the output ONLY in a JSON object format. Do not include markdown backticks (\`\) or the word "json" at the beginning.
      {
        "image_status": "valid" or "invalid",
        "confidence": "High/Medium/Low/None" (Use "None" if invalid),
        "presentage_confidence": "e.g., 95%" (Use "0%" if invalid),
        "category": "Determine the category based on your analysis, or 'Invalid Image' if invalid",
        "description": "Explain your analysis or the reason for the invalid status.",
        "title": "Create a short title that summarizes the image's condition/your analysis."
      }
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

    const { confidence = 'None', category = 'Normal', description = 'No description provided', presentage_confidence = '0%', image_status = 'invalid', title = 'Untitled' } = parsedAnalysis as any;
    const totalTokenReward = countTokenReward(confidence);

    // Send reward if valid
    if (identity && delegation && totalTokenReward > 0) {
      try {
        await giveReward({
          identity: identity, delegation, amount: BigInt(totalTokenReward)
        }).then((data) => {
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
      title,
      coordinates: { latitude: locationData?.latitude || 0, longitude: locationData?.longitude || 0 },
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
    const latestReports = await Actor.getLatestReports();
    res.json({ success: true, reports: sanitize(latestReports) });
  } catch (error) {
    return errorResponse(res, 'Failed to fetch latest reports', error);
  }
}

// Get my report (per user)
export async function getMyReport(req: Request, res: Response) {
  const { identity, delegation } = req.body;
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
