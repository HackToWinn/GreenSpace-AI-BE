import { AuthClient } from "https://esm.sh/@dfinity/auth-client@2.4.1";
import { DelegationChain, Ed25519KeyIdentity } from "https://esm.sh/@dfinity/identity@2.4.1";

async function generateIntermediateKey() {
  return await Ed25519KeyIdentity.generate();
}

function getQueryParam(param) {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(param);
}

async function doLogin() {
  const sessionPublicKeyB64 = getQueryParam("sessionPublicKey");
  const callback = getQueryParam("callback");

  if (!sessionPublicKeyB64 || !callback) {
    document.getElementById("status").innerText = "Missing sessionPublicKey or callback in URL.";
    return;
  }

  const sessionPublicKey = Uint8Array.from(atob(sessionPublicKeyB64), c => c.charCodeAt(0));
  const intermediateKey = await generateIntermediateKey();

  const authClient = await AuthClient.create({
    identity: intermediateKey
  });

  await authClient.login({
    identityProvider: "https://identity.ic0.app",
    onSuccess: async () => {
      const identity = authClient.getIdentity();
      const iiDelegation = authClient.getDelegation()?.delegations[0];

      const now = BigInt(Date.now()) * 1_000_000n;
      const expires = now + 30n * 60n * 1_000_000_000n;

      const signedDelegation = await intermediateKey.createSignedDelegation(
        { publicKey: sessionPublicKey },
        expires
      );

      const chain = DelegationChain.fromDelegations(
        [iiDelegation, signedDelegation],
        sessionPublicKey
      );

      const delegationB64 = btoa(JSON.stringify(chain.toJSON()));
      window.location.href = `${callback}#delegation=${encodeURIComponent(delegationB64)}`;
    },
    maxTimeToLive: BigInt(30 * 60 * 1_000_000_000)
  });
}

document.getElementById("loginBtn").addEventListener("click", doLogin);
