import { Connection, Keypair, PublicKey, SystemProgram, Transaction } from "@solana/web3.js";
import { AnchorProvider, Program, Wallet, BN } from "@coral-xyz/anchor";
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";
import * as crypto from "crypto";

dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

const RPC_URL = process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com";
const IDL_PATH = path.resolve(__dirname, "../../../veritas-oracle/target/idl/veritas_oracle.json");
const IDL = JSON.parse(fs.readFileSync(IDL_PATH, "utf-8"));
const PROGRAM_ID = new PublicKey(IDL.address);

const ADMIN_KEYPAIR_PATH = path.resolve(__dirname, "../../../veritas-oracle/keypairs/admin.json");
const AGENTS = [
  { name: "Oracle Alpha", keypair: "oracle-alpha.json", personality: "analytical_conservative" },
  { name: "Skeptic Beta", keypair: "skeptic-beta.json", personality: "contrarian_devil_advocate" },
  { name: "Signal Gamma", keypair: "signal-gamma.json", personality: "data_driven_pattern" },
  { name: "Risk Delta", keypair: "risk-delta.json", personality: "risk_averse_tail" },
  { name: "Synthesis Epsilon", keypair: "synthesis-epsilon.json", personality: "balanced_mediator" },
];

function loadKeypair(keypairPath: string): Keypair {
  const fullPath = path.resolve(__dirname, "../../../veritas-oracle/keypairs", keypairPath);
  const data = JSON.parse(fs.readFileSync(fullPath, "utf-8"));
  return Keypair.fromSecretKey(new Uint8Array(data));
}

function personalityHash(personality: string): number[] {
  const hash = crypto.createHash("sha256");
  hash.update(Buffer.from(personality));
  return Array.from(hash.digest());
}

async function main() {
  console.log("=== Registering VERITAS Agents ===");
  console.log(`RPC: ${RPC_URL}`);
  console.log(`Program: ${PROGRAM_ID.toBase58()}`);

  const adminKeypairData = JSON.parse(fs.readFileSync(ADMIN_KEYPAIR_PATH, "utf-8"));
  const adminKeypair = Keypair.fromSecretKey(new Uint8Array(adminKeypairData));
  const adminConnection = new Connection(RPC_URL, "confirmed");
  const adminWallet = new Wallet(adminKeypair);
  const adminProvider = new AnchorProvider(adminConnection, adminWallet as any, { commitment: "confirmed" });
  const program = new Program(IDL, adminProvider as any);

  // Check admin balance
  const adminBalance = await adminConnection.getBalance(adminKeypair.publicKey);
  console.log(`Admin balance: ${adminBalance / 1e9} SOL`);

  if (adminBalance < 0.5 * 1e9) {
    console.error("Admin needs more SOL for transaction fees. Request airdrop:");
    console.error(`solana airdrop 2 ${adminKeypair.publicKey.toBase58()} --url devnet`);
    process.exit(1);
  }

  // Initialize agent registry if it doesn't exist
  const registryPda = PublicKey.findProgramAddressSync([Buffer.from("agent_registry")], PROGRAM_ID)[0];
  try {
    const existing = await adminConnection.getAccountInfo(registryPda);
    if (existing) {
      console.log("Agent registry already exists");
    } else {
      console.log("Initializing agent registry...");
      const initIx = await program.methods
        .initAgentRegistry()
        .accounts({
          agentRegistry: registryPda,
          admin: adminKeypair.publicKey,
          systemProgram: SystemProgram.programId,
        } as any)
        .instruction();
      const initTx = new Transaction().add(initIx);
      const initSig = await adminConnection.sendTransaction(initTx, [adminKeypair], { skipPreflight: true });
      await adminConnection.confirmTransaction(initSig, "confirmed");
      console.log(`Agent registry initialized! TX: ${initSig}`);
    }
  } catch (err: any) {
    if (err.message?.includes("already in use")) {
      console.log("Agent registry already exists (account in use)");
    } else {
      console.error(`Init registry failed: ${err.message?.slice(0, 100)}`);
    }
  }

  for (const agent of AGENTS) {
    const kp = loadKeypair(agent.keypair);
    console.log(`\n--- Registering ${agent.name} (${kp.publicKey.toBase58().slice(0, 12)}...) ---`);

    // Check agent balance
    const agentBalance = await adminConnection.getBalance(kp.publicKey);
    console.log(`  Balance: ${agentBalance / 1e9} SOL`);

    if (agentBalance < 0.01 * 1e9) {
      console.log(`  Funding agent with 0.05 SOL...`);
      const fundTx = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: adminKeypair.publicKey,
          toPubkey: kp.publicKey,
          lamports: 0.05 * 1e9,
        })
      );
      const sig = await adminConnection.sendTransaction(fundTx, [adminKeypair], { skipPreflight: true });
      await adminConnection.confirmTransaction(sig, "confirmed");
      console.log(`  Funded: ${sig.slice(0, 20)}...`);
    }

    // Register agent
    try {
      const agentPda = PublicKey.findProgramAddressSync(
        [Buffer.from("agent"), kp.publicKey.toBuffer()],
        PROGRAM_ID
      )[0];

      const ix = await program.methods
        .registerAgent(agent.name, personalityHash(agent.personality))
        .accounts({
          agent: agentPda,
          wallet: kp.publicKey,
          config: PublicKey.findProgramAddressSync([Buffer.from("config")], PROGRAM_ID)[0],
          agentRegistry: PublicKey.findProgramAddressSync([Buffer.from("agent_registry")], PROGRAM_ID)[0],
          systemProgram: SystemProgram.programId,
        } as any)
        .instruction();

      const tx = new Transaction().add(ix);
      const sig = await adminConnection.sendTransaction(tx, [kp], { skipPreflight: true });
      await adminConnection.confirmTransaction(sig, "confirmed");
      console.log(`  Registered! TX: ${sig}`);
    } catch (err: any) {
      if (err.message?.includes("already in use") || err.message?.includes("custom program error: 0x0")) {
        console.log(`  Already registered (skipping)`);
      } else {
        console.error(`  Registration failed: ${err.message?.slice(0, 100)}`);
      }
    }
  }

  // Verify registry
  console.log("\n=== Verifying Registry ===");
  try {
    const registry = await (program.account as any).agentRegistry.fetch(registryPda);
    const count = Number(registry.count);
    console.log(`Registry count: ${count}`);
    for (let i = 0; i < count; i++) {
      const pk = (registry.agents as PublicKey[])[i];
      const rep = (registry.reputations as bigint[])[i];
      const name = AGENTS.find(a => loadKeypair(a.keypair).publicKey.equals(pk))?.name || "Unknown";
      console.log(`  [${i}] ${name} ${pk.toBase58().slice(0, 16)}... Rep: ${rep}`);
    }
  } catch (err: any) {
    console.error(`Failed to fetch registry: ${err.message}`);
  }
}

main().catch(console.error);
