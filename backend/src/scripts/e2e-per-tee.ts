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

  console.log("=== E2E Test: PER/TEE Private Voting ===");
  console.log("Program:", PROGRAM_ID.toBase58());

  // Step 1: Submit question
  const config = await (program.account as any).config.fetch(configPda);
  const counter = Number(config.questionCounter);
  console.log("\n[Step 1] Current question counter:", counter);

  const questionPda = PublicKey.findProgramAddressSync(
    [Buffer.from("question"), bnToU64LE(BigInt(counter))],
    PROGRAM_ID
  )[0];

  const deadline = Math.floor(Date.now() / 1000) + 86400;
  const submitIx = await program.methods
    .submitQuestion("Is Bitcoin mining still profitable in 2026?", "Crypto", new BN(deadline))
    .accounts({
      question: questionPda,
      asker: adminKeypair.publicKey,
      config: configPda,
      treasury: treasuryPda,
      systemProgram: SystemProgram.programId,
    } as any)
    .instruction();

  let tx = new Transaction().add(submitIx);
  let sig = await conn.sendTransaction(tx, [adminKeypair], { skipPreflight: true });
  await conn.confirmTransaction(sig, "confirmed");
  console.log("  Question Q" + counter + " submitted! TX:", sig.slice(0, 30) + "...");
  const qid = counter;

  // Step 2: Select committee
  console.log("\n[Step 2] Selecting committee...");
  const agentRegistryPda = PublicKey.findProgramAddressSync([Buffer.from("agent_registry")], PROGRAM_ID)[0];
  const slotHashes = new PublicKey("SysvarS1otHashes111111111111111111111111111");

  const selectIx = await program.methods
    .selectCommitteeSimple()
    .accounts({
      payer: adminKeypair.publicKey,
      question: questionPda,
      agentRegistry: agentRegistryPda,
      slotHashes: slotHashes,
    } as any)
    .instruction();

  tx = new Transaction().add(selectIx);
  sig = await conn.sendTransaction(tx, [adminKeypair], { skipPreflight: true });
  await conn.confirmTransaction(sig, "confirmed");
  console.log("  Committee selected! TX:", sig.slice(0, 30) + "...");

  // Verify committee and status
  const q1 = await (program.account as any).question.fetch(questionPda);
  const committee = (q1.committee as any[]).filter((c: any) => !c.equals(PublicKey.default));
  console.log("  Committee size:", committee.length);
  console.log("  Status after select:", JSON.stringify(q1.status));

  // Step 3: Enable PER/TEE private voting
  console.log("\n[Step 3] Enabling PER/TEE private voting...");

  // If status is CommitteeSelected, we need to advance to CommitPhase first
  // Actually, let Anchor auto-resolve PDAs — just pass question and validator
  const teeValidator = new PublicKey("MTEWGuqxUpYZGFJQcp8tLN7x5v9BSeoFHYWQQ3n3xzo");

  try {
    const enableIx = await program.methods
      .enablePrivateVoting()
      .accounts({
        payer: adminKeypair.publicKey,
        question: questionPda,
        validator: teeValidator,
      } as any)
      .instruction();

    tx = new Transaction().add(enableIx);
    sig = await conn.sendTransaction(tx, [adminKeypair], { skipPreflight: true });
    await conn.confirmTransaction(sig, "confirmed");
    console.log("  PER/TEE enabled! TX:", sig.slice(0, 30) + "...");
  } catch (err: any) {
    console.error("  PER/TEE enable FAILED:", err.message?.slice(0, 200));
    console.log("\n  This may be because enable_private_voting requires CommitteeSelected or CommitPhase status.");
    console.log("  Trying to advance to CommitPhase first...");

    // Advance to CommitPhase
    const advanceIx = await program.methods
      .updateQuestionStatus({ commitPhase: {} } as any)
      .accounts({
        question: questionPda,
        admin: adminKeypair.publicKey,
      } as any)
      .instruction();

    tx = new Transaction().add(advanceIx);
    sig = await conn.sendTransaction(tx, [adminKeypair], { skipPreflight: true });
    await conn.confirmTransaction(sig, "confirmed");
    console.log("  Advanced to CommitPhase! TX:", sig.slice(0, 30) + "...");

    // Now try PER/TEE again
    const enableIx2 = await program.methods
      .enablePrivateVoting()
      .accounts({
        payer: adminKeypair.publicKey,
        question: questionPda,
        validator: teeValidator,
      } as any)
      .instruction();

    tx = new Transaction().add(enableIx2);
    sig = await conn.sendTransaction(tx, [adminKeypair], { skipPreflight: true });
    await conn.confirmTransaction(sig, "confirmed");
    console.log("  PER/TEE enabled (2nd attempt)! TX:", sig.slice(0, 30) + "...");
  }

  // Verify delegation
  const acc = await conn.getAccountInfo(questionPda);
  const delegationProgram = new PublicKey("DELeGGvXpWV2fqJUhqcF5ZSYMS4JTLjteaAMARRSaeSh");
  if (acc?.owner.equals(delegationProgram)) {
    console.log("  Question PDA owner is now Delegation Program — delegation confirmed!");
  } else {
    console.log("  WARNING: Question PDA owner is:", acc?.owner.toBase58(), "(expected delegation program)");
  }

  // Verify status
  const q2 = await (program.account as any).question.fetch(questionPda);
  console.log("  Status:", JSON.stringify(q2.status));

  console.log("\n=== E2E Setup Complete ===");
  console.log("Question Q" + qid + " is now in PrivateVoting mode.");
  console.log("Start the orchestrator to process private commits/reveals/resolution.");
}

main().catch(console.error);
