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
exports.processImage = exports.analysisImage = exports.storeImageToIPFS = exports.getReports = void 0;
const fs = __importStar(require("fs"));
const w3up = __importStar(require("@web3-storage/w3up-client"));
require("dotenv/config");
const useActor_1 = __importDefault(require("../hooks/useActor"));
const crypto_1 = require("crypto");
const getReports = (req, res) => {
    res.send('Data Rep');
};
exports.getReports = getReports;
const storeImageToIPFS = (file, filePath, req, res, analysisResult) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const client = yield w3up.create();
        yield client.login(process.env.WEB3_STORAGE_EMAIL);
        yield client.setCurrentSpace(`did:key:${process.env.WEB3_STORAGE_SPACEKEY}`);
        const cid = yield client.uploadFile(file);
        fs.unlinkSync(filePath);
        res.json({
            success: true,
            cid: cid.toString(),
            url: `https://w3s.link/ipfs/${cid}`
        });
    }
    catch (error) {
        console.error('Error in storeImageToIPFS:', error);
        if (req.file && req.file.path && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        res.status(500).json({
            error: 'Failed to store image',
            details: error.message
        });
    }
});
exports.storeImageToIPFS = storeImageToIPFS;
const analysisImage = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
});
exports.analysisImage = analysisImage;
const processImage = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d;
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
        // Predict disaster consequences using Zephyr model
        const disasterPrompt = `Based on this image description: "${caption}", analyze if this shows signs of a natural disaster and predict potential secondary disasters or consequences that might follow. Provide a detailed assessment including:
1. Type of disaster identified (if any)
2. Potential secondary disasters
3. Risk assessment
4. Immediate concerns
5. Long-term implications

Please be specific and factual in your analysis.`;
        const zephyrResponse = yield fetch('https://api-inference.huggingface.co/models/HuggingFaceH4/zephyr-7b-beta', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.HUGGING_FACE_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                inputs: disasterPrompt,
                parameters: {
                    max_new_tokens: 500,
                    temperature: 0.7,
                    do_sample: true,
                    top_p: 0.9
                }
            }),
        });
        if (!zephyrResponse.ok) {
            throw new Error(`Zephyr API error: ${zephyrResponse.status}`);
        }
        const zephyrResult = yield zephyrResponse.json();
        const analysis = ((_b = zephyrResult[0]) === null || _b === void 0 ? void 0 : _b.generated_text) || 'No disaster analysis generated';
        console.log('Disaster analysis:', analysis);
        // Categorize disaster based on analysis
        const categoryPrompt = `Based on this disaster analysis: "${analysis}", classify the disaster into one of these categories and provide a confidence score:

Categories:
- FLOOD: Water-related disasters, flooding, tsunamis
- FIRE: Wildfires, building fires, forest fires
- EARTHQUAKE: Seismic activities, structural damage from earthquakes
- STORM: Hurricanes, tornadoes, severe weather
- LANDSLIDE: Landslides, mudslides, ground movement
- DROUGHT: Water scarcity, agricultural impact
- VOLCANIC: Volcanic eruptions, ash, lava
- NONE: No disaster detected

Respond in this exact format:
Category: [CATEGORY_NAME]
Confidence: [0-100]%
Reasoning: [brief explanation]`;
        const categoryResponse = yield fetch('https://api-inference.huggingface.co/models/HuggingFaceH4/zephyr-7b-beta', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.HUGGING_FACE_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                inputs: categoryPrompt,
                parameters: {
                    max_new_tokens: 150,
                    temperature: 0.3,
                    do_sample: true,
                    top_p: 0.8
                }
            }),
        });
        if (!categoryResponse.ok) {
            throw new Error(`Category API error: ${categoryResponse.status}`);
        }
        const categoryResult = yield categoryResponse.json();
        const categoryAnalysis = ((_c = categoryResult[0]) === null || _c === void 0 ? void 0 : _c.generated_text) || 'Category: NONE\nConfidence: 0%\nReasoning: Unable to categorize';
        console.log('Disaster category:', categoryAnalysis);
        const file = new File([fileBuffer], req.file.originalname);
        // Generate detailed description using Zephyr model
        const descriptionPrompt = `Based on this image caption: "${caption}", provide a detailed and comprehensive description of what is shown in the image. Include details about:
1. Visual elements and objects present
2. Environmental conditions
3. Structural details
4. People or activities (if any)
5. Atmospheric or weather conditions
6. Overall scene composition

Please write a detailed, descriptive paragraph that paints a clear picture of the scene.`;
        const descriptionResponse = yield fetch('https://api-inference.huggingface.co/models/HuggingFaceH4/zephyr-7b-beta', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.HUGGING_FACE_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                inputs: descriptionPrompt,
                parameters: {
                    max_new_tokens: 300,
                    temperature: 0.6,
                    do_sample: true,
                    top_p: 0.85
                }
            }),
        });
        if (!descriptionResponse.ok) {
            throw new Error(`Description API error: ${descriptionResponse.status}`);
        }
        const descriptionResult = yield descriptionResponse.json();
        const description = ((_d = descriptionResult[0]) === null || _d === void 0 ? void 0 : _d.generated_text) || 'No detailed description generated';
        console.log('Detailed description:', description);
        // Store to IPFS with description, disaster analysis, and category
        (0, exports.storeImageToIPFS)(file, filePath, req, res, {
            description,
            analysis,
            category: categoryAnalysis,
            timestamp: new Date().toISOString()
        });
        const cid = (0, exports.storeImageToIPFS)(file, filePath, req, res, {
            description,
            analysis,
            category: categoryAnalysis,
            timestamp: new Date().toISOString()
        });
        const resolvedCid = yield cid;
        const Actor = (0, useActor_1.default)();
        Actor.addReport(crypto_1.randomUUID.toString(), {
            id: crypto_1.randomUUID.toString(),
            user: req.body.user,
            category: categoryAnalysis,
            description: description,
            location: req.body.location,
            coordinates: req.body.coordinates,
            status: 'pending',
            imageCid: resolvedCid,
            timestamp: new Date(),
            rewardGiven: [],
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
