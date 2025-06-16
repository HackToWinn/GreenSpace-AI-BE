import { canisterId as backendCanister, createActor as backendActor } from '../../../src/declarations/backend';
import { canisterId as tokenCanister, createActor as tokenActor } from '../../../src/declarations/icrc1';

export async function useBackend() {
  return backendActor(backendCanister, {
    agentOptions: {
      host: 'http://127.0.0.1:4943',
    },
  });
}

export async function useToken() {
  return tokenActor(tokenCanister, {
    agentOptions: {
      host: 'http://127.0.0.1:4943',
    },
  });
}
