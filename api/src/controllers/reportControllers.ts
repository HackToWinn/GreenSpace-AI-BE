import { Request, Response } from 'express';
import * as fs from 'fs';
import 'dotenv/config';
import useActor from '../hooks/useActor';
import { AzureKeyCredential } from '@azure/core-auth';
import ImageAnalysisClient, { isUnexpected } from '@azure-rest/ai-vision-image-analysis';


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


    const filePath: string = req.file.path;

    if (!fs.existsSync(filePath)) {
        res.status(400).json({ error: 'File not found' });
        return;
    }

    try {
        const fileBuffer: Buffer = fs.readFileSync(filePath);
        const features = ["Caption", "DenseCaptions", "Tags", "Objects"];
        const credential = new AzureKeyCredential(process.env.AZURE_COMPUTER_VISION_API_KEY!);
        const endpoint = process.env.AZURE_COMPUTER_VISION_ENDPOINT!;

        const client = ImageAnalysisClient(endpoint, credential);
        
        const result = await client.path("/imageanalysis:analyze").post({
            body: fileBuffer,
<<<<<<< HEAD
        });

        if (!captionResponse.ok) {
            throw new Error(`BLIP API error: ${captionResponse.status}`);
        }

        const captionResult = await captionResponse.json();
        const caption = captionResult[0]?.generated_text || 'No caption generated';

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

        const comprehensiveResponse = await fetch('https://api-inference.huggingface.co/models/HuggingFaceH4/zephyr-7b-beta', {
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

        const comprehensiveResult = await comprehensiveResponse.json();
        const fullAnalysis = comprehensiveResult[0]?.generated_text || 'No analysis generated';

        console.log('Comprehensive analysis:', fullAnalysis);

        // Parse the structured response
        const parseAnalysis = (text: string) => {
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
                if (descMatch) sections.description = descMatch[1].trim();

                // Extract disaster analysis
                const analysisMatch = text.match(/\*\*DISASTER_ANALYSIS:\*\*\s*([\s\S]*?)(?=\*\*CATEGORY:\*\*|$)/i);
                if (analysisMatch) sections.analysis = analysisMatch[1].trim();

                // Extract category
                const categoryMatch = text.match(/\*\*CATEGORY:\*\*\s*([A-Z]+)/i);
                if (categoryMatch) sections.category = categoryMatch[1].trim();

                // Extract confidence
                const confidenceMatch = text.match(/\*\*CONFIDENCE:\*\*\s*(\d+)%?/i);
                if (confidenceMatch) sections.confidence = confidenceMatch[1].trim();

                // Extract reasoning
                const reasoningMatch = text.match(/\*\*REASONING:\*\*\s*([\s\S]*?)$/i);
                if (reasoningMatch) sections.reasoning = reasoningMatch[1].trim();

            } catch (parseError) {
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
        const cid = await storeImageToIPFS(file, filePath, req, res, {
            description: parsedAnalysis.description,
            analysis: parsedAnalysis.analysis,
            category: categoryAnalysis,
            timestamp: new Date().toISOString()
        });

        const Actor = await useActor();

        await Actor.addReport(randomUUID.toString(), {
            id: randomUUID.toString(),
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
=======
            queryParameters: {
                features: features,
                "smartCrops-aspect-ratios": [0.9, 1.33],
            },
            contentType: "application/octet-stream"
        });

        if (isUnexpected(result)) {
            throw new Error(`Analysis failed: ${result.body.error?.message}`);
        }

        res.json({
            status: 'success',
            analysis: result.body
>>>>>>> e32e3b7c3747a6f614db0c46ef75fac66fd3f9d2
        });

    } catch (error) {
        console.error('Error processing image:', error);
        res.status(500).json({
            error: 'Failed to process image',
            details: (error as Error).message
        });
    }
};