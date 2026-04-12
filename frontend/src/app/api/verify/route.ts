import { NextResponse } from "next/server";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { Program, AnchorProvider, BN } from "@coral-xyz/anchor";
import DiveIdentityIdl from "@/lib/idl/dive_identity.json";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

// Custom wallet implementation for AnchorProvider
class NodeWallet {
  constructor(readonly payer: Keypair) {}
  get publicKey() { return this.payer.publicKey; }
  async signTransaction(tx: any) {
    tx.partialSign(this.payer);
    return tx;
  }
  async signAllTransactions(txs: any[]) {
    txs.forEach((tx) => tx.partialSign(this.payer));
    return txs;
  }
}

export async function POST(req: Request) {
  try {
    const { wallet } = await req.json();
    if (!wallet) return NextResponse.json({ error: "Missing wallet address" }, { status: 400 });

    const userPubkey = new PublicKey(wallet);

    // Load the backend issuer keypair (from CLI)
    const keyPath = path.join(os.homedir(), ".config", "solana", "id.json");
    if (!fs.existsSync(keyPath)) {
      return NextResponse.json({ error: "Backend keypair not found for demo" }, { status: 500 });
    }
    
    const keyData = JSON.parse(fs.readFileSync(keyPath, "utf-8"));
    const issuerKeypair = Keypair.fromSecretKey(new Uint8Array(keyData));

    // Connect to Devnet
    const connection = new Connection("https://api.devnet.solana.com", "confirmed");
    const backendWallet = new NodeWallet(issuerKeypair);
    const provider = new AnchorProvider(connection, backendWallet, { commitment: "confirmed" });
    const program = new Program(DiveIdentityIdl as any, provider);

    // Dummy ZK Proof Data
    const providerHash = Array.from({ length: 32 }, () => Math.floor(Math.random() * 256));
    const reclaimProofHash = Array.from({ length: 32 }, () => Math.floor(Math.random() * 256));
    const stableIdHash = Array.from({ length: 32 }, () => Math.floor(Math.random() * 256));
    const expiresAt = new BN(Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60);

    const [protocolConfigPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("dive_config")],
      program.programId
    );

    const [attestationPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("dive_human"), userPubkey.toBuffer()],
      program.programId
    );

    const tx = await program.methods
      .verifyHuman(providerHash, reclaimProofHash, stableIdHash, expiresAt)
      .accounts({
        issuer: issuerKeypair.publicKey,
        config: protocolConfigPda,
        wallet: userPubkey,
        humanAttestation: attestationPda,
        systemProgram: new PublicKey("11111111111111111111111111111111"),
      } as any)
      .signers([issuerKeypair])
      .rpc();

    return NextResponse.json({ success: true, tx });
  } catch (error: any) {
    console.error("Backend Verification Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
