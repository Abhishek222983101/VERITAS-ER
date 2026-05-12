import nacl from "tweetnacl";
import { Keypair, Connection, Transaction, VersionedTransaction } from "@solana/web3.js";

const PAYMENTS_API = "https://payments.magicblock.app";
const DEVNET_USDC_MINT = process.env.PRIVATE_PAYMENTS_MINT || "DYmmsuCFFfb5XpgTXDnietaHzGToGz6GtJ2Tx6FQ7JjH";

interface PaymentsAuth {
  token: string;
  pubkey: string;
  expiresAt: number;
}

const authCache: Map<string, PaymentsAuth> = new Map();

async function getChallenge(pubkey: string, cluster: string = "devnet"): Promise<string> {
  const url = `${PAYMENTS_API}/v1/spl/challenge?pubkey=${pubkey}&cluster=${cluster}`;
  const resp = await fetch(url);
  const data: any = await resp.json();
  if (!data.challenge) throw new Error(`Challenge failed: ${JSON.stringify(data)}`);
  return data.challenge;
}

async function loginWithChallenge(
  pubkey: string,
  challenge: string,
  signature: string,
  cluster: string = "devnet"
): Promise<string> {
  const resp = await fetch(`${PAYMENTS_API}/v1/spl/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pubkey, challenge, signature, cluster }),
  });
  const data: any = await resp.json();
  if (!data.token) throw new Error(`Login failed: ${JSON.stringify(data)}`);
  return data.token;
}

export async function getPaymentsAuthToken(
  keypair: Keypair,
  cluster: string = "devnet"
): Promise<PaymentsAuth> {
  const pk = keypair.publicKey.toBase58();
  const cached = authCache.get(pk);
  if (cached && Date.now() < cached.expiresAt) return cached;

  const challenge = await getChallenge(pk, cluster);
  const message = new TextEncoder().encode(challenge);
  const signatureBytes = nacl.sign.detached(message, keypair.secretKey);
  const signature = Buffer.from(signatureBytes).toString("base64");

  const token = await loginWithChallenge(pk, challenge, signature, cluster);

  const auth: PaymentsAuth = {
    token,
    pubkey: pk,
    expiresAt: Date.now() + 5 * 60 * 1000,
  };
  authCache.set(pk, auth);
  return auth;
}

export async function getPublicBalance(
  address: string,
  mint: string = DEVNET_USDC_MINT,
  cluster: string = "devnet"
): Promise<string> {
  const url = `${PAYMENTS_API}/v1/spl/balance?address=${address}&mint=${mint}&cluster=${cluster}`;
  const resp = await fetch(url);
  const data: any = await resp.json();
  return data.balance || "0";
}

export async function getPrivateBalance(
  authToken: string,
  address: string,
  mint: string = DEVNET_USDC_MINT,
  cluster: string = "devnet"
): Promise<string> {
  const url = `${PAYMENTS_API}/v1/spl/private-balance?address=${address}&mint=${mint}&cluster=${cluster}`;
  const resp = await fetch(url, {
    headers: { Authorization: `Bearer ${authToken}` },
  });
  const data: any = await resp.json();
  return data.balance || "0";
}

export interface TransferParams {
  from: string;
  to: string;
  amount: number;
  mint?: string;
  visibility: "public" | "private";
  fromBalance?: "base" | "ephemeral";
  toBalance?: "base" | "ephemeral";
  cluster?: string;
  authToken?: string;
  memo?: string;
  split?: number;
  minDelayMs?: number;
  maxDelayMs?: number;
  clientRefId?: string;
  initIfMissing?: boolean;
  initAtasIfMissing?: boolean;
  initVaultIfMissing?: boolean;
}

export async function buildTransferTx(params: TransferParams): Promise<{
  kind: string;
  version: string;
  transactionBase64: string;
  sendTo: "base" | "ephemeral";
  recentBlockhash: string;
  lastValidBlockHeight: number;
  instructionCount: number;
  requiredSigners: string[];
  validator?: string;
}> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (params.authToken) {
    headers["Authorization"] = `Bearer ${params.authToken}`;
  }

  const body: Record<string, any> = {
    from: params.from,
    to: params.to,
    mint: params.mint || DEVNET_USDC_MINT,
    amount: params.amount,
    visibility: params.visibility,
    fromBalance: params.fromBalance || "base",
    toBalance: params.toBalance || "base",
    cluster: params.cluster || "devnet",
    initIfMissing: params.initIfMissing ?? true,
    initAtasIfMissing: params.initAtasIfMissing ?? true,
    initVaultIfMissing: params.initVaultIfMissing ?? true,
  };

  if (params.memo) body.memo = params.memo;
  if (params.split) body.split = params.split;
  if (params.minDelayMs !== undefined) body.minDelayMs = String(params.minDelayMs);
  if (params.maxDelayMs !== undefined) body.maxDelayMs = String(params.maxDelayMs);
  if (params.clientRefId) body.clientRefId = params.clientRefId;

  const resp = await fetch(`${PAYMENTS_API}/v1/spl/transfer`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  const data: any = await resp.json();
  if (data.error) throw new Error(`Transfer build failed: ${JSON.stringify(data.error)}`);
  return data;
}

export async function buildDepositTx(
  owner: string,
  amount: number,
  mint: string = DEVNET_USDC_MINT,
  cluster: string = "devnet"
): Promise<{
  kind: string;
  version: string;
  transactionBase64: string;
  sendTo: "base" | "ephemeral";
  recentBlockhash: string;
  lastValidBlockHeight: number;
  instructionCount: number;
  requiredSigners: string[];
  validator?: string;
}> {
  const resp = await fetch(`${PAYMENTS_API}/v1/spl/deposit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      owner,
      amount,
      mint,
      cluster,
      initIfMissing: true,
      initVaultIfMissing: true,
      initAtasIfMissing: true,
      idempotent: true,
    }),
  });

  const data: any = await resp.json();
  if (data.error) throw new Error(`Deposit build failed: ${JSON.stringify(data.error)}`);
  return data;
}

