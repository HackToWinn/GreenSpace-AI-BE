import { DelegationIdentity, WebAuthnIdentity } from '@dfinity/identity';
import { canisterId as backendCanister, createActor as backendActor } from '../../../src/declarations/backend';
import { canisterId as tokenCanister, createActor as tokenActor } from '../../../src/declarations/icrc1';
import { Identity } from '@dfinity/agent';

export async function useBackend(identity?: DelegationIdentity) {
  return backendActor(process.env.CANISTER_ID_BACKEND || backendCanister, {
    agentOptions: {
      host: 'http://127.0.0.1:4943',
      identity: identity 
    },
  });
}

export async function useToken() {
  return tokenActor(process.env.CANISTER_ID_ICRC1 || tokenCanister, {
    agentOptions: {
      host: 'http://127.0.0.1:4943',
    },
  });
}
