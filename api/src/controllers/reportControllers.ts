import { Request, Response } from 'express';
import * as fs from 'fs';
import 'dotenv/config';
import useActor from '../hooks/useActor';
import { AzureKeyCredential } from '@azure/core-auth';
import ImageAnalysisClient, { isUnexpected } from '@azure-rest/ai-vision-image-analysis';
import Groq from 'groq-sdk';
import { randomUUID } from 'crypto';
import * as w3up from '@web3-storage/w3up-client';

export const getReports = (req: Request, res: Response) => {
    res.send('Data Rep');
}

export const storeImageToIPFS = async (file: File, filePath: string, req: Request, res: Response) => {
    try {
        const client = await w3up.create();

        await client.login(process.env.WEB3_STORAGE_EMAIL as `${string}@${string}`);
        await client.setCurrentSpace(`did:key:${process.env.WEB3_STORAGE_SPACEKEY!}`);

        const cid = await client.uploadFile(file);

        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }

        return cid;

    } catch (error: any) {
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
}


export const fetchAllReports = async (req: Request, res: Response) => {
    try {
        const Actor = await useActor();
        const reports = await Actor.fetchAllValidReport();
        
        res.json({
            success: true,
            reports: reports
        });
    } catch (error) {
        console.error('Error fetching reports:', error);
        res.status(500).json({
            error: 'Failed to fetch reports',
            details: (error as Error).message
        });
    }
};

export const getReportsThisWeek = async (req: Request, res: Response) => {
    try {
        const Actor = await useActor();
        const reportsThisWeek = await Actor.getReportsThisWeek();
        res.json({
            success: true,
            reports: reportsThisWeek
        });
    } catch (error) {
        console.error('Error fetching reports this week:', error);
        res.status(500).json({
            error: 'Failed to fetch reports this week',
            details: (error as Error).message
        });
    }
};

export const getTotalReportsThisWeek = async (req: Request, res: Response) => {
    try {
        const Actor = await useActor();
        const totalReportsThisWeek = await (Actor).getReportsThisWeek();
        
        res.json({
            success: true,
            total: totalReportsThisWeek.toString()
        });
    } catch (error) {
        console.error('Error fetching total reports this week:', error);
        res.status(500).json({
            error: 'Failed to fetch total reports this week',
            details: (error as Error).message
        });
    }
};

