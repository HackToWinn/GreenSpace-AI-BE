import { Principal } from '@web3-storage/w3up-client/dist/src/types';
import { Identity } from '@dfinity/agent';
import { canisterId, createActor } from '../declarations/backend';

export default async function useActor() {
  const actor = createActor(canisterId, {
    agentOptions: {
      host:  'http://127.0.0.1:4943',
    },
  });
  return actor;
}