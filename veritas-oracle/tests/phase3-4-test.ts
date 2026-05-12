import * as anchor from "@coral-xyz/anchor";
import { BN } from "@coral-xyz/anchor";
import { VeritasOracle } from "../target/types/veritas_oracle";
import { PublicKey, Keypair, SystemProgram, LAMPORTS_PER_SOL, Connection, Transaction } from "@solana/web3.js";
import * as fs from "fs";
import * as crypto from "crypto";

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

  console.log("╔══════════════════════════════════════════════════╗");
  console.log("║     PHASE 3 + 4 TESTS — DEVNET                     ║");
  console.log("║     VRF Committee + Commit-Reveal Voting            ║");
  console.log("╚══════════════════════════════════════════════════╝\n");
  console.log("Program ID:", program.programId.toBase58());
  console.log("Deployer:", wallet.publicKey.toBase58());
  const deployerBal = await connection.getBalance(wallet.publicKey);
  console.log("Deployer balance:", deployerBal / LAMPORTS_PER_SOL, "SOL\n");

  // Generate test wallets
  const adminKeypair = Keypair.generate();
  const treasuryKeypair = Keypair.generate();
  const agent1Kp = Keypair.generate();
  const agent2Kp = Keypair.generate();
  const agent3Kp = Keypair.generate();
  const askerKp = Keypair.generate();

  // Fund all test wallets from deployer (0.05 SOL each)
  console.log("Funding test wallets (0.05 SOL each)...");
  const fundTx = new Transaction().add(
    SystemProgram.transfer({ fromPubkey: wallet.publicKey, toPubkey: adminKeypair.publicKey, lamports: 0.05 * LAMPORTS_PER_SOL }),
    SystemProgram.transfer({ fromPubkey: wallet.publicKey, toPubkey: treasuryKeypair.publicKey, lamports: 0.02 * LAMPORTS_PER_SOL }),
    SystemProgram.transfer({ fromPubkey: wallet.publicKey, toPubkey: agent1Kp.publicKey, lamports: 0.05 * LAMPORTS_PER_SOL }),
    SystemProgram.transfer({ fromPubkey: wallet.publicKey, toPubkey: agent2Kp.publicKey, lamports: 0.05 * LAMPORTS_PER_SOL }),
    SystemProgram.transfer({ fromPubkey: wallet.publicKey, toPubkey: agent3Kp.publicKey, lamports: 0.05 * LAMPORTS_PER_SOL }),
    SystemProgram.transfer({ fromPubkey: wallet.publicKey, toPubkey: askerKp.publicKey, lamports: 0.15 * LAMPORTS_PER_SOL }),
  );
  const fundSig = await provider.sendAndConfirm(fundTx);
  console.log("Funded all wallets, TX:", fundSig.slice(0, 30) + "...\n");

  let passed = 0;
  let failed = 0;

  // ============================================
  // SETUP: Config PDA
  // ============================================
  const [configPda] = PublicKey.findProgramAddressSync([Buffer.from("config")], program.programId);
  let configExists = false;
  try { await program.account.config.fetch(configPda); configExists = true; } catch {}
  if (!configExists) {
    console.log("Creating Config PDA...");
    await program.methods.initConfig()
      .accounts({ config: configPda, admin: adminKeypair.publicKey, treasury: treasuryKeypair.publicKey, systemProgram: SystemProgram.programId } as any)
      .signers([adminKeypair]).rpc();
    console.log("Config created ✅\n");
  } else {
    console.log("Config exists, reusing ✅\n");
  }

  // ============================================
  // SETUP: Register 3 Agents with different reputations
  // ============================================
  console.log("Registering 3 agents...");
  const agents = [
    { kp: agent1Kp, name: "Oracle Alpha", rep: 0 },
    { kp: agent2Kp, name: "Skeptic Beta", rep: 0 },
    { kp: agent3Kp, name: "Signal Gamma", rep: 0 },
  ];

  const agentPdas: PublicKey[] = [];
  for (const [idx, agent] of agents.entries()) {
    const [agentPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("agent"), agent.kp.publicKey.toBuffer()],
      program.programId
    );
    agentPdas.push(agentPda);

    let exists = false;
    try { await program.account.agent.fetch(agentPda); exists = true; } catch {}

    if (!exists) {
      const personalityHash = new Array(32).fill(0);
      personalityHash[0] = idx + 1;
      await program.methods.registerAgent(agent.name, personalityHash as any)
        .accounts({ agent: agentPda, wallet: agent.kp.publicKey, config: configPda, systemProgram: SystemProgram.programId } as any)
        .signers([agent.kp]).rpc();
      console.log(`  ${agent.name} registered ✅`);
    } else {
      console.log(`  ${agent.name} exists, reusing ✅`);
    }
  }
  console.log("");

  // ============================================
  // SETUP: Create Question for testing
  // ============================================
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
    await program.methods.submitQuestion("Will ETH reach $10K in 2026?", "Crypto", new BN(deadline))
      .accounts({ question: questionPda, asker: askerKp.publicKey, config: configPda, treasury: treasuryKeypair.publicKey, systemProgram: SystemProgram.programId } as any)
      .signers([askerKp]).rpc();
    console.log(`Question submitted (id=${qid}) ✅\n`);
  } else {
    console.log(`Question exists (id=${qid}) ✅\n`);
  }

  // ============================================
  // PHASE 3: VRF Committee Selection
  // ============================================
  console.log("╔══════════════════════════════════════════════════╗");
  console.log("║     PHASE 3: VRF Committee Selection              ║");
  console.log("╚══════════════════════════════════════════════════╝\n");

  // TEST 3.1: select_committee
  console.log("TEST 3.1: select_committee (Pending → CommitteeSelected)");
  try {
    // Verify question is in Pending status
    const questionBefore = await program.account.question.fetch(questionPda);
    console.log("  Status before:", JSON.stringify(questionBefore.status));

    // Call select_committee with a client seed
    const clientSeed = 42;
    
    const tx = await program.methods
      .selectCommittee(clientSeed)
      .accounts({
        payer: wallet.publicKey,
        question: questionPda,
        oracleQueue: new PublicKey("Cuj97ggrhhidhbu39TijNVqE74xvKJ69gDervRUXAxGh"),
        programIdentity: (() => {
          const [pda] = PublicKey.findProgramAddressSync([Buffer.from("identity")], program.programId);
          return pda;
        })(),
        vrfProgram: new PublicKey("Vrf1RNUjXmQGjmQrQLvJHs9SNkvDJEsRVFPkfSQUwGz"),
        slotHashes: new PublicKey("SysvarS1otHashes111111111111111111111111111"),
        systemProgram: SystemProgram.programId,
      } as any)
      .rpc();

    console.log("  TX:", tx);

    const questionAfter = await program.account.question.fetch(questionPda);
    console.log("  Status after:", JSON.stringify(questionAfter.status));

    if (JSON.stringify(questionAfter.status) !== '{"committeeSelected":{}}') {
      throw new Error("Status not changed to CommitteeSelected");
    }

    console.log("  ✅ select_committee PASSED\n"); passed++;
  } catch (err: any) {
    console.log("  ❌ FAILED:", (err.message || JSON.stringify(err.error || err)).slice(0, 400), "\n"); failed++;
  }

  // TEST 3.2: Verify VRF callback can't be called by non-VRF program
  console.log("TEST 3.2: vrf_callback rejected without VRF program identity");
  try {
    const fakeRandomness = new Array(32).fill(0);
    await program.methods
      .vrfCallback(fakeRandomness as any)
      .accounts({
        vrfProgramIdentity: wallet.publicKey, // Wrong signer
        question: questionPda,
      } as any)
      .signers([walletKeypair])
      .rpc();

    console.log("  ❌ FAILED: Should have been rejected\n"); failed++;
  } catch (err: any) {
    console.log("  Correctly rejected ✅");
    console.log("  Error:", (err.message || JSON.stringify(err.error || err)).slice(0, 200));
    console.log("  ✅ vrf_callback access control PASSED\n"); passed++;
  }

  // ============================================
  // PHASE 4: Commit-Reveal Voting
  // ============================================
  console.log("╔══════════════════════════════════════════════════╗");
  console.log("║     PHASE 4: Commit-Reveal Voting                 ║");
  console.log("╚══════════════════════════════════════════════════╝\n");

  // TEST 4.1: commit_vote rejected for non-committee member
  console.log("TEST 4.1: commit_vote rejected for non-committee member");
  try {
    // Move question to CommitPhase manually
    await program.methods
      .updateQuestionStatus({ commitPhase: {} })
      .accounts({ question: questionPda, admin: adminKeypair.publicKey } as any)
      .signers([adminKeypair]).rpc();

    const vote = 0; // YES
    const salt = crypto.randomBytes(16);
    const round = 1;
    const hash = crypto.createHash("sha256")
      .update(Buffer.from([vote]))
      .update(salt)
      .update(new BN(qid).toArrayLike(Buffer, "le", 8))
      .update(Buffer.from([round]))
      .digest();

    const [voteCommitPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("vote_commit"), questionPda.toBuffer(), agent1Kp.publicKey.toBuffer()],
      program.programId
    );

    await program.methods
      .commitVote(Array.from(hash) as any)
      .accounts({
        question: questionPda,
        voteCommit: voteCommitPda,
        agentWallet: agent1Kp.publicKey,
        systemProgram: SystemProgram.programId,
      } as any)
      .signers([agent1Kp])
      .rpc();

    console.log("  ❌ FAILED: Should have been rejected (not committee member)\n"); failed++;
  } catch (err: any) {
    console.log("  Correctly rejected ✅");
    console.log("  Error:", (err.message || JSON.stringify(err.error || err)).slice(0, 200));
    console.log("  ✅ commit_vote access control PASSED\n"); passed++;
  }

  // TEST 4.2: Hash verification logic (off-chain)
  console.log("TEST 4.2: Hash computation verification (off-chain)");
  try {
    const vote = 1; // NO
    const salt = crypto.randomBytes(16);
    const round = 1;
    const questionIdBytes = new BN(qid).toArrayLike(Buffer, "le", 8);

    const hash = crypto.createHash("sha256")
      .update(Buffer.from([vote]))
      .update(salt)
      .update(questionIdBytes)
      .update(Buffer.from([round]))
      .digest();

    console.log("  Vote:", vote);
    console.log("  Salt:", salt.toString("hex").slice(0, 16) + "...");
    console.log("  Question ID bytes:", questionIdBytes.toString("hex"));
    console.log("  Round:", round);
    console.log("  Hash:", hash.toString("hex").slice(0, 32) + "...");
    console.log("  Hash length:", hash.length, "bytes");

    if (hash.length !== 32) throw new Error("Hash length must be 32 bytes");

    console.log("  ✅ Hash computation PASSED\n"); passed++;
  } catch (err: any) {
    console.log("  ❌ FAILED:", err.message, "\n"); failed++;
  }

  // TEST 4.3: resolve_question fails with 0 votes
  console.log("TEST 4.3: resolve_question fails with 0 votes");
  try {
    // Create a fresh question for this test
    const qid2 = (await program.account.config.fetch(configPda)).questionCounter.toNumber();
    const [question2Pda] = PublicKey.findProgramAddressSync(
      [Buffer.from("question"), new BN(qid2).toArrayLike(Buffer, "le", 8)],
      program.programId
    );

    const deadline2 = Math.floor(Date.now() / 1000) + 86400;
    await program.methods.submitQuestion("Test resolve question?", "Test", new BN(deadline2))
      .accounts({ question: question2Pda, asker: askerKp.publicKey, config: configPda, treasury: treasuryKeypair.publicKey, systemProgram: SystemProgram.programId } as any)
      .signers([askerKp]).rpc();

    // Move to RevealPhase
    await program.methods.updateQuestionStatus({ committeeSelected: {} })
      .accounts({ question: question2Pda, admin: adminKeypair.publicKey } as any)
      .signers([adminKeypair]).rpc();
    await program.methods.updateQuestionStatus({ commitPhase: {} })
      .accounts({ question: question2Pda, admin: adminKeypair.publicKey } as any)
      .signers([adminKeypair]).rpc();
    await program.methods.updateQuestionStatus({ revealPhase: {} })
      .accounts({ question: question2Pda, admin: adminKeypair.publicKey } as any)
      .signers([adminKeypair]).rpc();

    // Try to resolve with 0 votes
    await program.methods.resolveQuestion()
      .accounts({ question: question2Pda } as any)
      .rpc();

    console.log("  ❌ FAILED: Should have been rejected (0 votes)\n"); failed++;
  } catch (err: any) {
    console.log("  Correctly rejected ✅");
    console.log("  Error:", (err.message || JSON.stringify(err.error || err)).slice(0, 200));
    console.log("  ✅ resolve_question validation PASSED\n"); passed++;
  }

  // TEST 4.4: update_reputation works correctly
  console.log("TEST 4.4: update_reputation (+20, -10, clamp at 1000)");
  try {
    const agentBefore = await program.account.agent.fetch(agentPdas[0]);
    const repBefore = agentBefore.reputation.toNumber();
    console.log("  Reputation before:", repBefore);

    // +20
    await program.methods.updateReputation(20)
      .accounts({ agent: agentPdas[0], admin: adminKeypair.publicKey } as any)
      .signers([adminKeypair]).rpc();
    const after1 = await program.account.agent.fetch(agentPdas[0]);
    console.log("  After +20:", after1.reputation.toNumber());
    if (after1.reputation.toNumber() !== repBefore + 20) throw new Error("+20 failed");

    // -10
    await program.methods.updateReputation(-10)
      .accounts({ agent: agentPdas[0], admin: adminKeypair.publicKey } as any)
      .signers([adminKeypair]).rpc();
    const after2 = await program.account.agent.fetch(agentPdas[0]);
    console.log("  After -10:", after2.reputation.toNumber());
    if (after2.reputation.toNumber() !== repBefore + 10) throw new Error("-10 failed");

    // +9999 (should clamp at 1000)
    await program.methods.updateReputation(9999)
      .accounts({ agent: agentPdas[0], admin: adminKeypair.publicKey } as any)
      .signers([adminKeypair]).rpc();
    const after3 = await program.account.agent.fetch(agentPdas[0]);
    console.log("  After +9999 (clamped):", after3.reputation.toNumber());
    if (after3.reputation.toNumber() !== 1000) throw new Error("Clamp failed");

    console.log("  ✅ update_reputation PASSED\n"); passed++;
  } catch (err: any) {
    console.log("  ❌ FAILED:", (err.message || JSON.stringify(err.error || err)).slice(0, 300), "\n"); failed++;
  }

  // TEST 4.5: claim_reward fails for unresolved question
  console.log("TEST 4.5: claim_reward rejected for unresolved question");
  try {
    await program.methods.claimReward()
      .accounts({
        question: questionPda,
        agent: agentPdas[0],
        treasury: treasuryKeypair.publicKey,
        agentWallet: agent1Kp.publicKey,
      } as any)
      .signers([agent1Kp])
      .rpc();

    console.log("  ❌ FAILED: Should have been rejected (unresolved)\n"); failed++;
  } catch (err: any) {
    console.log("  Correctly rejected ✅");
    console.log("  Error:", (err.message || JSON.stringify(err.error || err)).slice(0, 200));
    console.log("  ✅ claim_reward validation PASSED\n"); passed++;
  }

  // ============================================
  // VRF CALLBACK SIMULATION (Best effort)
  // ============================================
  console.log("╔══════════════════════════════════════════════════╗");
  console.log("║     VRF CALLBACK (Async — May Not Trigger)         ║");
  console.log("╚══════════════════════════════════════════════════╝\n");

  console.log("Waiting 15s for VRF callback (if oracle is running)...");
  await new Promise(resolve => setTimeout(resolve, 15000));

  try {
    const questionAfterVrf = await program.account.question.fetch(questionPda);
    console.log("  Status after wait:", JSON.stringify(questionAfterVrf.status));
    console.log("  Committee:", questionAfterVrf.committee.map((c: any) => c.toBase58().slice(0, 20) + "..."));

    if (JSON.stringify(questionAfterVrf.status) === '{"commitPhase":{}}') {
      console.log("  ✅ VRF callback triggered! Committee selected.\n"); passed++;
    } else {
      console.log("  ℹ️  VRF callback not triggered (oracle may be offline)\n");
      // Don't count as pass or fail — this is infrastructure-dependent
    }
  } catch (err: any) {
    console.log("  Error checking status:", err.message.slice(0, 100), "\n");
  }

  // ---- SUMMARY ----
  console.log("\n╔══════════════════════════════════════════════════╗");
  console.log("║     PHASE 3 + 4 RESULTS                           ║");
  console.log("╠══════════════════════════════════════════════════╣");
  console.log(`  PASSED: ${passed}  |  FAILED: ${failed}`);
  console.log("╚══════════════════════════════════════════════════╝");

  const finalBal = await connection.getBalance(wallet.publicKey);
  console.log(`\nSOL used: ${(deployerBal - finalBal) / LAMPORTS_PER_SOL} SOL`);
  console.log(`Remaining: ${finalBal / LAMPORTS_PER_SOL} SOL`);

  if (failed > 0) process.exit(1);
}

main().catch(err => { console.error("FATAL:", err.message || JSON.stringify(err)); process.exit(1); });
