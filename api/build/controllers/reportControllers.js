var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import 'dotenv/config';
import { useBackend } from '../hooks/useActor.js';
import { AzureKeyCredential } from '@azure/core-auth';
import { isUnexpected } from '@azure-rest/ai-vision-image-analysis';
import Groq from 'groq-sdk';
import { randomUUID } from 'crypto';
import { sanitize } from '../utils/sanitize.js';
import { Principal } from '@dfinity/principal';
import { storeImageToIPFS } from '../utils/storeImageToIPFS.js';
import { imageBuffer } from '../utils/imageBuffer.js';
// ---------- Helper for Error Response ----------
function errorResponse(res, msg, error, code = 500) {
    console.error(msg, error);
    return res.status(code).json({
        error: msg,
        details: error instanceof Error ? error.message : undefined,
    });
}
// ---------- Core Handlers ----------
// Get all valid reports
export const getValidReports = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const Actor = yield useBackend();
        const reports = yield Actor.getValidReports();
        res.json({ success: true, reports: sanitize(reports) });
    }
    catch (error) {
        return errorResponse(res, 'Failed to fetch report', error);
    }
});
// Get this week reports (array)
export const getReportsThisWeek = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const Actor = yield useBackend();
        const reportsThisWeek = yield Actor.getReportsThisWeek();
        res.json({ success: true, reports: sanitize(reportsThisWeek) });
    }
    catch (error) {
        return errorResponse(res, 'Failed to fetch reports this week', error);
    }
});
// Get total number of reports this week (bukan array)
export const getTotalReportsThisWeek = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const Actor = yield useBackend();
        const total = yield Actor.getReportsThisWeek();
        res.json({ success: true, total });
    }
    catch (error) {
        return errorResponse(res, 'Failed to fetch total reports this week', error);
    }
});
// Category reward calculation helper
const countTokenReward = (confidence) => {
    switch ((confidence || '').toLowerCase()) {
        case 'high': return 8;
        case 'medium': return 6;
        case 'low': return 4;
        default: return 0;
    }
};
// Image AI Analysis + Reward Pipeline
export const processImage = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    if (!req.file)
        return res.status(400).json({ error: 'No file uploaded' });
    const { identity, delegation, location = 'Balikpapan', user, coordinates } = req.body;
    const features = ["Caption", "DenseCaptions", "Tags", "Objects"];
    const endpoint = process.env.AZURE_COMPUTER_VISION_API_ENDPOINT;
    const credential = new AzureKeyCredential(process.env.AZURE_COMPUTER_VISION_API_KEY);
    const client = createClient(endpoint, credential);
    const repId = "rep-" + randomUUID();
    const Actor = yield useBackend(identity, delegation);
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    const fileObj = imageBuffer(req);
    // Store image to IPFS
    const cid = yield storeImageToIPFS(fileObj, req, res);
    // Fetch weather data
    const weatherData = yield fetch(`${process.env.WEATHER_API_URL}/current.json?key=${process.env.WEATHER_API_KEY}&q=${location}`);
    const weatherResponse = yield weatherData.json();
    try {
        // Run Azure AI Vision
        const result = yield client.path("/imageanalysis:analyze").post({
            body: req.file.buffer,
            queryParameters: {
                features,
                "smartCrops-aspect-ratios": [0.9, 1.33],
            },
            contentType: "application/octet-stream"
        });
        if (isUnexpected(result))
            throw new Error((_a = result.body.error) === null || _a === void 0 ? void 0 : _a.message);
        // Prompt engineering
        const PromptRoleSystem = "You are an expert in disaster prediction and image analysis. Provide comprehensive, step-by-step analysis of images for disaster detection and prediction.";
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
        const analysis = yield groq.chat.completions.create({
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
        try {
            parsedAnalysis = JSON.parse(analysisResult || '{}');
        }
        catch (e) { /* fallback to empty obj */ }
        const { confidence = 'None', category = 'Normal', description = 'No description provided', presentage_confidence = '0%', image_status = 'invalid' } = parsedAnalysis;
        const totalTokenReward = countTokenReward(confidence);
        // // Send reward if valid
        // if (user && totalTokenReward > 0) {
        //   try { await sendReportReward(totalTokenReward); }
        //   catch (rewardError) { console.error('Error sending reward:', rewardError); }
        // }
        // Save report
        yield Actor.addReport(repId, {
            id: repId,
            user: Principal.fromText('3gzjj-udemb-yhgo6-dyii6-sxlue-eo237-2egks-yvafd-vxnrx-swnwn-5qe'), // the process at the motoko canister automatically get the user from the identity
            category,
            description,
            location,
            coordinates: coordinates || { latitude: 0, longitude: 0 },
            imageCid: (cid === null || cid === void 0 ? void 0 : cid.toString()) || '',
            status: image_status === 'valid' ? 'valid' : 'invalid',
            timestamp: BigInt(Date.now()),
            confidence,
            presentage_confidence,
            rewardGiven: [totalTokenReward],
        });
        res.json({ status: 'success' });
    }
    catch (error) {
        return errorResponse(res, 'Failed to process image', error);
    }
});
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
export function getMostReportedCategory(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const Actor = yield useBackend();
            const category = yield Actor.getMostReportedCategory();
            res.json({ success: true, category });
        }
        catch (error) {
            return errorResponse(res, 'Failed to fetch most reported category', error);
        }
    });
}
// Get report by ID
export function getReportById(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        const { id } = req.params;
        try {
            const Actor = yield useBackend();
            const report = yield Actor.getReport(id);
            if (!report)
                return res.status(404).json({ error: 'Report not found' });
            res.json({ success: true, report: sanitize(report) });
        }
        catch (error) {
            return errorResponse(res, 'Failed to fetch report by ID', error);
        }
    });
}
// Get latest reports
export function getLatestReports(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const Actor = yield useBackend();
            const latestReports = yield Actor.getLatestReport();
            res.json({ success: true, reports: sanitize(latestReports) });
        }
        catch (error) {
            return errorResponse(res, 'Failed to fetch latest reports', error);
        }
    });
}
// Get my report (per user)
export function getMyReport(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        const { identity, delegation } = req.body;
        console.log('getMyReport called with identity:', identity, 'delegation:', delegation);
        if (!identity || !delegation) {
            return res.status(400).json({
                error: 'Missing required fields: identity and delegation are required'
            });
        }
        try {
            const Actor = yield useBackend(identity, delegation);
            const myReport = yield Actor.getReportByUser();
            if (!myReport) {
                return res.status(404).json({ error: 'No report found for this user' });
            }
            res.json({ success: true, report: sanitize(myReport) });
        }
        catch (error) {
            return errorResponse(res, 'Failed to fetch my report', error);
        }
    });
}
