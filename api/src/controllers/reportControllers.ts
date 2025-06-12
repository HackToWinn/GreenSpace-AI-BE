import { Request, Response } from 'express';
import * as fs from 'fs';
import * as multer from 'multer';
import 'dotenv/config';
import useActor from '../hooks/useActor';
import { randomUUID } from 'crypto';

interface MulterRequest extends Request {
    file?: Express.Multer.File;
}

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

export const analysisImage = async (req: Request, res: Response) => {

}

export const processImage = async (req: Request, res: Response) => {
    if (!req.file) {
        res.status(400).json({ error: 'No file uploaded' });
        return;
    }

    console.log('File received:', req.file);

    const filePath: string = req.file.path;

    if (!fs.existsSync(filePath)) {
        res.status(400).json({ error: 'File not found' });
        return;
    }

    try {
        const fileBuffer: Buffer = fs.readFileSync(filePath);

        // Get image caption using BLIP model
        const captionResponse = await fetch('https://api-inference.huggingface.co/models/Salesforce/blip-image-captioning-large', {
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

        const captionResult = await captionResponse.json();
        const caption = captionResult[0]?.generated_text || 'No caption generated';

        console.log('Image caption:', caption);

        // Predict disaster consequences using Zephyr model
        const disasterPrompt = `Based on this image description: "${caption}", analyze if this shows signs of a natural disaster and predict potential secondary disasters or consequences that might follow. Provide a detailed assessment including:
1. Type of disaster identified (if any)
2. Potential secondary disasters
3. Risk assessment
4. Immediate concerns
5. Long-term implications

Please be specific and factual in your analysis.`;

        const zephyrResponse = await fetch('https://api-inference.huggingface.co/models/HuggingFaceH4/zephyr-7b-beta', {
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

        const zephyrResult = await zephyrResponse.json();
        const analysis = zephyrResult[0]?.generated_text || 'No disaster analysis generated';

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

        const categoryResponse = await fetch('https://api-inference.huggingface.co/models/HuggingFaceH4/zephyr-7b-beta', {
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

        const categoryResult = await categoryResponse.json();
        const categoryAnalysis = categoryResult[0]?.generated_text || 'Category: NONE\nConfidence: 0%\nReasoning: Unable to categorize';

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

        const descriptionResponse = await fetch('https://api-inference.huggingface.co/models/HuggingFaceH4/zephyr-7b-beta', {
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

        const descriptionResult = await descriptionResponse.json();
        const description = descriptionResult[0]?.generated_text || 'No detailed description generated';

        console.log('Detailed description:', description);

        // Store to IPFS with description, disaster analysis, and category
        storeImageToIPFS(file, filePath, req, res, {
            description,
            analysis,
            category: categoryAnalysis,
            timestamp: new Date().toISOString()
        });

        const cid = storeImageToIPFS(file, filePath, req, res, {
            description,
            analysis,
            category: categoryAnalysis,
            timestamp: new Date().toISOString()
        });

        const resolvedCid = await cid;

        const Actor = await useActor();

        Actor.addReport(randomUUID.toString(), {
            id: randomUUID.toString(),
            user: req.body.user,
            category: categoryAnalysis,
            description: description,
            location: req.body.location,
            coordinates: req.body.coordinates,
            status: 'pending',
            imageCid: resolvedCid,
            timestamp: new Date(),
            rewardGiven: [],
        })

        res.json({
            status: 'success',
        })

    } catch (error) {
        console.error('Error processing image:', error);
        res.status(500).json({
            error: 'Failed to process image',
            details: (error as Error).message
        });
    }
};