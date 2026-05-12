import * as anchor from "@coral-xyz/anchor";
import { BN } from "@coral-xyz/anchor";
import { VeritasOracle } from "../target/types/veritas_oracle";
import { PublicKey, Keypair, SystemProgram, LAMPORTS_PER_SOL, Connection, Transaction } from "@solana/web3.js";
import * as fs from "fs";

const RPC_URL = "https://devnet.helius-rpc.com/?api-key=ac70f146-b68a-48b3-8798-56718958f0a0";

async function main() {
  const connection = new Connection(RPC_URL, "confirmed");
  const walletKeypair = Keypair.fromSecretKey(
    Uint8Array.from(JSON.parse(fs.readFileSync(process.env.HOME + "/.config/solana/id.json", "utf-8")))
  );
  const wallet = new anchor.Wallet(walletKeypair);
  const provider = new anchor.AnchorProvider(connection, wallet, { commitment: "confirmed" });
  anchor.setProvider(provider);

  const program = anchor.workspace.veritasOracle as anchor.Program<VeritasOracle>;

  console.log("╔══════════════════════════════════════════════════╗");
  console.log("║     PHASE 1 TESTS — DEVNET (Live Program)        ║");
  console.log("╚══════════════════════════════════════════════════╝\n");
  console.log("Program ID:", program.programId.toBase58());
  console.log("Deployer:", wallet.publicKey.toBase58());
  const deployerBal = await connection.getBalance(wallet.publicKey);
  console.log("Deployer balance:", deployerBal / LAMPORTS_PER_SOL, "SOL\n");

  const adminKeypair = Keypair.generate();
  const treasuryKeypair = Keypair.generate();
  const agentKeypair = Keypair.generate();
  const askerKeypair = Keypair.generate();

  // Fund test wallets from deployer (not airdrop — rate limited)
  console.log("Funding test wallets from deployer...");
  const fundAmt = 0.2 * LAMPORTS_PER_SOL;
  const fundTx = new Transaction().add(
    SystemProgram.transfer({ fromPubkey: wallet.publicKey, toPubkey: adminKeypair.publicKey, lamports: fundAmt }),
    SystemProgram.transfer({ fromPubkey: wallet.publicKey, toPubkey: agentKeypair.publicKey, lamports: fundAmt }),
    SystemProgram.transfer({ fromPubkey: wallet.publicKey, toPubkey: askerKeypair.publicKey, lamports: fundAmt }),
    SystemProgram.transfer({ fromPubkey: wallet.publicKey, toPubkey: treasuryKeypair.publicKey, lamports: 0.05 * LAMPORTS_PER_SOL }),
  );
  const fundSig = await provider.sendAndConfirm(fundTx);
  console.log("Funded, TX:", fundSig.slice(0, 30) + "...\n");

  const [configPda] = PublicKey.findProgramAddressSync([Buffer.from("config")], program.programId);
  const [agentPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("agent"), agentKeypair.publicKey.toBuffer()],
    program.programId
  );

  let passed = 0;
  let failed = 0;

  // ---- TEST 1: init_config ----
  console.log("TEST 1: init_config");
  try {
    let configExists = false;
    try { await program.account.config.fetch(configPda); configExists = true; } catch {}

    if (!configExists) {
      const tx = await program.methods
        .initConfig()
        .accounts({
          config: configPda,
          admin: adminKeypair.publicKey,
          treasury: treasuryKeypair.publicKey,
          systemProgram: SystemProgram.programId,
        } as any)
        .signers([adminKeypair])
        .rpc();
      console.log("  TX:", tx);
    } else {
      console.log("  Config already exists from previous test run, verifying...");
    }

    const config = await program.account.config.fetch(configPda);
    console.log("  admin:", config.admin.toBase58());
    console.log("  treasury:", config.treasury.toBase58());
    console.log("  defaultQueryFee:", config.defaultQueryFee.toString());
    console.log("  committeeSize:", config.committeeSize);
    console.log("  consensusThreshold:", config.consensusThreshold);
    console.log("  questionCounter:", config.questionCounter.toString());
    console.log("  ✅ PASSED\n"); passed++;
  } catch (err: any) {
    console.log("  ❌ FAILED:", (err.message || err.error?.errorMessage || "").slice(0, 300), "\n"); failed++;
  }

  // ---- TEST 2: register_agent ----
  console.log("TEST 2: register_agent");
  try {
    let agentExists = false;
    try { await program.account.agent.fetch(agentPda); agentExists = true; } catch {}

    if (!agentExists) {
      const personalityHash = new Array(32).fill(0); personalityHash[0] = 1;
      const tx = await program.methods
        .registerAgent("Oracle Alpha", personalityHash as any)
        .accounts({
          agent: agentPda,
          wallet: agentKeypair.publicKey,
          config: configPda,
          systemProgram: SystemProgram.programId,
        } as any)
        .signers([agentKeypair])
        .rpc();
      console.log("  TX:", tx);
    } else {
      console.log("  Agent already exists, verifying...");
    }

    const agent = await program.account.agent.fetch(agentPda);
    console.log("  wallet:", agent.wallet.toBase58());
    console.log("  name:", agent.name);
    console.log("  reputation:", agent.reputation.toString());
    console.log("  isActive:", agent.isActive);
    console.log("  ✅ PASSED\n"); passed++;
  } catch (err: any) {
    console.log("  ❌ FAILED:", (err.message || err.error?.errorMessage || "").slice(0, 300), "\n"); failed++;
  }

  // ---- TEST 3: submit_question ----
  console.log("TEST 3: submit_question + SOL transfer");
  try {
    const configData = await program.account.config.fetch(configPda);
    const qid = configData.questionCounter.toNumber();
    const [questionPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("question"), new BN(qid).toArrayLike(Buffer, "le", 8)],
      program.programId
    );

    const treasuryBalBefore = await connection.getBalance(treasuryKeypair.publicKey);
    const deadline = Math.floor(Date.now() / 1000) + 86400;

    const tx = await program.methods
      .submitQuestion("Will BTC hit $150K by Q2 2026?", "Crypto", new BN(deadline))
      .accounts({
        question: questionPda,
        asker: askerKeypair.publicKey,
        config: configPda,
        treasury: treasuryKeypair.publicKey,
        systemProgram: SystemProgram.programId,
      } as any)
      .signers([askerKeypair])
      .rpc();
    console.log("  TX:", tx);

    const question = await program.account.question.fetch(questionPda);
    console.log("  questionText:", question.questionText);
    console.log("  category:", question.category);
    console.log("  queryFee:", question.queryFee.toString());
    console.log("  status:", JSON.stringify(question.status));
    console.log("  questionId:", question.questionId.toString());

    const treasuryBalAfter = await connection.getBalance(treasuryKeypair.publicKey);
    const diff = treasuryBalAfter - treasuryBalBefore;
    console.log("  SOL transferred:", diff / LAMPORTS_PER_SOL, "SOL");

    if (question.questionText !== "Will BTC hit $150K by Q2 2026?") throw new Error("text mismatch");
    if (diff !== 100_000_000) throw new Error("SOL transfer wrong: " + diff);
    console.log("  ✅ PASSED\n"); passed++;
  } catch (err: any) {
    console.log("  ❌ FAILED:", (err.message || err.error?.errorMessage || "").slice(0, 300), "\n"); failed++;
  }

  // ---- TEST 4: update_question_status ----
  console.log("TEST 4: update_question_status (Pending→CommitteeSelected)");
  try {
    const configData = await program.account.config.fetch(configPda);
    const qid = configData.questionCounter.toNumber() - 1;
    const [questionPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("question"), new BN(qid).toArrayLike(Buffer, "le", 8)],
      program.programId
    );

    const tx = await program.methods
      .updateQuestionStatus({ committeeSelected: {} })
      .accounts({
        question: questionPda,
        admin: adminKeypair.publicKey,
      } as any)
      .signers([adminKeypair])
      .rpc();
    console.log("  TX:", tx);

    const question = await program.account.question.fetch(questionPda);
    console.log("  status:", JSON.stringify(question.status));
    console.log("  ✅ PASSED\n"); passed++;
  } catch (err: any) {
    console.log("  ❌ FAILED:", (err.message || err.error?.errorMessage || "").slice(0, 300), "\n"); failed++;
  }

  // ---- TEST 5: verify_human ----
  console.log("TEST 5: verify_human");
  try {
    const testWallet = Keypair.generate();
    // Fund from deployer
    const fundTx2 = new Transaction().add(
      SystemProgram.transfer({ fromPubkey: wallet.publicKey, toPubkey: testWallet.publicKey, lamports: 0.05 * LAMPORTS_PER_SOL })
    );
    await provider.sendAndConfirm(fundTx2);

    const [attestationPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("human"), testWallet.publicKey.toBuffer()],
      program.programId
    );

    const proofHash = new Array(32).fill(0); proofHash[0] = 42;
    const providerHashVal = new Array(32).fill(0); providerHashVal[0] = 99;

    const tx = await program.methods
      .verifyHuman(proofHash as any, providerHashVal as any)
      .accounts({
        attestation: attestationPda,
        wallet: testWallet.publicKey,
        systemProgram: SystemProgram.programId,
      } as any)
      .signers([testWallet])
      .rpc();
    console.log("  TX:", tx);

    const attestation = await program.account.humanAttestation.fetch(attestationPda);
    console.log("  reclaimProofHash[0]:", attestation.reclaimProofHash[0]);
    console.log("  providerHash[0]:", attestation.providerHash[0]);
    if (attestation.reclaimProofHash[0] !== 42) throw new Error("proof mismatch");
    if (attestation.providerHash[0] !== 99) throw new Error("provider mismatch");
    console.log("  ✅ PASSED\n"); passed++;
  } catch (err: any) {
    console.log("  ❌ FAILED:", (err.message || err.error?.errorMessage || "").slice(0, 300), "\n"); failed++;
  }

  // ---- TEST 6: update_reputation ----
  console.log("TEST 6: update_reputation (+10, -5)");
  try {
    const agentBefore = await program.account.agent.fetch(agentPda);
    const repBefore = agentBefore.reputation.toNumber();
    console.log("  Reputation before:", repBefore);

    await program.methods
      .updateReputation(10)
      .accounts({ agent: agentPda, admin: adminKeypair.publicKey } as any)
      .signers([adminKeypair])
      .rpc();
    const after1 = await program.account.agent.fetch(agentPda);
    console.log("  After +10:", after1.reputation.toNumber());

    await program.methods
      .updateReputation(-5)
      .accounts({ agent: agentPda, admin: adminKeypair.publicKey } as any)
      .signers([adminKeypair])
      .rpc();
    const after2 = await program.account.agent.fetch(agentPda);
    console.log("  After -5:", after2.reputation.toNumber());

    if (after2.reputation.toNumber() !== repBefore + 5) throw new Error("reputation mismatch");
    console.log("  ✅ PASSED\n"); passed++;
  } catch (err: any) {
    console.log("  ❌ FAILED:", (err.message || err.error?.errorMessage || "").slice(0, 300), "\n"); failed++;
  }

  // ---- SUMMARY ----
  console.log("╔══════════════════════════════════════════════════╗");
  console.log("║     PHASE 1 RESULTS                               ║");
  console.log("╠══════════════════════════════════════════════════╣");
  console.log(`  PASSED: ${passed}  |  FAILED: ${failed}`);
  console.log("╚══════════════════════════════════════════════════╝");

  if (failed > 0) process.exit(1);
}

main().catch(err => { console.error("FATAL:", err.message || JSON.stringify(err)); process.exit(1); });