export async function buildWithdrawTx(
  owner: string,
  amount: number,
  mint: string = DEVNET_USDC_MINT,
  cluster: string = "devnet"
): Promise<{
  kind: string;
  version: string;
  transactionBase64: string;
  sendTo: "base" | "ephemeral";
  recentBlockhash: string;
  lastValidBlockHeight: number;
  instructionCount: number;
  requiredSigners: string[];
  validator?: string;
}> {
  const resp = await fetch(`${PAYMENTS_API}/v1/spl/withdraw`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      owner,
      amount,
      mint,
      cluster,
      initIfMissing: true,
      initAtasIfMissing: true,
      idempotent: true,
    }),
  });

  const data: any = await resp.json();
  if (data.error) throw new Error(`Withdraw build failed: ${JSON.stringify(data.error)}`);
  return data;
}

export async function buildInitializeMintTx(
  owner: string,
  payer: string,
  mint: string = DEVNET_USDC_MINT,
  cluster: string = "devnet"
): Promise<any> {
  const resp = await fetch(`${PAYMENTS_API}/v1/spl/initialize-mint`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ owner, payer, mint, cluster }),
  });

  const data: any = await resp.json();
  if (data.error) throw new Error(`Mint init failed: ${JSON.stringify(data.error)}`);
  return data;
}

export async function isMintInitialized(
  mint: string = DEVNET_USDC_MINT,
  cluster: string = "devnet"
): Promise<boolean> {
  const url = `${PAYMENTS_API}/v1/spl/is-mint-initialized?mint=${mint}&cluster=${cluster}`;
  const resp = await fetch(url);
  const data: any = await resp.json();
  return data.initialized === true;
}

export { DEVNET_USDC_MINT };
