"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.processImage = exports.getTotalReportsThisWeek = exports.getReportsThisWeek = exports.getValidReports = void 0;
exports.getMostReportedCategory = getMostReportedCategory;
exports.getReportById = getReportById;
exports.getLatestReports = getLatestReports;
exports.getMyReport = getMyReport;
require("dotenv/config");
const useActor_1 = require("../hooks/useActor");
const core_auth_1 = require("@azure/core-auth");
const ai_vision_image_analysis_1 = __importStar(require("@azure-rest/ai-vision-image-analysis"));
const groq_sdk_1 = __importDefault(require("groq-sdk"));
const crypto_1 = require("crypto");
const sanitize_1 = require("../utils/sanitize");
const principal_1 = require("@dfinity/principal");
const storeImageToIPFS_1 = require("../utils/storeImageToIPFS");
const imageBuffer_1 = require("../utils/imageBuffer");
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
const getValidReports = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const Actor = yield (0, useActor_1.useBackend)();
        const reports = yield Actor.getValidReports();
        res.json({ success: true, reports: (0, sanitize_1.sanitize)(reports) });
    }
    catch (error) {
        return errorResponse(res, 'Failed to fetch report', error);
    }
});
exports.getValidReports = getValidReports;
// Get this week reports (array)
const getReportsThisWeek = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const Actor = yield (0, useActor_1.useBackend)();
        const reportsThisWeek = yield Actor.getReportsThisWeek();
        res.json({ success: true, reports: (0, sanitize_1.sanitize)(reportsThisWeek) });
    }
    catch (error) {
        return errorResponse(res, 'Failed to fetch reports this week', error);
    }
});
exports.getReportsThisWeek = getReportsThisWeek;
// Get total number of reports this week (bukan array)
const getTotalReportsThisWeek = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const Actor = yield (0, useActor_1.useBackend)();
        const total = yield Actor.getReportsThisWeek();
        res.json({ success: true, total });
    }
    catch (error) {
        return errorResponse(res, 'Failed to fetch total reports this week', error);
    }
});
exports.getTotalReportsThisWeek = getTotalReportsThisWeek;
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
const processImage = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    if (!req.file)
        return res.status(400).json({ error: 'No file uploaded' });
    const { identity, delegation, location = 'Balikpapan', user, coordinates } = req.body;
    const features = ["Caption", "DenseCaptions", "Tags", "Objects"];
    const endpoint = process.env.AZURE_COMPUTER_VISION_API_ENDPOINT;
    const credential = new core_auth_1.AzureKeyCredential(process.env.AZURE_COMPUTER_VISION_API_KEY);
    const client = (0, ai_vision_image_analysis_1.default)(endpoint, credential);
    const repId = "rep-" + (0, crypto_1.randomUUID)();
    const Actor = yield (0, useActor_1.useBackend)(identity, delegation);
    const groq = new groq_sdk_1.default({ apiKey: process.env.GROQ_API_KEY });
    const fileObj = (0, imageBuffer_1.imageBuffer)(req);
    // Store image to IPFS
    const cid = yield (0, storeImageToIPFS_1.storeImageToIPFS)(fileObj, req, res);
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
        if ((0, ai_vision_image_analysis_1.isUnexpected)(result))
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
            user: principal_1.Principal.fromText('3gzjj-udemb-yhgo6-dyii6-sxlue-eo237-2egks-yvafd-vxnrx-swnwn-5qe'), // the process at the motoko canister automatically get the user from the identity
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
exports.processImage = processImage;
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
function getMostReportedCategory(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const Actor = yield (0, useActor_1.useBackend)();
            const category = yield Actor.getMostReportedCategory();
            res.json({ success: true, category });
        }
        catch (error) {
            return errorResponse(res, 'Failed to fetch most reported category', error);
        }
    });
}
// Get report by ID
function getReportById(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        const { id } = req.params;
        try {
            const Actor = yield (0, useActor_1.useBackend)();
            const report = yield Actor.getReport(id);
            if (!report)
                return res.status(404).json({ error: 'Report not found' });
            res.json({ success: true, report: (0, sanitize_1.sanitize)(report) });
        }
        catch (error) {
            return errorResponse(res, 'Failed to fetch report by ID', error);
        }
    });
}
// Get latest reports
function getLatestReports(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const Actor = yield (0, useActor_1.useBackend)();
            const latestReports = yield Actor.getLatestReport();
            res.json({ success: true, reports: (0, sanitize_1.sanitize)(latestReports) });
        }
        catch (error) {
            return errorResponse(res, 'Failed to fetch latest reports', error);
        }
    });
}
// Get my report (per user)
function getMyReport(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        const { identity, delegation } = req.body;
        console.log('getMyReport called with identity:', identity, 'delegation:', delegation);
        if (!identity || !delegation) {
            return res.status(400).json({
                error: 'Missing required fields: identity and delegation are required'
            });
        }
        try {
            const Actor = yield (0, useActor_1.useBackend)(identity, delegation);
            const myReport = yield Actor.getReportByUser();
            if (!myReport) {
                return res.status(404).json({ error: 'No report found for this user' });
            }
            res.json({ success: true, report: (0, sanitize_1.sanitize)(myReport) });
        }
        catch (error) {
            return errorResponse(res, 'Failed to fetch my report', error);
        }
    });
}
