import { Request, Response } from "express";
import { useBackend, useToken } from "../hooks/useActor";
import { getPrincipal } from "./userControllers";
import { internalError } from "../lib/internalError";
import { Account } from "../declarations/gsp_ledger/gsp_ledger.did";
import { sanitize } from "../utils/sanitize";
import { DelegationChain, Ed25519KeyIdentity } from "@dfinity/identity";
import { loadIdentityFromSecp256k1PemString } from "../lib/loadIdentityFromSecp256k1PemString";


async function getMintingPrincipal(): Promise<Account | null> {
    try {
        //Initialize the actor for the token canister
        const actor = await useToken();

        // Call the icrc1_minting_account method to get the minting account
        const mintingAccount = await actor.icrc1_minting_account();
        const account = mintingAccount[0];

        if (!account) return null;
        return account;
    } catch (error) {
        console.error("Error getting owner principal:", error);
        return null;
    }
}

export async function getBalance(req: Request, res: Response) {
    try {
        //parse request body
        const { identity, delegation } = req.body;

        //check if identity and delegation are provided
        if (!identity || !delegation) return res.status(400).json({ error: "Missing required fields: identity and delegation" });

        //check if identity is a valid Ed25519KeyIdentity and call the actor 
        const actor = await useToken();

        // Get the principal from the identity and delegation
        const principal = await getPrincipal(identity, delegation);

        // If principal is not found, return unauthorized
        if (!principal) return res.status(401).json({ error: "Unauthorized" });

        // Create the account object
        // The subaccount is an empty array as per the ICRC-1 standard
        const account: Account = {
            owner: principal,
            subaccount: [],
        };
        // Call the icrc1_balance_of method to get the balance of the account
        const balanceResult = await actor.icrc1_balance_of(account);

        // If the balanceResult is an error, return the error
        return res.json({ balance: sanitize(balanceResult) });
    } catch (error) {
        // return an intern3gzjj-udemb-yhgo6-dyii6-sxlue-eo237-2egks-yvafd-vxnrx-swnwn-5qeal server error response
        return internalError(res, "Failed to get balance", error);
    }
}
export async function redeem(req: Request, res: Response) {
    try {
        // Parse request body
        const { identity, delegation, amount } = req.body;

        // Check if required fields are provided
        if (!identity || !delegation || !amount) {
            return res.status(400).json({ error: "Missing required fields: identity, delegation, and amount" });
        }

        // Get the actor for the token canister
        const actor = await useToken(identity, delegation);

        // Get the principal from the identity and delegation
        const principal = await getPrincipal(identity, delegation);
        const ownerPrincipal = await getMintingPrincipal();

        // If principal is not found, return unauthorized
        if (!principal) return res.status(401).json({ error: "Unauthorized" });
        if (!ownerPrincipal) return res.status(401).json({ error: "Unauthorized: Owner principal not found" });

        // Create the account object for the sender and receiver
        const fromAccount: Account = {
            owner: principal,
            subaccount: [],
        };
        const toAccount: Account = {
            owner: ownerPrincipal.owner,
            subaccount: [],
        };

        const memo = "prize-" + Date.now().toString();
        const memoBytes = new TextEncoder().encode(memo);

        // Call the icrc1_transfer method to transfer tokens
        const transferResult = await actor.icrc1_transfer({
            from_subaccount: fromAccount.subaccount,
            to: toAccount,
            amount,
            fee: [BigInt(0)],
            memo: [memoBytes],
            created_at_time: [BigInt(Date.now() * 1000000)], // Convert to nanoseconds
        });

        // If transferResult is an error, return the error
        if ('Err' in transferResult) {
            return res.status(400).json({ error: transferResult.Err });
        }

        // Return success response
        return res.json({ message: "Transfer successful", result: transferResult.Ok });
    } catch (error) {
        // Return an internal server error response
        return internalError(res, "Failed to transfer tokens", error);
    }
}
export async function giveReward({ identity, delegation, amount }: { identity: Ed25519KeyIdentity, delegation: DelegationChain | string, amount: bigint }) {
    try {
        // Get the actor for the token canister
        const identityFromPem = loadIdentityFromSecp256k1PemString(process.env.OWNER_PEM || "");
        const actor = await useToken(undefined, undefined, identityFromPem);
        console.log("owner identity:", identityFromPem.getPrincipal().toText());
        const principal = await getPrincipal(identity, delegation as string);
        // If principal is not found, return unauthorized
        if (!principal) return { error: "Unauthorized" };

        const toAccount: Account = {
            owner: principal,
            subaccount: [],
        };

        const memo = "prize-" + Date.now().toString();
        const memoBytes = new TextEncoder().encode(memo);

        // Call the icrc1_transfer method to transfer tokens
        const transferResult = await actor.icrc1_transfer({
            from_subaccount: [],
            to: toAccount,
            amount,
            fee: [BigInt(0)],
            memo: [memoBytes],
            created_at_time: [BigInt(Date.now() * 1000000)], // Convert to nanoseconds
        });

        // If transferResult is an error, return the error
        if ('Err' in transferResult) {
            return { error: transferResult.Err };
        }

        // Return success response
        return { message: "Transfer successful", result: transferResult.Ok };
    } catch (error) {
        // Return an internal server error response
        console.error("Failed to give reward:", error);
        return { error: "Failed to give reward" };
    }
}