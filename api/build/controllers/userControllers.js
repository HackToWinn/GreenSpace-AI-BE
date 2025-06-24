var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { storeImageToIPFS } from "../utils/storeImageToIPFS";
import { useBackend } from "../hooks/useActor";
import { imageBuffer } from "../utils/imageBuffer";
import { sanitize } from "../utils/sanitize";
import { internalError } from "../lib/internalError";
import { badRequest } from "../lib/badRequest";
// Create user
export function addUser(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        console.time('addUser_total'); // Mulai waktu total
        const { username, email, delegation, identity } = req.body;
        // Cek input dan file
        if (!req.file)
            return badRequest(res, "Missing required fields: picture");
        if (!username || !email)
            return badRequest(res, "Missing required fields: username and email");
        if (!delegation || !identity)
            return badRequest(res, "Missing required fields: delegation and identity");
        let pictureCidString = "";
        try {
            // --- Measure buffer extraction
            console.time('buffer_extraction');
            const picture = imageBuffer(req);
            console.timeEnd('buffer_extraction');
            // --- Measure IPFS upload
            console.time('ipfs_upload');
            const pictureCid = yield storeImageToIPFS(picture, req, res);
            console.timeEnd('ipfs_upload');
            if (!pictureCid)
                return internalError(res, "Failed to store picture to IPFS");
            pictureCidString = pictureCid.toString();
            // --- Measure Actor creation
            console.time('actor_creation');
            const Actor = yield useBackend(identity, delegation);
            console.timeEnd('actor_creation');
            // --- Measure canister call
            console.time('canister_call');
            yield Actor.addUser(email, username, pictureCidString);
            console.timeEnd('canister_call');
            res.status(200).json({ message: "User created successfully" });
        }
        catch (error) {
            return internalError(res, "Failed to add user", error);
        }
        finally {
            console.timeEnd('addUser_total'); // Akhiri waktu total
        }
    });
}
// Update user
export function updateUser(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        const { username, email, delegation, identity } = req.body;
        if (!username || !email)
            return badRequest(res, "Missing required fields: username and email");
        if (!delegation)
            return badRequest(res, "Missing required field: delegation is required");
        let pictureCidString = "";
        try {
            if (req.file) {
                const picture = imageBuffer(req);
                console.time("storeImageToIPFS");
                const pictureCid = yield storeImageToIPFS(picture, req, res);
                console.timeEnd("storeImageToIPFS");
                if (!pictureCid)
                    return internalError(res, "Failed to store picture to IPFS");
                pictureCidString = pictureCid.toString();
            }
            const Actor = yield useBackend(identity, delegation);
            yield Actor.updateUser(email, username, pictureCidString ? [pictureCidString] : []);
            res.status(200).json({ message: "User updated successfully" });
        }
        catch (error) {
            return internalError(res, "Failed to update user", error);
        }
    });
}
// Get user
export function getUser(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        const { delegation, identity } = req.body;
        if (!delegation || !identity)
            return badRequest(res, "Missing required fields: delegation and identity");
        try {
            const Actor = yield useBackend(identity, delegation);
            const user = yield Actor.getUserById();
            if (!user)
                return res.status(404).json({ error: "User not found" });
            res.status(200).json(sanitize(user));
        }
        catch (error) {
            return internalError(res, "Failed to fetch user", error);
        }
    });
}
// Get all users
export function getUsers(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const Actor = yield useBackend();
            const users = yield Actor.getUsers();
            if (!users || users.length === 0)
                return res.status(404).json({ error: "No users found" });
            res.status(200).json(users.map(sanitize));
        }
        catch (error) {
            return internalError(res, "Failed to fetch users", error);
        }
    });
}
