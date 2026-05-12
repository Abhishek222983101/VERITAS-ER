import { Connection, Keypair, PublicKey, SystemProgram, Transaction } from "@solana/web3.js";
import { AnchorProvider, Program, Wallet } from "@coral-xyz/anchor";
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";

dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

const RPC_URL = process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com";
const IDL_PATH = path.resolve(__dirname, "../../../veritas-oracle/target/idl/veritas_oracle.json");
const IDL = JSON.parse(fs.readFileSync(IDL_PATH, "utf-8"));
const PROGRAM_ID = new PublicKey(IDL.address);
const ADMIN_KEYPAIR_PATH = path.resolve(__dirname, "../../../veritas-oracle/keypairs/admin.json");

function bnToU64LE(bn: bigint): Buffer {
  const buf = Buffer.alloc(8);
  let n = bn;
  for (let i = 0; i < 8; i++) {
    buf[i] = Number(n & BigInt(0xFF));
    n >>= BigInt(8);
  }
  return buf;
}

async function main() {
  const adminData = JSON.parse(fs.readFileSync(ADMIN_KEYPAIR_PATH, "utf-8"));
  const adminKeypair = Keypair.fromSecretKey(new Uint8Array(adminData));
  const conn = new Connection(RPC_URL, "confirmed");
  const wallet = new Wallet(adminKeypair);
  const provider = new AnchorProvider(conn, wallet as any, { commitment: "confirmed" });
  const program = new Program(IDL, provider as any);

  const questionId = parseInt(process.argv[2] || "0", 10);
  const questionPda = PublicKey.findProgramAddressSync(
    [Buffer.from("question"), bnToU64LE(BigInt(questionId))],
    PROGRAM_ID
  )[0];
  const agentRegistryPda = PublicKey.findProgramAddressSync(
    [Buffer.from("agent_registry")],
    PROGRAM_ID
  )[0];
  const slotHashes = new PublicKey("SysvarS1otHashes111111111111111111111111111");

  console.log(`=== Select Committee for Q${questionId} ===`);

  const ix = await program.methods
    .selectCommitteeSimple()
    .accounts({
      payer: adminKeypair.publicKey,
      question: questionPda,
      agentRegistry: agentRegistryPda,
      slotHashes: slotHashes,
    } as any)
    .instruction();

  const tx = new Transaction().add(ix);
  const sig = await conn.sendTransaction(tx, [adminKeypair], { skipPreflight: true });
  await conn.confirmTransaction(sig, "confirmed");
  console.log("Committee selected! TX:", sig);

  const q = await (program.account as any).question.fetch(questionPda);
  console.log("Status:", JSON.stringify(q.status));
  const committee = (q.committee as any[]).filter((c: any) => !c.equals(PublicKey.default));
  console.log("Committee size:", committee.length);
  for (const c of committee) {
    console.log("  ", c.toBase58());
  }
}

main().catch(console.error);
