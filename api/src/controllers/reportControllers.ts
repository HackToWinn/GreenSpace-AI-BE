import { Request, Response } from 'express';
import 'dotenv/config';
import { useBackend, useToken } from '../hooks/useActor';
import { AzureKeyCredential } from '@azure/core-auth';
import ImageAnalysisClient, { isUnexpected } from '@azure-rest/ai-vision-image-analysis';
import Groq from 'groq-sdk';
import { randomUUID } from 'crypto';
import { sanitize } from '../utils/sanitize';
import { Principal } from '@dfinity/principal';
import { storeImageToIPFS } from '../utils/storeImageToIPFS';
import { imageBuffer } from '../utils/imageBuffer';



export const getValidReports = async (req: Request, res: Response) => {
    try {
        const Actor = await useBackend();
        const reports = await Actor.getValidReports();
        res.json({
            success: true,
            reports: sanitize(reports)
        });
    } catch (error) {
        console.error('Error fetching reports:', error);
        res.status(500).json({
            error: 'Failed to fetch report',
            details: (error as Error).message,
        });
    }
};



export const getReportsThisWeek = async (req: Request, res: Response) => {
    try {
        const Actor = await useBackend();
        const reportsThisWeek = await Actor.getReportsThisWeek();
        res.json({
            success: true,
            reports: sanitize(reportsThisWeek)
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
        const Actor = await useBackend();
        const totalReportsThisWeek = await Actor.getReportsThisWeek();

        res.json({
            success: true,
            total: totalReportsThisWeek
        });
    } catch (error) {
        console.error('Error fetching total reports this week:', error);
        res.status(500).json({
            error: 'Failed to fetch total reports this week',
            details: (error as Error).message
        });
    }
};

const countTokenReward = (confidence: string): number => {
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

export const processImage = async (req: Request, res: Response) => {
    if (!req.file) {
        res.status(400).json({ error: 'No file uploaded' });
        return;
    }
    const features = ["Caption", "DenseCaptions", "Tags", "Objects"];
    const endpoint = process.env.AZURE_COMPUTER_VISION_API_ENDPOINT!;
    const location: string = req.body.location || 'Balikpapan';
    const repId = "rep-" + randomUUID().toString();
    const Actor = await useBackend();
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY! });
    const fileObj = imageBuffer(req);

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
            body: req.file.buffer,
            queryParameters: {
                features: features,
                "smartCrops-aspect-ratios": [0.9, 1.33],
            },
            contentType: "application/octet-stream"
        });

        if (isUnexpected(result)) {
            throw new Error(`Analysis failed: ${result.body.error?.message}`);
        }

        const PromptRoleSystem =
            "You are an expert in disaster prediction and image analysis. Provide comprehensive, step-by-step analysis of images for disaster detection and prediction.";

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

        const analysis = await groq.chat.completions.create({
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

        const confidence = parsedAnalysis?.confidence || 'None';
        const totalTokenReward = countTokenReward(confidence);
        if (req.body.user && totalTokenReward > 0) {
            try {
                await sendReportReward(totalTokenReward);
            } catch (rewardError) {
                console.error('Error sending reward:', rewardError);
            }
        }

        Actor.addReport(repId, {
            id: repId,
            user: req.body.user || [],
            category: parsedAnalysis?.category || 'Normal',
            description: parsedAnalysis?.description || 'No description provided',
            location: req.body.location || 'Unknown',
            coordinates: req.body.coordinates || { latitude: 0, longitude: 0 },
            imageCid: cid?.toString() || '',
            status: 'valid',
            timestamp: BigInt(new Date().getTime()),
            confidence: confidence,
            presentage_confidence: parsedAnalysis?.presentage_confidence || '0%',
            rewardGiven: [totalTokenReward],
        });

        res.json({
            status: 'success',
        });

    } catch (error) {
        console.error('Error processing image:', error);
        res.status(500).json({
            error: 'Failed to process image',
            details: (error as Error).message
        });
    }
};

export const sendReportReward = async (tokenAmount: number) => {
    try {
        const Actor = await useToken();

        const Reward = await Actor.icrc1_transfer({
            from_subaccount: [],
            to: {
                owner: Principal.fromText('3gzjj-udemb-yhgo6-dyii6-sxlue-eo237-2egks-yvafd-vxnrx-swnwn-5qe') as any,
                subaccount: []
            },
            amount: BigInt(tokenAmount),  
            fee: [],
            memo: [],
            created_at_time: []
        });

        return Reward;

    } catch (error) {
        console.error('Error sending token reward:', error);
        throw new Error(`Failed to send token reward: ${(error as Error).message}`);
    }
};
export async function getMostReportedCategory(req: Request, res: Response) {
    try {
        const Actor = await useBackend();
        const mostReportedCategory = await Actor.getMostReportedCategory();

        res.json({
            success: true,
            category: mostReportedCategory
        });
    } catch (error) {
        console.error('Error fetching most reported category:', error);
        res.status(500).json({
            error: 'Failed to fetch most reported category',
            details: (error as Error).message
        });
    }
}

export async function getReportById(req: Request
, res: Response) {
    const reportId = req.params.id;
    try {
        const Actor = await useBackend();
        const report = await Actor.getReport(reportId);

        if (!report) {
            return res.status(404).json({
                error: 'Report not found'
            });
        }

        res.json({
            success: true,
            report: sanitize(report)
        });
    } catch (error) {
        console.error('Error fetching report by ID:', error);
        res.status(500).json({
            error: 'Failed to fetch report by ID',
            details: (error as Error).message
        });
    }
}
export async function getLatestReports(req: Request, res: Response) {
    try {
        const Actor = await useBackend();
        const latestReports = await Actor.getLatestReport();

        res.json({
            success: true,
            reports: sanitize(latestReports)
        });
    } catch (error) {
        console.error('Error fetching latest reports:', error);
        res.status(500).json({
            error: 'Failed to fetch latest reports',
            details: (error as Error).message
        });
    }
}
