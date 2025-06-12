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
        });

    } catch (error) {
        console.error('Error processing image:', error);
        res.status(500).json({
            error: 'Failed to process image',
            details: (error as Error).message
        });
    }
};