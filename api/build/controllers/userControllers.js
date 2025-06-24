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
exports.addUser = addUser;
exports.updateUser = updateUser;
exports.getUser = getUser;
const storeImageToIPFS_1 = require("../utils/storeImageToIPFS");
const useActor_1 = require("../hooks/useActor");
const imageBuffer_1 = require("../utils/imageBuffer");
const sanitize_1 = require("../utils/sanitize");
function addUser(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
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
        const picture = (0, imageBuffer_1.imageBuffer)(req);
        console.time('storeImageToIPFS');
        const pictureCid = yield (0, storeImageToIPFS_1.storeImageToIPFS)(picture, req, res);
        console.timeEnd('storeImageToIPFS');
        if (!pictureCid) {
            return res.status(500).json({
                error: 'Failed to store picture to IPFS'
            });
        }
        const pictureCidString = pictureCid.toString();
        const Actor = yield (0, useActor_1.useBackend)();
        try {
            yield Actor.addUser(email, username, pictureCidString);
        }
        catch (error) {
            console.error('Error adding user:', error);
            return res.status(500).json({
                error: 'Failed to add user',
                details: error.message
            });
        }
        res.status(200).json({
            message: 'User created successfully'
        });
    });
}
function updateUser(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        const { delegation, username, email } = req.body;
        let pictureCidString = '';
        if (!username || !email) {
            return res.status(400).json({
                error: 'Missing required fields: userId, username, and email are required'
            });
        }
        if (req.file) {
            const picture = (0, imageBuffer_1.imageBuffer)(req);
            console.time('storeImageToIPFS');
            const pictureCid = yield (0, storeImageToIPFS_1.storeImageToIPFS)(picture, req, res);
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
        const Actor = yield (0, useActor_1.useBackend)(delegation);
        Actor.updateUser(email, username, pictureCidString ? [pictureCidString] : [])
            .then(() => {
            res.status(200).json({
                message: 'User updated successfully'
            });
        })
            .catch((error) => {
            console.error('Error updating user:', error);
            res.status(500).json({
                error: 'Failed to update user',
                details: error.message
            });
        });
    });
}
function getUser(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        const Actor = yield (0, useActor_1.useBackend)();
        try {
            const user = yield Actor.getUserById();
            if (!user) {
                return res.status(404).json({
                    error: 'User not found'
                });
            }
            res.status(200).json((0, sanitize_1.sanitize)(user));
        }
        catch (error) {
            console.error('Error fetching user:', error);
            res.status(500).json({
                error: 'Failed to fetch user',
                details: error.message
            });
        }
    });
}
