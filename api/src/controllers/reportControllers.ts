import { Request, Response } from 'express';
import * as fs from 'fs';
import * as w3up from '@web3-storage/w3up-client';
import * as multer from 'multer';
import 'dotenv/config';

interface MulterRequest extends Request {
    file?: Express.Multer.File;
}

export const getReports = (req:Request, res: Response) => {
    res.send('Data Rep');
}

export const storeImageToIPFS = async (req:Request, res:Response) => {
    try {
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

        const fileBuffer: Buffer = fs.readFileSync(filePath);
        const file = new File([fileBuffer], req.file.originalname);

        const client = await w3up.create();
        await client.login(process.env.WEB3_STORAGE_EMAIL as `${string}@${string}`);
        await client.setCurrentSpace(`did:key:${process.env.WEB3_STORAGE_SPACEKEY!}`);

        const cid = await client.uploadFile(file);
        
        fs.unlinkSync(filePath);

        res.json({ 
            success: true,
            cid: cid.toString(), 
            url: `https://w3s.link/ipfs/${cid}` 
        });
        
    } catch (error: any) {
        console.error('Error in storeImageToIPFS:', error);
        
        if (req.file && req.file.path && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        
        res.status(500).json({ 
            error: 'Failed to store image',
            details: error.message 
        });
    }
}