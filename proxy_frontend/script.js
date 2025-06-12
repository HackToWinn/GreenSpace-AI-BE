import { AuthClient } from '@dfinity/auth-client';
import { DelegationIdentity, Ed25519PublicKey, ECDSAKeyIdentity, DelegationChain } from '@dfinity/identity';
let appPublicKey;

var url = window.location.href;
var publicKeyIndex = url.indexOf("sessionKey=");
if (publicKeyIndex !== -1) {
    var publicKeyString = url.substring(publicKeyIndex + "sessionKey=".length);
    const derBytes = Uint8Array.from(Buffer.from(publicKeyString, 'hex'));
    appPublicKey = Ed25519PublicKey.fromDer(derBytes);
}

let delegationChain;

const loginButton = document.getElementById('loginBtn');
loginButton.onclick = async (e) => {
    e.preventDefault();
    var middleKeyIdentity = await ECDSAKeyIdentity.generate();
    let authClient = await AuthClient.create({
        identity: middleKeyIdentity
    });
    console.log('before auth client');
    await new Promise((resolve) => {
        authClient.login({
            identityProvider: "https://identity.ic0.app/#authorize",
            onSuccess: resolve
        });
    });
    console.log('after auth client');

    const middleIdentity = authClient.getIdentity();
    console.log(middleIdentity);
    console.log('Principal:', middleIdentity.getPrincipal().toString());

    if (appPublicKey != null && middleIdentity instanceof DelegationIdentity) {
        console.log('dwadw');
        let middleToApp = await DelegationChain.create(
            middleKeyIdentity,
            appPublicKey,
            new Date(Date.now() + 15 * 60 * 1000),
            { previous: middleIdentity.getDelegation() },
        );
        delegationChain = middleToApp;
        generateLink();
    }// Export for use in other files

    return false;
}

function generateLink() {
    if (delegationChain == null) {
        alert("Invalid delegation chain.");
        return false;
    }
    var delegationString = JSON.stringify(delegationChain.toJson());
    const baseUrl = "greenspace://callbackAuth";
    const finalUrl = `${baseUrl}?delegation=${encodeURIComponent(delegationString)}`;
    window.location.href = finalUrl;
    return false;
}
