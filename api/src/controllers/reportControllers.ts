import { Request, Response } from 'express';
import 'dotenv/config';
import useActor from '../hooks/useActor';
import { AzureKeyCredential } from '@azure/core-auth';
import ImageAnalysisClient, { isUnexpected } from '@azure-rest/ai-vision-image-analysis';
import Groq from 'groq-sdk';
import { randomUUID } from 'crypto';
import * as w3up from '@web3-storage/w3up-client';
import { sanitize } from '../utils/sanitize';

export const getReports = (req: Request, res: Response) => {
    res.send('Data Rep');
}

export const storeImageToIPFS = async (file: File, req: Request, res: Response) => {
    try {
        const client = await w3up.create();
        await client.login(process.env.WEB3_STORAGE_EMAIL as `${string}@${string}`);
        await client.setCurrentSpace(`did:key:${process.env.WEB3_STORAGE_SPACEKEY!}`);
        const cid = await client.uploadFile(file);
        return cid;
    } catch (error: any) {
        res.status(500).json({
            error: 'Failed to store image',
            details: error.message
        });
    }
}


export const getAllReports = async (req: Request, res: Response) => {
    try {
        const Actor = await useActor();
        const reports = await Actor.fetchAllValidReport();        
        res.json({
            success: true,
            reports: sanitize(reports)
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
        const totalReportsThisWeek = await Actor.getReportsThisWeek();
        
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
    const features = ["Caption", "DenseCaptions", "Tags", "Objects"];
    const endpoint = process.env.AZURE_COMPUTER_VISION_ENDPOINT!;
    const file = req.file.buffer;
    const location: string = req.body.location || 'Balikpapan';
    const repId = "rep-" + randomUUID().toString();
    const Actor = await useActor();
    const groq = new Groq({apiKey: process.env.GROQ_API_KEY!});
    const fileObj = new File([file], req.file.originalname || 'image', { 
        type: req.file.mimetype || 'image/jpeg' 
    });
    const credential = new AzureKeyCredential(process.env.AZURE_COMPUTER_VISION_API_KEY!);
    const client = ImageAnalysisClient(endpoint, credential);
    const cid = await storeImageToIPFS(fileObj, req, res);
  
    const weatherData = await fetch(`${process.env.WEATHER_API_URL!}/current.json?key=${process.env.WEATHER_API_KEY}&q=${location}`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        },
    });
    const weatherResponse = await weatherData.json();
    try {
        const result = await client.path("/imageanalysis:analyze").post({
            body: file,
            queryParameters: {
                features: features,
                "smartCrops-aspect-ratios": [0.9, 1.33],
            },
            contentType: "application/octet-stream"
        });

        if (isUnexpected(result)) {
            throw new Error(`Analysis failed: ${result.body.error?.message}`);
        }

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
                    - Analyze the location context based on the provided location: ${location}
                    - Consider the current weather conditions from the weather data
                    - Identify geographical and environmental factors that might influence disaster risks
                    - Note any location-specific vulnerabilities or characteristics
                  
                    Provide the output strictly as the following JSON format:
                    {
                        "confidence": "High/Medium/Low",
                        "presentage_confidence": "90%",
                        "category": "Fire/Flood/Earthquake/Storm/Drought/Landslide/Air Pollution/Normal/Etc",
                        "description": "Detailed description of the analysis",
                    }
                    
                    Note: Provide all numeric values formatted neatly with appropriate precision, Only return the JSON object. Do not wrap it in code block formatting.`
                }
            ],
            temperature: 0.7,
            max_completion_tokens: 1000,
            stream: false,
            top_p: 0.9,
        });
        const analysisResult = analysis.choices[0].message.content;
        const parsedAnalysis = JSON.parse(analysisResult || '{}');

        Actor.addReport(repId, {
            id: repId,
            user: req.body.user || [],
            category: parsedAnalysis?.category || 'Normal',
            description: parsedAnalysis?.description || 'No description provided',
            location: req.body.location || 'Unknown',
            coordinates: req.body.coordinates || {latitude: 0, longitude: 0},
            imageCid: cid?.toString() || '',     
            status: 'valid',
            timestamp: BigInt(new Date().getTime()),
            confidence: parsedAnalysis?.confidence || 'low',
            presentage_confidence: parsedAnalysis?.presentage_confidence || '0%',
            rewardGiven: [],
        });


        res.json({
            status: 'success',
        });

    } catch (error) {
        res.status(500).json({
            error: 'Failed to process image',
            details: (error as Error).message
        });
    }
};
