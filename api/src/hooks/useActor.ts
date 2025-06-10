import { Principal } from '@web3-storage/w3up-client/dist/src/types';
import { canisterId, createActor } from '../../../src/declarations/backend';
import { Identity } from '@dfinity/agent';

export default function useActor() {
  const actor = createActor(canisterId);
  return actor;
}