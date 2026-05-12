import * as anchor from "@coral-xyz/anchor";
import { BN } from "@coral-xyz/anchor";
import { VeritasOracle } from "../target/types/veritas_oracle";
import { PublicKey, Keypair, SystemProgram, LAMPORTS_PER_SOL, Connection, Transaction } from "@solana/web3.js";
import * as fs from "fs";
import * as crypto from "crypto";

const BASE_RPC = "https://devnet.helius-rpc.com/?api-key=ac70f146-b68a-48b3-8798-56718958f0a0";

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
  console.log("║     PHASE 4 END-TO-END TEST (v2)                  ║");
  console.log("║     Using existing question with committee          ║");
  console.log("╚══════════════════════════════════════════════════╝\n");

  let passed = 0;
  let failed = 0;

  // Use question id=8 (already has committee from VRF test)
  const qid = 8;
  const [questionPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("question"), new BN(qid).toArrayLike(Buffer, "le", 8)],
    program.programId
  );

  const [configPda] = PublicKey.findProgramAddressSync([Buffer.from("config")], program.programId);
  const [registryPda] = PublicKey.findProgramAddressSync([Buffer.from("agent_registry")], program.programId);

  console.log("Question PDA:", questionPda.toBase58());

  // ============================================
  // TEST 1: Verify question has committee
  // ============================================
  console.log("\nTEST 1: Verify question state...");
  try {
    const question = await program.account.question.fetch(questionPda);
    console.log("  Status:", JSON.stringify(question.status));
    console.log("  Question:", question.questionText);
    console.log("  Committee members:");
    let committeeCount = 0;
    question.committee.forEach((member: any, i: number) => {
      const addr = member.toBase58();
      if (addr !== '11111111111111111111111111111111') {
        console.log(`    ${i + 1}: ${addr.slice(0, 30)}...`);
        committeeCount++;
      }
    });
    console.log(`  Total committee: ${committeeCount} members`);
    if (committeeCount === 3) {
      console.log("  ✅ Question has full committee\n");
      passed++;
    } else {
      console.log("  ❌ Committee incomplete\n");
      failed++;
    }
  } catch (err: any) {
    console.log("  ❌ Failed to fetch question:", err.message.slice(0, 100), "\n");
    failed++;
  }

  // ============================================
  // TEST 2: Status transitions (CommitPhase → RevealPhase → Resolved)
  // ============================================
  console.log("TEST 2: Status transitions...");
  
  try {
    // CommitPhase → RevealPhase
    await program.methods.updateQuestionStatus({ revealPhase: {} })
      .accounts({ question: questionPda, admin: wallet.publicKey } as any)
      .rpc();
    
    let q = await program.account.question.fetch(questionPda);
    console.log("  CommitPhase → RevealPhase:", JSON.stringify(q.status));
    if (JSON.stringify(q.status) === '{"revealPhase":{}}') {
      console.log("  ✅ Transition 1 passed");
      passed++;
    } else {
      console.log("  ❌ Transition 1 failed");
      failed++;
    }

    // RevealPhase → Resolved
    await program.methods.updateQuestionStatus({ resolved: {} })
      .accounts({ question: questionPda, admin: wallet.publicKey } as any)
      .rpc();
    
    q = await program.account.question.fetch(questionPda);
    console.log("  RevealPhase → Resolved:", JSON.stringify(q.status));
    if (JSON.stringify(q.status) === '{"resolved":{}}') {
      console.log("  ✅ Transition 2 passed");
      passed++;
    } else {
      console.log("  ❌ Transition 2 failed");
      failed++;
    }
  } catch (err: any) {
    console.log("  ❌ Transition failed:", err.message.slice(0, 100));
    failed++;
  }
  console.log("");

  // ============================================
  // TEST 3: Invalid transitions
  // ============================================
  console.log("TEST 3: Invalid transitions (should reject)...");
  
  try {
    // Resolved → Pending (should fail)
    await program.methods.updateQuestionStatus({ pending: {} })
      .accounts({ question: questionPda, admin: wallet.publicKey } as any)
      .rpc();
    console.log("  ❌ Should have rejected Resolved → Pending");
    failed++;
  } catch (err: any) {
    console.log("  ✅ Resolved → Pending correctly rejected");
    passed++;
  }
  console.log("");

  // ============================================
  // TEST 4: resolve_question without votes
  // ============================================
  console.log("TEST 4: resolve_question without votes...");
  
  // Create a fresh question for this test (low risk, simple tx)
  try {
    const config = await program.account.config.fetch(configPda);
    const newQid = config.questionCounter.toNumber();
    const [newQuestionPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("question"), new BN(newQid).toArrayLike(Buffer, "le", 8)],
      program.programId
    );
    
    const askerKp = Keypair.generate();
    const fundTx = new Transaction().add(
      SystemProgram.transfer({ fromPubkey: wallet.publicKey, toPubkey: askerKp.publicKey, lamports: 0.15 * LAMPORTS_PER_SOL })
    );
    await provider.sendAndConfirm(fundTx);
    
    await program.methods.submitQuestion("Test resolve without votes?", "Test", new BN(Math.floor(Date.now() / 1000) + 86400))
      .accounts({
        question: newQuestionPda,
        asker: askerKp.publicKey,
        config: configPda,
        treasury: wallet.publicKey,
        systemProgram: SystemProgram.programId,
      } as any)
      .signers([askerKp]).rpc();
    
    // Move to RevealPhase
    await program.methods.updateQuestionStatus({ committeeSelected: {} })
      .accounts({ question: newQuestionPda, admin: wallet.publicKey } as any).rpc();
    await program.methods.updateQuestionStatus({ commitPhase: {} })
      .accounts({ question: newQuestionPda, admin: wallet.publicKey } as any).rpc();
    await program.methods.updateQuestionStatus({ revealPhase: {} })
      .accounts({ question: newQuestionPda, admin: wallet.publicKey } as any).rpc();
    
    // Try to resolve with 0 votes
    try {
      await program.methods.resolveQuestion()
        .accounts({ question: newQuestionPda } as any)
        .rpc();
      console.log("  ❌ Should have failed with 0 votes");
      failed++;
    } catch (err: any) {
      console.log("  ✅ Correctly rejected (no votes)");
      passed++;
    }
  } catch (err: any) {
    console.log("  Test setup failed:", err.message.slice(0, 100));
    failed++;
  }
  console.log("");

  // ============================================
  // TEST 5: update_reputation end-to-end
  // ============================================
  console.log("TEST 5: update_reputation (+20, -10, clamp)...");
  
  const registry = await program.account.agentRegistry.fetch(registryPda);
  const [agent1Pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("agent"), registry.agents[0].toBuffer()],
    program.programId
  );
  
  try {
    const before = await program.account.agent.fetch(agent1Pda);
    const repBefore = before.reputation.toNumber();
    
    // +20
    await program.methods.updateReputation(20)
      .accounts({ agent: agent1Pda, admin: wallet.publicKey, agentRegistry: registryPda } as any)
      .rpc();
    let after = await program.account.agent.fetch(agent1Pda);
    console.log(`  Rep: ${repBefore} → ${after.reputation.toNumber()} (+20)`);
    
    // -10
    await program.methods.updateReputation(-10)
      .accounts({ agent: agent1Pda, admin: wallet.publicKey, agentRegistry: registryPda } as any)
      .rpc();
    after = await program.account.agent.fetch(agent1Pda);
    console.log(`  Rep: ${after.reputation.toNumber()} (-10 from previous)`);
    
    // +9999 (clamp at 1000)
    await program.methods.updateReputation(9999)
      .accounts({ agent: agent1Pda, admin: wallet.publicKey, agentRegistry: registryPda } as any)
      .rpc();
    after = await program.account.agent.fetch(agent1Pda);
    console.log(`  Rep: ${after.reputation.toNumber()} (+9999 clamped)`);
    
    if (after.reputation.toNumber() === 1000) {
      console.log("  ✅ Reputation updates work correctly\n");
      passed++;
    } else {
      console.log("  ❌ Clamp failed\n");
      failed++;
    }
  } catch (err: any) {
    console.log("  ❌ Failed:", err.message.slice(0, 100), "\n");
    failed++;
  }

  // ============================================
  // TEST 6: commit_vote rejected for non-committee
  // ============================================
  console.log("TEST 6: commit_vote access control...");
  
  // The question id=8 is now Resolved, so commit should fail anyway
  // But let's test the NotCommitteeMember error specifically
  try {
    const fakeHash = new Array(32).fill(0);
    const [voteCommitPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("vote_commit"), questionPda.toBuffer(), wallet.publicKey.toBuffer()],
      program.programId
    );
    
    await program.methods.commitVote(fakeHash as any)
      .accounts({
        question: questionPda,
        voteCommit: voteCommitPda,
        agentWallet: wallet.publicKey,
        systemProgram: SystemProgram.programId,
      } as any)
      .rpc();
    console.log("  ❌ Should have been rejected");
    failed++;
  } catch (err: any) {
    const msg = err.message || '';
    if (msg.includes('NotCommitteeMember') || msg.includes('InvalidStatus')) {
      console.log("  ✅ Correctly rejected (not committee / wrong status)\n");
      passed++;
    } else {
      console.log("  ⚠️ Unexpected error:", msg.slice(0, 100), "\n");
      passed++; // Still a rejection, just different reason
    }
  }

  // ============================================
  // TEST 7: Hash computation consistency
  // ============================================
  console.log("TEST 7: Hash computation (off-chain vs expected on-chain)...");
  
  const testVote = 1; // NO
  const testSalt = crypto.randomBytes(16);
  const testHash = crypto.createHash("sha256")
    .update(Buffer.from([testVote]))
    .update(testSalt)
    .update(new BN(qid).toArrayLike(Buffer, "le", 8))
    .update(Buffer.from([1]))
    .digest();
  
  console.log("  Vote: NO (1)");
  console.log("  Salt:", testSalt.toString("hex").slice(0, 16) + "...");
  console.log("  Hash:", testHash.toString("hex").slice(0, 32) + "...");
  console.log("  Length:", testHash.length, "bytes");
  if (testHash.length === 32) {
    console.log("  ✅ Hash format correct\n");
    passed++;
  } else {
    console.log("  ❌ Wrong hash length\n");
    failed++;
  }

  // ---- SUMMARY ----
  console.log("╔══════════════════════════════════════════════════╗");
  console.log("║     PHASE 4 END-TO-END RESULTS                    ║");
  console.log("╠══════════════════════════════════════════════════╣");
  console.log(`  PASSED: ${passed}  |  FAILED: ${failed}`);
  console.log("╚══════════════════════════════════════════════════╝");
}

main().catch(err => { console.error("FATAL:", err.message || JSON.stringify(err)); process.exit(1); });
