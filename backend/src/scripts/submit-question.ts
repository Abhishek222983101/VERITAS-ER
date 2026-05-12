import { Connection, Keypair, PublicKey, SystemProgram, Transaction } from "@solana/web3.js";
import { AnchorProvider, Program, Wallet, BN } from "@coral-xyz/anchor";
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

  const configPda = PublicKey.findProgramAddressSync([Buffer.from("config")], PROGRAM_ID)[0];
  const treasuryPda = PublicKey.findProgramAddressSync([Buffer.from("treasury")], PROGRAM_ID)[0];

  console.log("=== Submit Test Question ===");
  console.log("Program:", PROGRAM_ID.toBase58());

  const config = await (program.account as any).config.fetch(configPda);
  const counter = Number(config.questionCounter);
  console.log("Current question counter:", counter);

  const questionPda = PublicKey.findProgramAddressSync(
    [Buffer.from("question"), bnToU64LE(BigInt(counter))],
    PROGRAM_ID
  )[0];

  const deadline = Math.floor(Date.now() / 1000) + 86400;
  const ix = await program.methods
    .submitQuestion("Will Solana reach $300 by end of 2026?", "Crypto", new BN(deadline))
    .accounts({
      question: questionPda,
      asker: adminKeypair.publicKey,
      config: configPda,
      treasury: treasuryPda,
      systemProgram: SystemProgram.programId,
    } as any)
    .instruction();

  const tx = new Transaction().add(ix);
  const sig = await conn.sendTransaction(tx, [adminKeypair], { skipPreflight: true });
  await conn.confirmTransaction(sig, "confirmed");
  console.log("Question submitted! TX:", sig);
  console.log("Question ID:", counter);
}

main().catch(console.error);
