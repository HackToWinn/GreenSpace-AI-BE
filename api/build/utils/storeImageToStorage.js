"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.storeImageToStorage = void 0;
const storage_blob_1 = require("@azure/storage-blob");
/**
 * Upload image buffer (from multer) to Azure Blob Storage and return its URL.
 * @param file Multer file object (buffer)
 * @param req Express Request (tidak dipakai, tapi bisa untuk akses auth, dll)
 * @param res Express Response (untuk kirim error jika butuh)
 * @param containerName Nama container Azure
*/
const storeImageToStorage = (file, req, res, containerName) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        //set environment variable for Azure Storage connection string
        const blobServiceClient = storage_blob_1.BlobServiceClient.fromConnectionString(process.env.AZURE_STORAGE_CONNECTION_STRING);
        const containerClient = blobServiceClient.getContainerClient(containerName);
        // Check if container exists, create if not
        const exists = yield containerClient.exists();
        if (!exists) {
            yield containerClient.create();
        }
        // Unique name
        const blobName = Date.now() + '-' + file.originalname;
        // Create a block blob client
        const blockBlobClient = containerClient.getBlockBlobClient(blobName);
        // Upload 
        yield blockBlobClient.uploadData(file.buffer, {
            blobHTTPHeaders: { blobContentType: file.mimetype }
        });
        // Get the URL of the uploaded blob
        const url = blockBlobClient.url;
        return url;
    }
    catch (error) {
        res.status(500).json({
            error: 'Failed to store image to Azure Storage',
            details: error.message
        });
        return null;
    }
});
exports.storeImageToStorage = storeImageToStorage;
