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
exports.sendReportReward = exports.processImage = exports.getTotalReportsThisWeek = exports.getReportsThisWeek = exports.getValidReports = void 0;
exports.getMostReportedCategory = getMostReportedCategory;
exports.getReportById = getReportById;
exports.getLatestReports = getLatestReports;
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
const getValidReports = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const Actor = yield (0, useActor_1.useBackend)();
        const reports = yield Actor.getValidReports();
        res.json({
            success: true,
            reports: (0, sanitize_1.sanitize)(reports)
        });
    }
    catch (error) {
        console.error('Error fetching reports:', error);
        res.status(500).json({
            error: 'Failed to fetch report',
            details: error.message,
        });
    }
});
exports.getValidReports = getValidReports;
const getReportsThisWeek = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const Actor = yield (0, useActor_1.useBackend)();
        const reportsThisWeek = yield Actor.getReportsThisWeek();
        res.json({
            success: true,
            reports: (0, sanitize_1.sanitize)(reportsThisWeek)
        });
    }
    catch (error) {
        console.error('Error fetching reports this week:', error);
        res.status(500).json({
            error: 'Failed to fetch reports this week',
            details: error.message
        });
    }
});
exports.getReportsThisWeek = getReportsThisWeek;
const getTotalReportsThisWeek = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const Actor = yield (0, useActor_1.useBackend)();
        const totalReportsThisWeek = yield Actor.getReportsThisWeek();
        res.json({
            success: true,
            total: totalReportsThisWeek
        });
    }
    catch (error) {
        console.error('Error fetching total reports this week:', error);
        res.status(500).json({
            error: 'Failed to fetch total reports this week',
            details: error.message
        });
    }
});
exports.getTotalReportsThisWeek = getTotalReportsThisWeek;
const countTokenReward = (confidence) => {
    switch (confidence.toLowerCase()) {
        case 'high':
            return 8;
        case 'medium':
            return 6;
        case 'low':
            return 4;
        case 'none':
        default:
            return 0;
    }
};
const processImage = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    if (!req.file) {
        res.status(400).json({ error: 'No file uploaded' });
        return;
    }
    const features = ["Caption", "DenseCaptions", "Tags", "Objects"];
    const endpoint = process.env.AZURE_COMPUTER_VISION_API_ENDPOINT;
    const location = req.body.location || 'Balikpapan';
    const repId = "rep-" + (0, crypto_1.randomUUID)().toString();
    const Actor = yield (0, useActor_1.useBackend)();
    const groq = new groq_sdk_1.default({ apiKey: process.env.GROQ_API_KEY });
    const fileObj = (0, imageBuffer_1.imageBuffer)(req);
    const credential = new core_auth_1.AzureKeyCredential(process.env.AZURE_COMPUTER_VISION_API_KEY);
    const client = (0, ai_vision_image_analysis_1.default)(endpoint, credential);
    const cid = yield (0, storeImageToIPFS_1.storeImageToIPFS)(fileObj, req, res);
    const weatherData = yield fetch(`${process.env.WEATHER_API_URL}/current.json?key=${process.env.WEATHER_API_KEY}&q=${location}`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        },
    });
    const weatherResponse = yield weatherData.json();
    try {
        const result = yield client.path("/imageanalysis:analyze").post({
            body: req.file.buffer,
            queryParameters: {
                features: features,
                "smartCrops-aspect-ratios": [0.9, 1.33],
            },
            contentType: "application/octet-stream"
        });
        if ((0, ai_vision_image_analysis_1.isUnexpected)(result)) {
            throw new Error(`Analysis failed: ${(_a = result.body.error) === null || _a === void 0 ? void 0 : _a.message}`);
        }
        const PromptRoleSystem = "You are an expert in disaster prediction and image analysis. Provide comprehensive, step-by-step analysis of images for disaster detection and prediction.";
        const PromptRoleUser = `
            Analyze the following image data and weather information in a step-by-step manner:
            
            Image Analysis Data: ${JSON.stringify(result.body)}
            Weather Data: ${JSON.stringify(weatherResponse)}
            Location: ${location}
            
            - Analyze the location context based on the provided location: ${location}
            - Consider the current weather conditions from the weather data
            - Identify geographical and environmental factors that might influence disaster risks
            - Note any location-specific vulnerabilities or characteristics
            
            Validate the Image, Image Validation Requirements:
            - Check if the image is clear and not blurry
            - Verify if the image contains relevant environmental/geographical features
            - Confirm if the image quality is sufficient for disaster analysis
            - Determine if the image content is appropriate for disaster detection
            
            Provide the output strictly as the following JSON format:
            {
                "image_status": "valid/invalid",
                "confidence": "High/Medium/Low/None",
                "presentage_confidence": "90%",
                "category": "Fire/Flood/Earthquake/Storm/Drought/Landslide/Air Pollution/Normal/Etc",
                "description": "Detailed description of the analysis",
            }
            
            First Note: Provide all numeric values formatted neatly with appropriate precision, Only return the JSON object. Do not wrap it in code block formatting.
            
            Second Note: If image_status is "invalid", set confidence to "None", presentage_confidence to "0%", category to "Invalid Image", and explain why the image is invalid in the description. Provide all numeric values formatted neatly with appropriate precision, Only return the JSON object. Do not wrap it in code block formatting.
        `;
        const analysis = yield groq.chat.completions.create({
            model: 'gemma2-9b-it',
            messages: [
                {
                    role: 'system',
                    content: PromptRoleSystem,
                },
                {
                    role: 'user',
                    content: PromptRoleUser
                }
            ],
            temperature: 0.7,
            max_completion_tokens: 1000,
            stream: false,
            top_p: 0.9,
        });
        const analysisResult = analysis.choices[0].message.content;
        const parsedAnalysis = JSON.parse(analysisResult || '{}');
        const confidence = (parsedAnalysis === null || parsedAnalysis === void 0 ? void 0 : parsedAnalysis.confidence) || 'None';
        const totalTokenReward = countTokenReward(confidence);
        if (req.body.user && totalTokenReward > 0) {
            try {
                yield (0, exports.sendReportReward)(totalTokenReward);
            }
            catch (rewardError) {
                console.error('Error sending reward:', rewardError);
            }
        }
        Actor.addReport(repId, {
            id: repId,
            user: req.body.user || [],
            category: (parsedAnalysis === null || parsedAnalysis === void 0 ? void 0 : parsedAnalysis.category) || 'Normal',
            description: (parsedAnalysis === null || parsedAnalysis === void 0 ? void 0 : parsedAnalysis.description) || 'No description provided',
            location: req.body.location || 'Unknown',
            coordinates: req.body.coordinates || { latitude: 0, longitude: 0 },
            imageCid: (cid === null || cid === void 0 ? void 0 : cid.toString()) || '',
            status: 'valid',
            timestamp: BigInt(new Date().getTime()),
            confidence: confidence,
            presentage_confidence: (parsedAnalysis === null || parsedAnalysis === void 0 ? void 0 : parsedAnalysis.presentage_confidence) || '0%',
            rewardGiven: [totalTokenReward],
        });
        res.json({
            status: 'success',
        });
    }
    catch (error) {
        console.error('Error processing image:', error);
        res.status(500).json({
            error: 'Failed to process image',
            details: error.message
        });
    }
});
exports.processImage = processImage;
const sendReportReward = (tokenAmount) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const Actor = yield (0, useActor_1.useToken)();
        const Reward = yield Actor.icrc1_transfer({
            from_subaccount: [],
            to: {
                owner: principal_1.Principal.fromText('3gzjj-udemb-yhgo6-dyii6-sxlue-eo237-2egks-yvafd-vxnrx-swnwn-5qe'),
                subaccount: []
            },
            amount: BigInt(tokenAmount),
            fee: [],
            memo: [],
            created_at_time: []
        });
        return Reward;
    }
    catch (error) {
        console.error('Error sending token reward:', error);
        throw new Error(`Failed to send token reward: ${error.message}`);
    }
});
exports.sendReportReward = sendReportReward;
function getMostReportedCategory(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const Actor = yield (0, useActor_1.useBackend)();
            const mostReportedCategory = yield Actor.getMostReportedCategory();
            res.json({
                success: true,
                category: mostReportedCategory
            });
        }
        catch (error) {
            console.error('Error fetching most reported category:', error);
            res.status(500).json({
                error: 'Failed to fetch most reported category',
                details: error.message
            });
        }
    });
}
function getReportById(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        const reportId = req.params.id;
        try {
            const Actor = yield (0, useActor_1.useBackend)();
            const report = yield Actor.getReport(reportId);
            if (!report) {
                return res.status(404).json({
                    error: 'Report not found'
                });
            }
            res.json({
                success: true,
                report: (0, sanitize_1.sanitize)(report)
            });
        }
        catch (error) {
            console.error('Error fetching report by ID:', error);
            res.status(500).json({
                error: 'Failed to fetch report by ID',
                details: error.message
            });
        }
    });
}
function getLatestReports(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const Actor = yield (0, useActor_1.useBackend)();
            const latestReports = yield Actor.getLatestReport();
            res.json({
                success: true,
                reports: (0, sanitize_1.sanitize)(latestReports)
            });
        }
        catch (error) {
            console.error('Error fetching latest reports:', error);
            res.status(500).json({
                error: 'Failed to fetch latest reports',
                details: error.message
            });
        }
    });
}
