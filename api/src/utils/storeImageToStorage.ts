import { Request, Response } from 'express';
import { BlobServiceClient } from '@azure/storage-blob';

/**
 * Upload image buffer (from multer) to Azure Blob Storage and return its URL.
 * @param file Multer file object (buffer)
 * @param req Express Request (tidak dipakai, tapi bisa untuk akses auth, dll)
 * @param res Express Response (untuk kirim error jika butuh)
 * @param containerName Nama container Azure
*/
export const storeImageToStorage = async (
  file: Express.Multer.File,
  req: Request,
  res: Response,
  containerName: string
) => {
  try {
    //set environment variable for Azure Storage connection string
    const blobServiceClient = BlobServiceClient.fromConnectionString(process.env.AZURE_STORAGE_CONNECTION_STRING!);
    const containerClient = blobServiceClient.getContainerClient(containerName);

    // Check if container exists, create if not
    const exists = await containerClient.exists();
    if (!exists) {
        await containerClient.create(); 
        }

    // Unique name
    const blobName = Date.now() + '-' + file.originalname;

    // Create a block blob client
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);
    
    // Upload 
    await blockBlobClient.uploadData(file.buffer, {
      blobHTTPHeaders: { blobContentType: file.mimetype }
    });

    // Get the URL of the uploaded blob
    const url = blockBlobClient.url;
    return url;
  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to store image to Azure Storage',
      details: error.message
    });
    return null;
  }
};
