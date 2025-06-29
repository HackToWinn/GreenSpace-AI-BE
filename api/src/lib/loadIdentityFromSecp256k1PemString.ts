import { Identity } from "@dfinity/agent";
import { Ed25519KeyIdentity } from "@dfinity/identity";
import { Secp256k1KeyIdentity } from "@dfinity/identity-secp256k1";

export function loadIdentityFromSecp256k1PemString(pemString: string): Identity {
  const formattedPem = pemString.replace(/\\n/g, '\n');
  const identity = Secp256k1KeyIdentity.fromPem(formattedPem);

  return identity
}