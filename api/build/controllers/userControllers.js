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
exports.getUsers = getUsers;
const storeImageToStorage_1 = require("../utils/storeImageToStorage");
const useActor_1 = require("../hooks/useActor");
const imageBuffer_1 = require("../utils/imageBuffer");
const sanitize_1 = require("../utils/sanitize");
const internalError_1 = require("../lib/internalError");
const badRequest_1 = require("../lib/badRequest");
// Create user
function addUser(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        console.time('addUser_total'); // Mulai waktu total
        const { username, email, delegation, identity } = req.body;
        // Cek input dan file
        if (!req.file)
            return (0, badRequest_1.badRequest)(res, "Missing required fields: picture");
        if (!username || !email)
            return (0, badRequest_1.badRequest)(res, "Missing required fields: username and email");
        if (!delegation || !identity)
            return (0, badRequest_1.badRequest)(res, "Missing required fields: delegation and identity");
        try {
            // --- Measure buffer extraction
            console.time('buffer_extraction');
            const picture = (0, imageBuffer_1.imageBuffer)(req);
            console.timeEnd('buffer_extraction');
            // --- Measure Azure Blob Storage upload
            console.time('azure_upload');
            const pictureUrl = yield (0, storeImageToStorage_1.storeImageToStorage)(req.file, req, res, 'users');
            console.timeEnd('azure_upload');
            if (!pictureUrl)
                return (0, internalError_1.internalError)(res, "Failed to store picture to Storage");
            // --- Measure Actor creation
            console.time('actor_creation');
            const Actor = yield (0, useActor_1.useBackend)(identity, delegation);
            console.timeEnd('actor_creation');
            // --- Measure canister call
            console.time('canister_call');
            yield Actor.addUser(email, username, pictureUrl);
            console.timeEnd('canister_call');
            res.status(200).json({ message: "User created successfully" });
        }
        catch (error) {
            return (0, internalError_1.internalError)(res, "Failed to add user", error);
        }
        finally {
            console.timeEnd('addUser_total'); // Akhiri waktu total
        }
    });
}
// Update user
function updateUser(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        const { username, email, delegation, identity } = req.body;
        if (!username || !email)
            return (0, badRequest_1.badRequest)(res, "Missing required fields: username and email");
        if (!delegation)
            return (0, badRequest_1.badRequest)(res, "Missing required field: delegation is required");
        let pictureUrl = "";
        try {
            if (req.file) {
                const uploadedUrl = yield (0, storeImageToStorage_1.storeImageToStorage)(req.file, req, res, 'users');
                if (!uploadedUrl)
                    return (0, internalError_1.internalError)(res, "Failed to store picture to Azure Blob Storage");
                pictureUrl = uploadedUrl;
            }
            const Actor = yield (0, useActor_1.useBackend)(identity, delegation);
            yield Actor.updateUser(email, username, pictureUrl ? [pictureUrl] : []);
            res.status(200).json({ message: "User updated successfully" });
        }
        catch (error) {
            return (0, internalError_1.internalError)(res, "Failed to update user", error);
        }
    });
}
// Get user
function getUser(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        const { delegation, identity } = req.body;
        if (!delegation || !identity)
            return (0, badRequest_1.badRequest)(res, "Missing required fields: delegation and identity");
        try {
            const Actor = yield (0, useActor_1.useBackend)(identity, delegation);
            const user = yield Actor.getUsers();
            if (!user)
                return res.status(404).json({ error: "User not found" });
            res.status(200).json((0, sanitize_1.sanitize)(user));
        }
        catch (error) {
            return (0, internalError_1.internalError)(res, "Failed to fetch user", error);
        }
    });
}
// Get all users
function getUsers(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const Actor = yield (0, useActor_1.useBackend)();
            const users = yield Actor.getUsers();
            if (!users || users.length === 0)
                return res.status(404).json({ error: "No users found" });
            res.status(200).json(users.map(sanitize_1.sanitize));
        }
        catch (error) {
            return (0, internalError_1.internalError)(res, "Failed to fetch users", error);
        }
    });
}
