import { Principal } from '@web3-storage/w3up-client/dist/src/types';
import { Identity } from '@dfinity/agent';

// Menggunakan dynamic import untuk menghindari ESM error
export default async function useActor() {
  const { canisterId, createActor } = await import('../../../src/declarations/backend');
  const actor = createActor(canisterId);
  return actor;
}

// Alternatif: Fungsi synchronous yang mengembalikan Promise
export function useActorAsync() {
  return import('../../../src/declarations/backend').then(({ canisterId, createActor }) => {
    return createActor(canisterId);
  });
}