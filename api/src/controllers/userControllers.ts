
import { Request, Response } from "express";
import { storeImageToIPFS } from "../utils/storeImageToIPFS";
import { useBackend } from "../hooks/useActor";
import { imageBuffer } from "../utils/imageBuffer";
import { sanitize } from "../utils/sanitize";


export async function addUser(req: Request, res: Response) {
    const { username, email } = req.body;
    if (!req.file) {
        res.status(400).json({ error: 'Missing required fields: picture' });
        return;
    }
    if (!username || !email) {
        return res.status(400).json({
            error: 'Missing required fields: picture, username, and email are required'
        });
    }
    const picture = imageBuffer(req);
    console.time('storeImageToIPFS');
    const pictureCid = await storeImageToIPFS(picture, req, res);
    console.timeEnd('storeImageToIPFS');

    if (!pictureCid) {
        return res.status(500).json({
            error: 'Failed to store picture to IPFS'
        });
    }
    const pictureCidString = pictureCid.toString();

    const Actor = await useBackend();
    try {
        await Actor.addUser(
            email,
            username,
            pictureCidString
        );
    } catch (error) {
        console.error('Error adding user:', error);
        return res.status(500).json({
            error: 'Failed to add user',
            details: (error as Error).message
        });
    }
    res.status(200).json({
        message: 'User created successfully'
    });
}
export async function updateUser(req: Request, res: Response) {
    const { delegation, username, email } = req.body;
    let pictureCidString = '';
    if (!username || !email) {
        return res.status(400).json({
            error: 'Missing required fields: userId, username, and email are required'
        });
    }
    if (req.file) {
        const picture = imageBuffer(req);
        console.time('storeImageToIPFS');
        const pictureCid = await storeImageToIPFS(picture, req, res);
        console.timeEnd('storeImageToIPFS');
        if (!pictureCid) {
            return res.status(500).json({
                error: 'Failed to store picture to IPFS'
            });
        }
        pictureCidString = pictureCid.toString();
    }
    if (!delegation) {
        return res.status(400).json({
            error: 'Missing required field: delegation is required'
        });
    }
    const Actor = await useBackend(delegation);
    Actor.updateUser(email, username, pictureCidString ? [pictureCidString] : [])
        .then(() => {
            res.status(200).json({
                message: 'User updated successfully'
            });
        })
        .catch((error:any) => {
            console.error('Error updating user:', error);
            res.status(500).json({
                error: 'Failed to update user',
                details: (error as Error).message
            });
        });
}
export async function getUser(req: Request, res: Response) {
    const Actor = await useBackend();
    try {
        const user = await Actor.getUserById();
            if (!user) {
                return res.status(404).json({
                error: 'User not found'
                });
            }
            res.status(200).json(sanitize(user));
    } catch (error) {
        console.error('Error fetching user:', error);
        res.status(500).json({
            error: 'Failed to fetch user',
            details: (error as Error).message
        });
    }
}