export const processImage = async (req: Request, res: Response) => {   
    if (!req.file) {
        res.status(400).json({ error: 'No file uploaded' });
        return;
    }

    const location: string = req.body.location || 'Balikpapan';
    const filePath: string = req.file.path;

    if (!fs.existsSync(filePath)) {
        res.status(400).json({ error: 'File not found' });
        return;
    }

    const weatherData = await fetch(`${process.env.WEATHER_API_URL!}/current.json?key=${process.env.WEATHER_API_KEY}&q=${location}`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.WEATHER_API_KEY}`
        },
    });
    const weatherResponse = await weatherData.json();

    try {

        const fileBuffer: Buffer = fs.readFileSync(filePath);
        const file = new File([fileBuffer], req.file.originalname, {
            type: req.file.mimetype
        });

        const features = ["Caption", "DenseCaptions", "Tags", "Objects"];
        const credential = new AzureKeyCredential(process.env.AZURE_COMPUTER_VISION_API_KEY!);
        const endpoint = process.env.AZURE_COMPUTER_VISION_ENDPOINT!;
        const client = ImageAnalysisClient(endpoint, credential);
    
        const result = await client.path("/imageanalysis:analyze").post({
            body: fileBuffer,
            queryParameters: {
                features: features,
                "smartCrops-aspect-ratios": [0.9, 1.33],
            },
            contentType: "application/octet-stream"
        });

        if (isUnexpected(result)) {
            throw new Error(`Analysis failed: ${result.body.error?.message}`);
        }

        const groq = new Groq({apiKey: process.env.GROQ_API_KEY!});
        const analysis = await groq.chat.completions.create({
            model: 'gemma2-9b-it',
            messages: [
                {
                    role: 'system',
                    content: "You are an expert in disaster prediction and image analysis. Provide comprehensive, step-by-step analysis of images for disaster detection and prediction.",
                },
                {
                    role: 'user',
                    content: `
                    Analyze the following image data and weather information in a step-by-step manner:
                    
                    Image Analysis Data: ${JSON.stringify(result.body)}
                    Weather Data: ${JSON.stringify(weatherResponse)}
                    Location: ${location}
                    
                    Please perform the following analysis steps:
                    
                    STEP 1: LOCATION AND ENVIRONMENTAL CONTEXT
                    - Analyze the location context based on the provided location: ${location}
                    - Consider the current weather conditions from the weather data
                    - Identify geographical and environmental factors that might influence disaster risks
                    - Note any location-specific vulnerabilities or characteristics
                    
                    STEP 2: DISASTER PREDICTION AND ANALYSIS
                    Based on the image description and location context, analyze potential disasters:
                    
                    Detect the primary disaster condition from these categories:
                    Fire, Flood, Earthquake, Storm, Drought, Landslide, Air Pollution, Normal.
                    
                    Scoring criteria:
                    Caption keywords scoring:
                    - Fire, Flood, Earthquake, Landslide: 3 points per keyword match
                    - Storm, Drought, Air Pollution, Normal: 2 points per keyword match
                    
                    Visual cues scoring:
                    - Fire: High red dominance (>0.4, +2), high brightness (>120, +1), high contrast (>50, +1)
                    - Flood: High blue dominance (>0.35, +2), low brightness (<100, +1)
                    - Earthquake: High contrast (>60, +1)
                    - Drought: High brightness (>150, +1), high red dominance (>0.3) with low blue dominance (<0.2, +1)
                    - Air Pollution: Low brightness (<120) & low contrast (<30, +2), low color variance (<20, +2), low sharpness (<100, +1), caption contains "gray"/"grey" (+1)
                    - Normal: Moderate brightness (100-200, +1), moderate contrast (30-80, +1), high green dominance (>0.3, +2), moderate blue (>0.25) & low red dominance (<0.35, +1), high color variance (>30, +1), high sharpness (>200, +1)
                    
                    Determine:
                    - primary_disaster: Condition with the highest score
                    - confidence level:
                      * Normal: High (≥4), Medium (≥2), Low (≥1), Undetected (<1)
                      * Other disasters: High (≥5), Medium (≥3), Low (≥1), Undetected (<1)
                    - disaster_probability: Calculate percentage probability for each disaster type based on total score divided by maximum possible score for that category
                    - air_quality:
                      * Poor (≥3 Air Pollution points)
                      * Moderate (≥1 Air Pollution point)
                      * Excellent (Brightness >150 & Color Variance >40)
                      * Good (otherwise)
                    
                    STEP 3: FUTURE DISASTER PREDICTION
                    - Based on current conditions, predict potential future disasters
                    - Consider how current weather and environmental conditions might evolve
                    - Identify early warning signs for potential disasters
                    - Provide recommendations for monitoring and prevention
                    
                    Provide the output strictly as the following JSON format:
                    {
                        "confidence": "High/Medium/Low",
                        "presentage_confidence": "90%",
                        "category": "Fire/Flood/Earthquake/Storm/Drought/Landslide/Air Pollution/Normal/Etc",
                        "description": "Detailed description of the analysis",
                    }
                    
                    Note: Provide all numeric values formatted neatly with appropriate precision.`
                }
            ],
            temperature: 0.7,
            max_completion_tokens: 1000,
            stream: false,
            top_p: 0.9,
        });
        const analysisResult = analysis.choices[0].message.content;
        const parsedAnalysis = analysisResult ? JSON.parse(analysisResult) : {};

        const Actor = await useActor();

        const cid = await storeImageToIPFS(file ,filePath, req, res);
        const repId = "rep-" + randomUUID().toString();
        Actor.addReport(randomUUID.toString(), {
            id: repId,
            user: req.body.user || "aaaaa-aa",
            category: parsedAnalysis?.category || 'Normal',
            description: parsedAnalysis?.description || 'No description provided',
            location: req.body.location,
            coordinates: req.body.coordinates,
            imageCid: cid?.toString() || '',     
            status: 'valid',
            timestamp: BigInt(new Date().getTime()),
            confidence: parsedAnalysis.body.confidence || 'low',
            presentage_confidence: parsedAnalysis.body.presentage_confidence || '0%',
            rewardGiven: [],
        });

        fs.unlinkSync(filePath);

        res.json({
            status: 'success',
        });

    } catch (error) {
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
        res.status(500).json({
            error: 'Failed to process image',
            details: (error as Error).message
        });
    }
};