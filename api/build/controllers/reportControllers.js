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
exports.processImage = exports.getTotalReportsThisWeek = exports.getReportsThisWeek = exports.fetchAllReports = exports.storeImageToIPFSWithHelper = exports.initW3StorageClient = exports.storeImageToIPFS = exports.getReports = void 0;
const fs = __importStar(require("fs"));
require("dotenv/config");
const useActor_1 = __importDefault(require("../hooks/useActor"));
const core_auth_1 = require("@azure/core-auth");
const ai_vision_image_analysis_1 = __importStar(require("@azure-rest/ai-vision-image-analysis"));
const groq_sdk_1 = __importDefault(require("groq-sdk"));
const getReports = (req, res) => {
    res.send('Data Rep');
};
exports.getReports = getReports;
const storeImageToIPFS = (file, filePath, req, res, analysisResult) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Dynamic import untuk ESM module
        const w3up = yield Promise.resolve().then(() => __importStar(require('@web3-storage/w3up-client')));
        const client = yield w3up.create();
        yield client.login(process.env.WEB3_STORAGE_EMAIL);
        yield client.setCurrentSpace(`did:key:${process.env.WEB3_STORAGE_SPACEKEY}`);
        const cid = yield client.uploadFile(file);
        // Hapus file setelah upload berhasil
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
        res.json({
            success: true,
            cid: cid.toString(),
            url: `https://w3s.link/ipfs/${cid}`,
            analysisResult
        });
    }
    catch (error) {
        console.error('Error in storeImageToIPFS:', error);
        // Cleanup file jika terjadi error
        if (req.file && req.file.path && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        // Cleanup file dari parameter jika berbeda
        if (filePath && fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
        res.status(500).json({
            error: 'Failed to store image',
            details: error.message
        });
    }
});
exports.storeImageToIPFS = storeImageToIPFS;
// Fungsi helper untuk inisialisasi w3up client (opsional)
const initW3StorageClient = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const w3up = yield Promise.resolve().then(() => __importStar(require('@web3-storage/w3up-client')));
        const client = yield w3up.create();
        yield client.login(process.env.WEB3_STORAGE_EMAIL);
        yield client.setCurrentSpace(`did:key:${process.env.WEB3_STORAGE_SPACEKEY}`);
        return client;
    }
    catch (error) {
        console.error('Failed to initialize w3up client:', error);
        throw error;
    }
});
exports.initW3StorageClient = initW3StorageClient;
// Alternatif fungsi storeImageToIPFS yang menggunakan helper
const storeImageToIPFSWithHelper = (file, filePath, req, res, analysisResult) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const client = yield (0, exports.initW3StorageClient)();
        const cid = yield client.uploadFile(file);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
        res.json({
            success: true,
            cid: cid.toString(),
            url: `https://w3s.link/ipfs/${cid}`,
            analysisResult
        });
    }
    catch (error) {
        console.error('Error in storeImageToIPFS:', error);
        if (req.file && req.file.path && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        if (filePath && fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
        res.status(500).json({
            error: 'Failed to store image',
            details: error.message
        });
    }
});
exports.storeImageToIPFSWithHelper = storeImageToIPFSWithHelper;
const fetchAllReports = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const Actor = yield (0, useActor_1.default)();
        const reports = yield Actor.fetchAllValidReport();
        res.json({
            success: true,
            reports: reports
        });
    }
    catch (error) {
        console.error('Error fetching reports:', error);
        res.status(500).json({
            error: 'Failed to fetch reports',
            details: error.message
        });
    }
});
exports.fetchAllReports = fetchAllReports;
const getReportsThisWeek = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const Actor = yield (0, useActor_1.default)();
        const reportsThisWeek = yield Actor.getReportsThisWeek();
        res.json({
            success: true,
            reports: reportsThisWeek
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
        const Actor = yield (0, useActor_1.default)();
        const totalReportsThisWeek = yield (Actor).getReportsThisWeek();
        res.json({
            success: true,
            total: totalReportsThisWeek.toString()
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
const processImage = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    if (!req.file) {
        res.status(400).json({ error: 'No file uploaded' });
        return;
    }
    const location = req.body.location || 'Balikpapan';
    const filePath = req.file.path;
    if (!fs.existsSync(filePath)) {
        res.status(400).json({ error: 'File not found' });
        return;
    }
    const weatherData = yield fetch(`${process.env.WEATHER_API_URL}/current.json?key=${process.env.WEATHER_API_KEY}&q=${location}`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        },
    });
    const weatherResponse = yield weatherData.json();
    try {
        const fileBuffer = fs.readFileSync(filePath);
        const features = ["Caption", "DenseCaptions", "Tags", "Objects"];
        const credential = new core_auth_1.AzureKeyCredential(process.env.AZURE_COMPUTER_VISION_API_KEY);
        const endpoint = process.env.AZURE_COMPUTER_VISION_ENDPOINT;
        const client = (0, ai_vision_image_analysis_1.default)(endpoint, credential);
        const result = yield client.path("/imageanalysis:analyze").post({
            body: fileBuffer,
            queryParameters: {
                features: features,
                "smartCrops-aspect-ratios": [0.9, 1.33],
            },
            contentType: "application/octet-stream"
        });
        if ((0, ai_vision_image_analysis_1.isUnexpected)(result)) {
            throw new Error(`Analysis failed: ${(_a = result.body.error) === null || _a === void 0 ? void 0 : _a.message}`);
        }
        const groq = new groq_sdk_1.default({ apiKey: process.env.GROQ_API_KEY });
        const analysis = yield groq.chat.completions.create({
            model: 'gemma2-9b-it',
            messages: [
                {
                    role: 'system',
                    content: "You are an expert in disaster prediction. Provide concise and insightful additions to caption-based disaster analysis.",
                },
                {
                    role: 'user',
                    content: `
                    given caption data : ${JSON.stringify(result.body)} and weather data: ${JSON.stringify(weatherResponse)},
                                Detect the primary disaster condition from these categories:
                                Fire, Flood, Earthquake, Storm, Drought, Landslide, Air Pollution, Normal.
                                Scoring criteria:
                                Caption keywords scoring:
                                Fire, Flood, Earthquake, Landslide: 3 points per keyword match.
                                Storm, Drought, Air Pollution, Normal: 2 points per keyword match.
                                Visual cues scoring:
                                Fire: High red dominance (>0.4, +2), high brightness (>120, +1), high contrast (>50, +1).
                                Flood: High blue dominance (>0.35, +2), low brightness (<100, +1).
                                Earthquake: High contrast (>60, +1).
                                Drought: High brightness (>150, +1), high red dominance (>0.3) with low blue dominance (<0.2, +1).
                                Air Pollution: Low brightness (<120) & low contrast (<30, +2), low color variance (<20, +2), low sharpness (<100, +1), caption contains "gray"/"grey" (+1).
                                Normal: Moderate brightness (100-200, +1), moderate contrast (30-80, +1), high green dominance (>0.3, +2), moderate blue (>0.25) & low red dominance (<0.35, +1), high color variance (>30, +1), high sharpness (>200, +1).
                                Determine:
                                primary_disaster: Condition with the highest score.
                                confidence level:
                                Normal: High (≥4), Medium (≥2), Low (≥1), Undetected (<1).
                                Other disasters: High (≥5), Medium (≥3), Low (≥1), Undetected (<1).
                                air_quality:
                                Poor (≥3 Air Pollution points)
                                Moderate (≥1 Air Pollution point)
                                Excellent (Brightness >150 & Color Variance >40)
                                Good (otherwise)
                                Provide the output strictly as the following JSON format:
                                {
                                "primary_disaster": "...",
                                "confidence": "...",
                                "all_scores": {
                                    "fire": ...,
                                    "flood": ...,
                                    "earthquake": ...,
                                    "landslide": ...,
                                    "storm": ...,
                                    "drought": ...,
                                    "air_pollution": ...,
                                    "normal": ...
                                },
                                "air_quality": "...",
                                "visual_analysis": {
                                    "red_dominance": "...",
                                    "blue_dominance": "...",
                                    "green_dominance": "...",
                                    "brightness": "...",
                                    "contrast": "...",
                                    "color_variance": "...",
                                    "sharpness": "..."
                                }
                                }
                                Note: Provide all numeric values formatted neatly with appropriate precision.`
                }
            ],
            temperature: 0.7,
            max_completion_tokens: 500,
            stream: false,
            top_p: 0.9,
        });
        res.json({
            status: 'succes',
            analysis: ((_c = (_b = analysis.choices[0]) === null || _b === void 0 ? void 0 : _b.message) === null || _c === void 0 ? void 0 : _c.content) || ""
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
