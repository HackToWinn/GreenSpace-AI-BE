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
exports.useBackend = useBackend;
exports.useToken = useToken;
const identity_1 = require("@dfinity/identity");
const backend_1 = require("../../../src/declarations/backend");
const icrc1_1 = require("../../../src/declarations/icrc1");
function useBackend(identity, delegation) {
    return __awaiter(this, void 0, void 0, function* () {
        let delegationIdentity;
        if (identity && delegation) {
            const reconstructedChain = typeof delegation === 'string'
                ? identity_1.DelegationChain.fromJSON(delegation)
                : delegation;
            const reconstructedBase = identity instanceof identity_1.Ed25519KeyIdentity
                ? identity
                : identity_1.Ed25519KeyIdentity.fromJSON(typeof identity === 'string' ? identity : JSON.stringify(identity));
            delegationIdentity = identity_1.DelegationIdentity.fromDelegation(reconstructedBase, reconstructedChain);
        }
        return (0, backend_1.createActor)(process.env.CANISTER_ID_BACKEND || backend_1.canisterId, {
            agentOptions: {
                host: 'http://127.0.0.1:4943',
                identity: delegationIdentity,
            },
        });
    });
}
function useToken() {
    return __awaiter(this, void 0, void 0, function* () {
        return (0, icrc1_1.createActor)(process.env.CANISTER_ID_ICRC1 || icrc1_1.canisterId, {
            agentOptions: {
                host: 'http://127.0.0.1:4943',
            },
        });
    });
}
