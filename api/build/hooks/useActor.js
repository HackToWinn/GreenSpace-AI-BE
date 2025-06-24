var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { DelegationChain, DelegationIdentity, Ed25519KeyIdentity, } from '@dfinity/identity';
import { canisterId as backendCanister, createActor as backendActor, } from '../../../src/declarations/backend';
export function useBackend(identity, delegation) {
    return __awaiter(this, void 0, void 0, function* () {
        let delegationIdentity;
        if (identity && delegation) {
            const reconstructedChain = typeof delegation === 'string'
                ? DelegationChain.fromJSON(delegation)
                : delegation;
            const reconstructedBase = identity instanceof Ed25519KeyIdentity
                ? identity
                : Ed25519KeyIdentity.fromJSON(typeof identity === 'string' ? identity : JSON.stringify(identity));
            delegationIdentity = DelegationIdentity.fromDelegation(reconstructedBase, reconstructedChain);
        }
        return backendActor(process.env.CANISTER_ID_BACKEND || backendCanister, {
            agentOptions: {
                host: process.env.AGENT_HOST || 'https://a4gq6-oaaaa-aaaab-qaa4q-cai.raw.icp0.io/?id=gk3aj-aaaaa-aaaaj-a2dbq-cai',
                identity: delegationIdentity,
            },
        });
    });
}
// export async function useToken() {
//   return tokenActor(process.env.CANISTER_ID_ICRC1 || tokenCanister, {
//     agentOptions: {
//       host: process.env.AGENT_HOST || 'https://a4gq6-oaaaa-aaaab-qaa4q-cai.raw.icp0.io/?id=gk3aj-aaaaa-aaaaj-a2dbq-cai',
//     },
//   });
// }
