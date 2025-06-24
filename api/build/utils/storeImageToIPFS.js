var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import * as w3up from '@web3-storage/w3up-client';
export const storeImageToIPFS = (file, req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const Signer = require('@web3-storage/w3up-client/principal/ed25519');
    const { StoreMemory } = require('@web3-storage/w3up-client/stores/memory');
    const Proof = require('@web3-storage/w3up-client/proof');
    try {
        const principal = Signer.parse(process.env.WEB3_STORAGE_KEY);
        const store = new StoreMemory();
        const client = yield w3up.create({ principal, store });
        const proof = yield Proof.parse(process.env.PROOF);
        const space = yield client.addSpace(proof);
        yield client.setCurrentSpace(space.did());
        const cid = yield client.uploadFile(file);
        return cid;
    }
    catch (error) {
        res.status(500).json({
            error: 'Failed to store image',
            details: error.message
        });
    }
});
