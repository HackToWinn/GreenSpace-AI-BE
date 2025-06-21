export const imageBuffer = (req: Express.Request): File  => {
    if (!req.file) {
        throw new Error('No file uploaded');
    }
    const buffer = req.file.buffer;
    const fileObj = new File([buffer], req.file.originalname || 'image', {
        type: req.file.mimetype || 'image/jpeg'
    });
    if (!fileObj) {
        throw new Error('Failed to create file object from buffer');
    }
    return fileObj;
}
