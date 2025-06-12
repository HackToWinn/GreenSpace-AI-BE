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
const crypto_1 = require("crypto");
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
    var _a, _b;
    if (!req.file) {
        res.status(400).json({ error: 'No file uploaded' });
        return;
    }
    console.log('File received:', req.file);
    const filePath = req.file.path;
    if (!fs.existsSync(filePath)) {
        res.status(400).json({ error: 'File not found' });
        return;
    }
    try {
        const fileBuffer = fs.readFileSync(filePath);
        // Get image caption using BLIP model
        const captionResponse = yield fetch('https://api-inference.huggingface.co/models/Salesforce/blip-image-captioning-large', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.HUGGING_FACE_API_KEY}`,
                'Content-Type': 'application/octet-stream',
            },
            body: fileBuffer,
        });
        if (!captionResponse.ok) {
            throw new Error(`BLIP API error: ${captionResponse.status}`);
        }
        const captionResult = yield captionResponse.json();
        const caption = ((_a = captionResult[0]) === null || _a === void 0 ? void 0 : _a.generated_text) || 'No caption generated';
        console.log('Image caption:', caption);
        // Combined comprehensive analysis using single Zephyr API call
        const comprehensivePrompt = `Based on this image description: "${caption}", provide a comprehensive analysis in the following structured format:

**DETAILED_DESCRIPTION:**
[Provide a detailed description of what is shown in the image, including visual elements, environmental conditions, structural details, people/activities, atmospheric conditions, and overall scene composition]

**DISASTER_ANALYSIS:**
[Analyze if this shows signs of a natural disaster and predict potential consequences including: type of disaster, potential secondary disasters, risk assessment, immediate concerns, and long-term implications]

**CATEGORY:**
[Classify into one category: FLOOD, FIRE, EARTHQUAKE, STORM, LANDSLIDE, DROUGHT, VOLCANIC, or NONE]

**CONFIDENCE:**
[Provide confidence score as percentage 0-100%]

**REASONING:**
[Brief explanation for the categorization]

Please be specific, factual, and ensure each section is clearly marked with the exact headers shown above.`;
        const comprehensiveResponse = yield fetch('https://api-inference.huggingface.co/models/HuggingFaceH4/zephyr-7b-beta', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.HUGGING_FACE_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                inputs: comprehensivePrompt,
                parameters: {
                    max_new_tokens: 800,
                    temperature: 0.5,
                    do_sample: true,
                    top_p: 0.9
                }
            }),
        });
        if (!comprehensiveResponse.ok) {
            throw new Error(`Comprehensive analysis API error: ${comprehensiveResponse.status}`);
        }
        const comprehensiveResult = yield comprehensiveResponse.json();
        const fullAnalysis = ((_b = comprehensiveResult[0]) === null || _b === void 0 ? void 0 : _b.generated_text) || 'No analysis generated';
        console.log('Comprehensive analysis:', fullAnalysis);
        // Parse the structured response
        const parseAnalysis = (text) => {
            const sections = {
                description: 'No detailed description generated',
                analysis: 'No disaster analysis generated',
                category: 'NONE',
                confidence: '0',
                reasoning: 'Unable to analyze'
            };
            try {
                // Extract detailed description
                const descMatch = text.match(/\*\*DETAILED_DESCRIPTION:\*\*\s*([\s\S]*?)(?=\*\*DISASTER_ANALYSIS:\*\*|$)/i);
                if (descMatch)
                    sections.description = descMatch[1].trim();
                // Extract disaster analysis
                const analysisMatch = text.match(/\*\*DISASTER_ANALYSIS:\*\*\s*([\s\S]*?)(?=\*\*CATEGORY:\*\*|$)/i);
                if (analysisMatch)
                    sections.analysis = analysisMatch[1].trim();
                // Extract category
                const categoryMatch = text.match(/\*\*CATEGORY:\*\*\s*([A-Z]+)/i);
                if (categoryMatch)
                    sections.category = categoryMatch[1].trim();
                // Extract confidence
                const confidenceMatch = text.match(/\*\*CONFIDENCE:\*\*\s*(\d+)%?/i);
                if (confidenceMatch)
                    sections.confidence = confidenceMatch[1].trim();
                // Extract reasoning
                const reasoningMatch = text.match(/\*\*REASONING:\*\*\s*([\s\S]*?)$/i);
                if (reasoningMatch)
                    sections.reasoning = reasoningMatch[1].trim();
            }
            catch (parseError) {
                console.error('Error parsing analysis:', parseError);
            }
            return sections;
        };
        const parsedAnalysis = parseAnalysis(fullAnalysis);
        // Format category analysis for consistency
        const categoryAnalysis = `Category: ${parsedAnalysis.category}\nConfidence: ${parsedAnalysis.confidence}%\nReasoning: ${parsedAnalysis.reasoning}`;
        console.log('Parsed analysis:', parsedAnalysis);
        const file = new File([fileBuffer], req.file.originalname);
        // Store to IPFS with parsed analysis data
        const cid = yield (0, exports.storeImageToIPFS)(file, filePath, req, res, {
            description: parsedAnalysis.description,
            analysis: parsedAnalysis.analysis,
            category: categoryAnalysis,
            timestamp: new Date().toISOString()
        });
        const Actor = yield (0, useActor_1.default)();
        yield Actor.addReport(crypto_1.randomUUID.toString(), {
            id: crypto_1.randomUUID.toString(),
            user: req.body.user,
            category: categoryAnalysis,
            description: parsedAnalysis.description,
            location: req.body.location,
            coordinates: req.body.coordinates,
            status: 'pending',
            imageCid: cid,
            timestamp: new Date(),
            rewardGiven: [],
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
