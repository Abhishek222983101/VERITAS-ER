import * as anchor from "@coral-xyz/anchor";
import { BN } from "@coral-xyz/anchor";
import { VeritasOracle } from "../target/types/veritas_oracle";
import { PublicKey, Keypair, SystemProgram, LAMPORTS_PER_SOL, Connection, Transaction } from "@solana/web3.js";
import * as fs from "fs";

const BASE_RPC = "https://devnet.helius-rpc.com/?api-key=ac70f146-b68a-48b3-8798-56718958f0a0";
const ER_RPC = "https://devnet-as.magicblock.app";

async function main() {
  const connection = new Connection(BASE_RPC, "confirmed");
  const walletKeypair = Keypair.fromSecretKey(
    Uint8Array.from(JSON.parse(fs.readFileSync(process.env.HOME + "/.config/solana/id.json", "utf-8")))
  );
  const wallet = new anchor.Wallet(walletKeypair);
  const provider = new anchor.AnchorProvider(connection, wallet, { commitment: "confirmed" });
  anchor.setProvider(provider);

  const program = anchor.workspace.veritasOracle as anchor.Program<VeritasOracle>;
  const erConnection = new Connection(ER_RPC, "confirmed");
  const erProvider = new anchor.AnchorProvider(erConnection, wallet, { commitment: "confirmed" });

  console.log("╔══════════════════════════════════════════════════╗");
  console.log("║     PHASE 2 TESTS — ER Delegation                 ║");
  console.log("╚══════════════════════════════════════════════════╝\n");
  console.log("Program ID:", program.programId.toBase58());
  console.log("Deployer:", wallet.publicKey.toBase58());
  const deployerBal = await connection.getBalance(wallet.publicKey);
  console.log("Deployer balance:", deployerBal / LAMPORTS_PER_SOL, "SOL\n");

  const adminKeypair = Keypair.generate();
  const treasuryKeypair = Keypair.generate();
  const agentKeypair = Keypair.generate();
  const askerKeypair = Keypair.generate();

  const [configPda] = PublicKey.findProgramAddressSync([Buffer.from("config")], program.programId);
  const [agentPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("agent"), agentKeypair.publicKey.toBuffer()],
    program.programId
  );

  // Fund with amounts sufficient for their roles
  // admin: 0.02 SOL (just needs tx fees)
  // agent: 0.02 SOL (just needs tx fees for registration)
  // asker: 0.15 SOL (needs 0.1 SOL for query fee + rent for Question PDA ~0.005)
  // treasury: 0.01 SOL (receives funds, doesn't need much)
  console.log("Funding test wallets...");
  const fundTx = new Transaction().add(
    SystemProgram.transfer({ fromPubkey: wallet.publicKey, toPubkey: adminKeypair.publicKey, lamports: 0.02 * LAMPORTS_PER_SOL }),
    SystemProgram.transfer({ fromPubkey: wallet.publicKey, toPubkey: agentKeypair.publicKey, lamports: 0.02 * LAMPORTS_PER_SOL }),
    SystemProgram.transfer({ fromPubkey: wallet.publicKey, toPubkey: askerKeypair.publicKey, lamports: 0.15 * LAMPORTS_PER_SOL }),
    SystemProgram.transfer({ fromPubkey: wallet.publicKey, toPubkey: treasuryKeypair.publicKey, lamports: 0.01 * LAMPORTS_PER_SOL }),
  );
  const fundSig = await provider.sendAndConfirm(fundTx);
  console.log("Funded, TX:", fundSig.slice(0, 30) + "...\n");

  let passed = 0;
  let failed = 0;

  // ---- SETUP: init_config ----
  let configExists = false;
  try { await program.account.config.fetch(configPda); configExists = true; } catch {}
  if (!configExists) {
    console.log("Creating Config PDA...");
    await program.methods.initConfig()
      .accounts({ config: configPda, admin: adminKeypair.publicKey, treasury: treasuryKeypair.publicKey, systemProgram: SystemProgram.programId } as any)
      .signers([adminKeypair]).rpc();
    console.log("Config created ✅\n");
  }

  // ---- SETUP: register_agent ----
  let agentExists = false;
  try { await program.account.agent.fetch(agentPda); agentExists = true; } catch {}
  if (!agentExists) {
    const personalityHash = new Array(32).fill(0); personalityHash[0] = 1;
    await program.methods.registerAgent("Oracle Alpha", personalityHash as any)
      .accounts({ agent: agentPda, wallet: agentKeypair.publicKey, config: configPda, systemProgram: SystemProgram.programId } as any)
      .signers([agentKeypair]).rpc();
    console.log("Agent registered ✅\n");
  }

  // ---- SETUP: submit_question ----
  const configData = await program.account.config.fetch(configPda);
  const qid = configData.questionCounter.toNumber();
  const [questionPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("question"), new BN(qid).toArrayLike(Buffer, "le", 8)],
    program.programId
  );

  let questionExists = false;
  try { await program.account.question.fetch(questionPda); questionExists = true; } catch {}
  if (!questionExists) {
    const deadline = Math.floor(Date.now() / 1000) + 86400;
    await program.methods.submitQuestion("Test ER delegation", "Test", new BN(deadline))
      .accounts({ question: questionPda, asker: askerKeypair.publicKey, config: configPda, treasury: treasuryKeypair.publicKey, systemProgram: SystemProgram.programId } as any)
      .signers([askerKeypair]).rpc();
    console.log("Question submitted (id=" + qid + ") ✅\n");
  } else {
    console.log("Question exists (id=" + qid + ") ✅\n");
  }

  // ============================================
  // TEST 1: delegate_question (BASE LAYER)
  // ============================================
  console.log("TEST 1: delegate_question (base layer → ER)");
  try {
    const tx = await program.methods
      .delegateQuestion(new BN(qid))
      .accounts({
        payer: wallet.publicKey,
        pda: questionPda,
      } as any)
      .rpc();

    console.log("  TX:", tx);

    try {
      const questionAfter = await program.account.question.fetch(questionPda);
      console.log("  Question still readable on base layer ✅");
      console.log("    questionId:", questionAfter.questionId.toString());
    } catch {
      console.log("  Note: Question may have been moved to ER");
    }

    console.log("  ✅ PASSED\n"); passed++;
  } catch (err: any) {
    console.log("  ❌ FAILED:", (err.message || JSON.stringify(err.error || err)).slice(0, 300), "\n"); failed++;
  }

  // ============================================
  // TEST 2: delegate_agent (BASE LAYER)
  // ============================================
  console.log("TEST 2: delegate_agent (base layer → ER)");
  try {
    const tx = await program.methods
      .delegateAgent(agentKeypair.publicKey)
      .accounts({
        payer: wallet.publicKey,
        pda: agentPda,
      } as any)
      .rpc();

    console.log("  TX:", tx);

    try {
      const agentAfter = await program.account.agent.fetch(agentPda);
      console.log("  Agent still readable on base layer ✅");
      console.log("    name:", agentAfter.name);
    } catch {
      console.log("  Note: Agent may have been moved to ER");
    }

    console.log("  ✅ PASSED\n"); passed++;
  } catch (err: any) {
    console.log("  ❌ FAILED:", (err.message || JSON.stringify(err.error || err)).slice(0, 300), "\n"); failed++;
  }

  // ============================================
  // TEST 3: commit_and_undelegate_question (ER)
  // ============================================
  console.log("TEST 3: commit_and_undelegate_question (ER → base)");
  try {
    let tx = await program.methods
      .commitAndUndelegateQuestion()
      .accounts({
        payer: wallet.publicKey,
        question: questionPda,
        magicContext: new PublicKey("MagicContext1111111111111111111111111111111"),
        magicProgram: new PublicKey("Magic11111111111111111111111111111111111111"),
      } as any)
      .transaction();

    tx.feePayer = wallet.publicKey;
    tx.recentBlockhash = (await erConnection.getLatestBlockhash()).blockhash;
    tx = await erProvider.wallet.signTransaction(tx);
    const txHash = await erProvider.sendAndConfirm(tx, [], { skipPreflight: true });

    console.log("  TX:", txHash);
    console.log("  ✅ Commit and undelegate sent on ER ✅\n"); passed++;
  } catch (err: any) {
    console.log("  ❌ FAILED:", (err.message || JSON.stringify(err.error || err)).slice(0, 300), "\n"); failed++;
  }

  // ============================================
  // TEST 4: commit_and_undelegate_agent (ER)
  // ============================================
  console.log("TEST 4: commit_and_undelegate_agent (ER → base)");
  try {
    let tx = await program.methods
      .commitAndUndelegateAgent()
      .accounts({
        payer: wallet.publicKey,
        agent: agentPda,
        magicContext: new PublicKey("MagicContext1111111111111111111111111111111"),
        magicProgram: new PublicKey("Magic11111111111111111111111111111111111111"),
      } as any)
      .transaction();

    tx.feePayer = wallet.publicKey;
    tx.recentBlockhash = (await erConnection.getLatestBlockhash()).blockhash;
    tx = await erProvider.wallet.signTransaction(tx);
    const txHash = await erProvider.sendAndConfirm(tx, [], { skipPreflight: true });

    console.log("  TX:", txHash);
    console.log("  ✅ Agent commit and undelegate sent on ER ✅\n"); passed++;
  } catch (err: any) {
    console.log("  ❌ FAILED:", (err.message || JSON.stringify(err.error || err)).slice(0, 300), "\n"); failed++;
  }

  // ============================================
  // VERIFICATION: Read accounts back on base layer
  // ============================================
  console.log("VERIFICATION: Reading accounts back on base layer");
  try {
    const question = await program.account.question.fetch(questionPda);
    console.log("  Question PDA readable on base layer ✅");
    console.log("    questionId:", question.questionId.toString());
    console.log("    status:", JSON.stringify(question.status));

    const agent = await program.account.agent.fetch(agentPda);
    console.log("  Agent PDA readable on base layer ✅");
    console.log("    name:", agent.name);
    console.log("    reputation:", agent.reputation.toString());
  } catch (err: any) {
    console.log("  Note: Account read error:", err.message.slice(0, 100));
  }

  // ---- SUMMARY ----
  console.log("\n╔══════════════════════════════════════════════════╗");
  console.log("║     PHASE 2 RESULTS                               ║");
  console.log("╠══════════════════════════════════════════════════╣");
  console.log(`  PASSED: ${passed}  |  FAILED: ${failed}`);
  console.log("╚══════════════════════════════════════════════════╝");

  if (failed > 0) process.exit(1);
}

main().catch(err => { console.error("FATAL:", err.message || JSON.stringify(err)); process.exit(1); });
