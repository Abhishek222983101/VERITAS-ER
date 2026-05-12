import * as anchor from "@coral-xyz/anchor";
import { BN } from "@coral-xyz/anchor";
import { VeritasOracle } from "../target/types/veritas_oracle";
import { PublicKey, Keypair, SystemProgram, LAMPORTS_PER_SOL, Connection } from "@solana/web3.js";
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

  console.log("Verifying AgentRegistry and testing select_committee...\n");

  const [registryPda] = PublicKey.findProgramAddressSync([Buffer.from("agent_registry")], program.programId);
  const [configPda] = PublicKey.findProgramAddressSync([Buffer.from("config")], program.programId);

  // Retry fetch with backoff
  let retries = 3;
  while (retries > 0) {
    try {
      const registry = await program.account.agentRegistry.fetch(registryPda);
      console.log("✅ AgentRegistry found!");
      console.log("  Count:", registry.count);
      console.log("  Agents:");
      for (let i = 0; i < Math.min(registry.count, 5); i++) {
        console.log(`    ${i + 1}. ${registry.agents[i].toBase58().slice(0, 25)}... (rep: ${registry.reputations[i]})`);
      }
      break;
    } catch (err: any) {
      retries--;
      if (retries === 0) {
        console.log("❌ Failed to fetch registry:", err.message.slice(0, 100));
        return;
      }
      console.log("Retrying...", retries, "attempts left");
      await new Promise(r => setTimeout(r, 3000));
    }
  }

  // Find latest question
  const config = await program.account.config.fetch(configPda);
  const qid = config.questionCounter.toNumber() - 1;
  const [questionPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("question"), new BN(qid).toArrayLike(Buffer, "le", 8)],
    program.programId
  );

  console.log("\nTesting select_committee on question id=" + qid + "...");
  try {
    const tx = await program.methods.selectCommittee(99)
      .accounts({
        payer: wallet.publicKey,
        question: questionPda,
        oracleQueue: new PublicKey("Cuj97ggrhhidhbu39TijNVqE74xvKJ69gDervRUXAxGh"),
        agentRegistry: registryPda,
      } as any)
      .rpc();
    console.log("✅ select_committee TX:", tx.slice(0, 40) + "...");
  } catch (err: any) {
    console.log("❌ select_committee failed:", (err.message || JSON.stringify(err.error || err)).slice(0, 200));
  }
}

main().catch(console.error);
