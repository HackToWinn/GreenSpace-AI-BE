"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const { File } = require('@web3-storage/w3up-client');
const fs = require('fs');
const { createUploader } = require('@web3-storage/w3up-client');
require('dotenv').config();

const getReports = (req, res) => {
    res.send('Data Report');
};

const storeImageToIPFS = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        console.log('File received:', req.file);

        if (!fs.existsSync(filePath)) {
            return res.status(400).json({ error: 'File not found' });
        }

        const fileBuffer = fs.readFileSync(filePath);
        const file = new File([fileBuffer], req.file.originalname);

        const client = await createUploader();
        await client.login(process.env.WEB3_STORAGE_EMAIL);
        await client.setCurrentSpace(`did:key:${process.env.WEB3_STORAGE_SPACEKEY}`);

        const cid = await client.uploadFile(file);
        fs.unlinkSync(filePath);

        res.json({ success: true, cid: cid.toString(), url: `https://w3s.link/ipfs/${cid}` });

    } catch (error) {
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

module.exports = {
    getReports,
    storeImageToIPFS,
}