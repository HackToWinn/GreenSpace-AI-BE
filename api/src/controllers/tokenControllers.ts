import { Request, Response } from "express";
import { useBackend, useToken } from "../hooks/useActor";
import { getPrincipal } from "./userControllers";
import { internalError } from "../lib/internalError";
import { Principal } from "@dfinity/principal";
import { Account } from "../declarations/gsp_ledger/gsp_ledger.did";


async function getMintingPrincipal(): Promise<Principal | null>  {
    try {
       //Initialize the actor for the token canister
        const actor = await useToken();
        // Call the icrc1_minting_account method to get the minting account
        const mintingAccount = await actor.icrc1_minting_account();
        const account = mintingAccount[0];

        // If the principal is not found, return null
        if (!account) return null;
        return account;
    } catch (error) {
        console.error("Error getting owner principal:", error);
        return null;
    }
}

export  async function balance(req: Request, res: Response){
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
    return res.json({ balance: balanceResult });
    } catch (error) {
        // return an internal server error response
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
        const actor = await useToken();
 
        // Get the principal from the identity and delegation
        const principal = await getPrincipal(identity, delegation);
        const ownerPrincipal = await getMintingPrincipal();

        // If principal is not found, return unauthorized
        if (!principal) return res.status(401).json({ error: "Unauthorized" });
        if( !ownerPrincipal) return res.status(401).json({ error: "Unauthorized: Owner principal not found" });

        // Create the account object for the sender
        const fromAccount: Account = {
            owner: principal,
            subaccount: [],
        };

        // Create the account object for the recipient
        const toAccount: Account = {
            owner: ownerPrincipal,
            subaccount: [],
        };
        
        const memo = "prize-" + Date.now().toString();
        

        // Call the icrc1_transfer method to transfer tokens
        const transferResult = await actor.icrc1_transfer({
            from_subaccount: fromAccount.subaccount,
            to: toAccount,
            amount,
            fee: [BigInt(0)],
            memo: memo, 
            created_at_time: Date.now() * 1000000, // Convert to nanoseconds
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

