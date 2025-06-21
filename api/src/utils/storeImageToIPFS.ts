import * as w3up from '@web3-storage/w3up-client';
import { Request, Response } from 'express';

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