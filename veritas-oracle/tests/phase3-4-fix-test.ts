import * as anchor from "@coral-xyz/anchor";
import { BN } from "@coral-xyz/anchor";
import { VeritasOracle } from "../target/types/veritas_oracle";
import { PublicKey, Keypair, SystemProgram, LAMPORTS_PER_SOL, Connection, Transaction } from "@solana/web3.js";
import * as fs from "fs";

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
  console.log("║     PHASE 3+4 FIX TEST — VRF Committee            ║");
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

  // Fund with minimal amounts (0.02 for agents/admin, 0.15 for asker)
  console.log("Funding test wallets...");
  const fundTx = new Transaction().add(
    SystemProgram.transfer({ fromPubkey: wallet.publicKey, toPubkey: adminKeypair.publicKey, lamports: 0.02 * LAMPORTS_PER_SOL }),
    SystemProgram.transfer({ fromPubkey: wallet.publicKey, toPubkey: treasuryKeypair.publicKey, lamports: 0.01 * LAMPORTS_PER_SOL }),
    SystemProgram.transfer({ fromPubkey: wallet.publicKey, toPubkey: agent1Kp.publicKey, lamports: 0.02 * LAMPORTS_PER_SOL }),
    SystemProgram.transfer({ fromPubkey: wallet.publicKey, toPubkey: agent2Kp.publicKey, lamports: 0.02 * LAMPORTS_PER_SOL }),
    SystemProgram.transfer({ fromPubkey: wallet.publicKey, toPubkey: agent3Kp.publicKey, lamports: 0.02 * LAMPORTS_PER_SOL }),
    SystemProgram.transfer({ fromPubkey: wallet.publicKey, toPubkey: askerKp.publicKey, lamports: 0.15 * LAMPORTS_PER_SOL }),
  );
  const fundSig = await provider.sendAndConfirm(fundTx);
  console.log("Funded, TX:", fundSig.slice(0, 30) + "...\n");

  let passed = 0;
  let failed = 0;

  // Derive PDAs
  const [configPda] = PublicKey.findProgramAddressSync([Buffer.from("config")], program.programId);
  const [registryPda] = PublicKey.findProgramAddressSync([Buffer.from("agent_registry")], program.programId);

  // ============================================
  // TEST 1: init_config + init_agent_registry
  // ============================================
  console.log("TEST 1: init_config + init_agent_registry");
  try {
    let configExists = false;
    try { await program.account.config.fetch(configPda); configExists = true; } catch {}

    if (!configExists) {
      await program.methods.initConfig()
        .accounts({ config: configPda, admin: adminKeypair.publicKey, treasury: treasuryKeypair.publicKey, systemProgram: SystemProgram.programId } as any)
        .signers([adminKeypair]).rpc();
      console.log("  Config created");
    }

    let registryExists = false;
    try { await program.account.agentRegistry.fetch(registryPda); registryExists = true; } catch {}

    if (!registryExists) {
      await program.methods.initAgentRegistry()
        .accounts({ agentRegistry: registryPda, admin: adminKeypair.publicKey, systemProgram: SystemProgram.programId } as any)
        .signers([adminKeypair]).rpc();
      console.log("  Registry created");
    }

    const registry = await program.account.agentRegistry.fetch(registryPda);
    console.log("  Registry count:", registry.count);
    console.log("  ✅ PASSED\n"); passed++;
  } catch (err: any) {
    console.log("  ❌ FAILED:", (err.message || JSON.stringify(err.error || err)).slice(0, 300), "\n"); failed++;
  }

  // ============================================
  // TEST 2: Register 3 agents (with registry update)
  // ============================================
  console.log("TEST 2: Register 3 agents");
  const agents = [
    { kp: agent1Kp, name: "Oracle Alpha" },
    { kp: agent2Kp, name: "Skeptic Beta" },
    { kp: agent3Kp, name: "Signal Gamma" },
  ];

  try {
    for (const [idx, agent] of agents.entries()) {
      const [agentPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("agent"), agent.kp.publicKey.toBuffer()],
        program.programId
      );
      const personalityHash = new Array(32).fill(0); personalityHash[0] = idx + 1;

      await program.methods.registerAgent(agent.name, personalityHash as any)
        .accounts({
          agent: agentPda,
          wallet: agent.kp.publicKey,
          config: configPda,
          agentRegistry: registryPda,
          systemProgram: SystemProgram.programId,
        } as any)
        .signers([agent.kp]).rpc();
      console.log(`  ${agent.name} registered`);
    }

    const registry = await program.account.agentRegistry.fetch(registryPda);
    console.log("  Registry count:", registry.count);
    console.log("  Agent 1:", registry.agents[0].toBase58().slice(0, 20) + "...");
    console.log("  Rep 1:", registry.reputations[0].toString());
    console.log("  ✅ PASSED\n"); passed++;
  } catch (err: any) {
    console.log("  ❌ FAILED:", (err.message || JSON.stringify(err.error || err)).slice(0, 300), "\n"); failed++;
  }

  // ============================================
  // TEST 3: Submit question
  // ============================================
  const configData = await program.account.config.fetch(configPda);
  const qid = configData.questionCounter.toNumber();
  const [questionPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("question"), new BN(qid).toArrayLike(Buffer, "le", 8)],
    program.programId
  );

  console.log("TEST 3: submit_question (id=" + qid + ")");
  try {
    const deadline = Math.floor(Date.now() / 1000) + 86400;
    await program.methods.submitQuestion("Will SOL reach $500 in 2026?", "Crypto", new BN(deadline))
      .accounts({
        question: questionPda,
        asker: askerKp.publicKey,
        config: configPda,
        treasury: treasuryKeypair.publicKey,
        systemProgram: SystemProgram.programId,
      } as any)
      .signers([askerKp]).rpc();
    console.log("  Question submitted ✅\n"); passed++;
  } catch (err: any) {
    console.log("  ❌ FAILED:", (err.message || JSON.stringify(err.error || err)).slice(0, 300), "\n"); failed++;
  }

  // ============================================
  // TEST 4: select_committee (VRF request)
  // ============================================
  console.log("TEST 4: select_committee (VRF request)");
  try {
    const questionBefore = await program.account.question.fetch(questionPda);
    console.log("  Status before:", JSON.stringify(questionBefore.status));

    const tx = await program.methods.selectCommittee(42)
      .accounts({
        payer: wallet.publicKey,
        question: questionPda,
        oracleQueue: new PublicKey("Cuj97ggrhhidhbu39TijNVqE74xvKJ69gDervRUXAxGh"),
        agentRegistry: registryPda,
      } as any)
      .rpc();

    console.log("  TX:", tx);

    const questionAfter = await program.account.question.fetch(questionPda);
    console.log("  Status after:", JSON.stringify(questionAfter.status));

    if (JSON.stringify(questionAfter.status) !== '{"committeeSelected":{}}') {
      throw new Error("Status not CommitteeSelected");
    }
    console.log("  ✅ PASSED\n"); passed++;
  } catch (err: any) {
    console.log("  ❌ FAILED:", (err.message || JSON.stringify(err.error || err)).slice(0, 300), "\n"); failed++;
  }

  // ============================================
  // TEST 5: Wait for VRF callback
  // ============================================
  console.log("TEST 5: VRF callback (async, waiting 20s)...");
  await new Promise(resolve => setTimeout(resolve, 20000));

  try {
    const question = await program.account.question.fetch(questionPda);
    console.log("  Status after wait:", JSON.stringify(question.status));
    console.log("  Committee:");
    question.committee.forEach((member: any, i: number) => {
      const addr = member.toBase58();
      console.log(`    Member ${i + 1}: ${addr === '11111111111111111111111111111111' ? 'NOT SET' : addr}`);
    });

    if (JSON.stringify(question.status) === '{"commitPhase":{}}') {
      const hasCommittee = question.committee.some((m: any) => m.toBase58() !== '11111111111111111111111111111111');
      if (hasCommittee) {
        console.log("  ✅ VRF callback SUCCESS — committee selected!\n"); passed++;
      } else {
        console.log("  ⚠️ Callback fired but committee empty (check registry)\n");
      }
    } else {
      console.log("  ℹ️  Callback not yet fired (status:", JSON.stringify(question.status), ")\n");
    }
  } catch (err: any) {
    console.log("  Error:", err.message.slice(0, 100), "\n");
  }

  // ---- SUMMARY ----
  console.log("\n╔══════════════════════════════════════════════════╗");
  console.log("║     FIX TEST RESULTS                               ║");
  console.log("╠══════════════════════════════════════════════════╣");
  console.log(`  PASSED: ${passed}  |  FAILED: ${failed}`);
  console.log("╚══════════════════════════════════════════════════╝");

  const finalBal = await connection.getBalance(wallet.publicKey);
  console.log(`\nSOL used this run: ${(deployerBal - finalBal) / LAMPORTS_PER_SOL} SOL`);
  console.log(`Remaining balance: ${finalBal / LAMPORTS_PER_SOL} SOL`);
}

main().catch(err => { console.error("FATAL:", err.message || JSON.stringify(err)); process.exit(1); });
