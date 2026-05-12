import { PublicKey, Connection } from "@solana/web3.js";
import { getAuthToken, permissionPdaFromAccount, createDelegatePermissionInstruction, waitUntilPermissionActive } from "@magicblock-labs/ephemeral-rollups-sdk";
import nacl from "tweetnacl";
import { TEE_RPC_URL, TEE_WS_URL } from "./constants";

export async function getTeeAuthToken(
  publicKey: PublicKey,
  signMessage: (message: Uint8Array) => Promise<Uint8Array>
): Promise<string> {
  const { token } = await getAuthToken(
    TEE_RPC_URL,
    publicKey,
    async (message: Uint8Array) => {
      return await signMessage(message);
    }
  );
  return token;
}

export function createTeeConnection(token: string): Connection {
  const url = `${TEE_RPC_URL}?token=${token}`;
  const wsUrl = `${TEE_WS_URL}?token=${token}`;
  return new Connection(url, { wsEndpoint: wsUrl, commitment: "confirmed" });
}

export function getPermissionPda(accountPda: PublicKey): PublicKey {
  return permissionPdaFromAccount(accountPda);
}

export { createDelegatePermissionInstruction, waitUntilPermissionActive };
