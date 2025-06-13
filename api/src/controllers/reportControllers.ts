import { Request, Response } from 'express';
import * as fs from 'fs';
import 'dotenv/config';
import useActor from '../hooks/useActor';
import { AzureKeyCredential } from '@azure/core-auth';
import ImageAnalysisClient, { isUnexpected } from '@azure-rest/ai-vision-image-analysis';
import Groq from 'groq-sdk';


export const getReports = (req: Request, res: Response) => {
    res.send('Data Rep');
}

export const storeImageToIPFS = async (file: File, filePath: string, req: Request, res: Response, analysisResult: {
    description: string;
    analysis: string;
    category: string;
    timestamp: string;
}) => {
    try {
        // Dynamic import untuk ESM module
        const w3up = await import('@web3-storage/w3up-client');
        const client = await w3up.create();

        await client.login(process.env.WEB3_STORAGE_EMAIL as `${string}@${string}`);
        await client.setCurrentSpace(`did:key:${process.env.WEB3_STORAGE_SPACEKEY!}`);

        const cid = await client.uploadFile(file);

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

// Fungsi helper untuk inisialisasi w3up client (opsional)
export const initW3StorageClient = async () => {
    try {
        const w3up = await import('@web3-storage/w3up-client');
        const client = await w3up.create();
        await client.login(process.env.WEB3_STORAGE_EMAIL as `${string}@${string}`);
        await client.setCurrentSpace(`did:key:${process.env.WEB3_STORAGE_SPACEKEY!}`);
        return client;
    } catch (error) {
        console.error('Failed to initialize w3up client:', error);
        throw error;
    }
}

// Alternatif fungsi storeImageToIPFS yang menggunakan helper
export const storeImageToIPFSWithHelper = async (file: File, filePath: string, req: Request, res: Response, analysisResult: {
    description: string;
    analysis: string;
    category: string;
    timestamp: string;
}) => {
    try {
        const client = await initW3StorageClient();
        const cid = await client.uploadFile(file);

        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }

        res.json({
            success: true,
            cid: cid.toString(),
            url: `https://w3s.link/ipfs/${cid}`,
            analysisResult
        });

    } catch (error: any) {
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
            max_completion_tokens:500,
            stream: false,
            top_p: 0.9,
        });

        res.json({
            status: 'success',
            analysis: analysis.choices[0]?.message?.content || ""
        });

    } catch (error) {
        console.error('Error processing image:', error);
        res.status(500).json({
            error: 'Failed to process image',
            details: (error as Error).message
        });
    }
};