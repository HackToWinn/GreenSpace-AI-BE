import { canisterId as backendCanister, createActor  } from '../../../src/declarations/backend';
import { canisterId as tokenCanister} from '../../../src/declarations/icrc1';

export default async function useActor({type}: {type: 'Backend' | 'Token'}) {
  const actor = createActor(type === 'Backend' ? backendCanister : tokenCanister, {
    agentOptions: {
      host:  'http://127.0.0.1:4943',
    },
  });
  return actor;
}