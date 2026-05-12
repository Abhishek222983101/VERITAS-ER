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
  console.log("║     FULL VRF FLOW TEST — Fresh Question            ║");
  console.log("╚══════════════════════════════════════════════════╝\n");

  const askerKp = Keypair.generate();
  const fundTx = new Transaction().add(
    SystemProgram.transfer({ fromPubkey: wallet.publicKey, toPubkey: askerKp.publicKey, lamports: 0.15 * LAMPORTS_PER_SOL })
  );
  await provider.sendAndConfirm(fundTx);

  const [configPda] = PublicKey.findProgramAddressSync([Buffer.from("config")], program.programId);
  const [registryPda] = PublicKey.findProgramAddressSync([Buffer.from("agent_registry")], program.programId);

  const config = await program.account.config.fetch(configPda);
  const qid = config.questionCounter.toNumber();
  const [questionPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("question"), new BN(qid).toArrayLike(Buffer, "le", 8)],
    program.programId
  );

  console.log("Creating fresh question (id=" + qid + ")...");
  const deadline = Math.floor(Date.now() / 1000) + 86400;
  await program.methods.submitQuestion("Will BTC hit $200K by 2027?", "Crypto", new BN(deadline))
    .accounts({
      question: questionPda,
      asker: askerKp.publicKey,
      config: configPda,
      treasury: wallet.publicKey, // use deployer as treasury for simplicity
      systemProgram: SystemProgram.programId,
    } as any)
    .signers([askerKp]).rpc();
  console.log("✅ Question submitted\n");

  console.log("Calling select_committee...");
  const tx = await program.methods.selectCommittee(123)
    .accounts({
      payer: wallet.publicKey,
      question: questionPda,
      oracleQueue: new PublicKey("Cuj97ggrhhidhbu39TijNVqE74xvKJ69gDervRUXAxGh"),
      agentRegistry: registryPda,
    } as any)
    .rpc();
  console.log("✅ select_committee TX:", tx.slice(0, 40) + "...\n");

  console.log("Waiting 25s for VRF callback...");
  await new Promise(resolve => setTimeout(resolve, 25000));

  const question = await program.account.question.fetch(questionPda);
  console.log("Status:", JSON.stringify(question.status));
  console.log("\nCommittee:");
  let committeeSet = false;
  question.committee.forEach((member: any, i: number) => {
    const addr = member.toBase58();
    if (addr !== '11111111111111111111111111111111') {
      console.log(`  Member ${i + 1}: ${addr}`);
      committeeSet = true;
    } else {
      console.log(`  Member ${i + 1}: NOT SET`);
    }
  });

  if (JSON.stringify(question.status) === '{"commitPhase":{}}' && committeeSet) {
    console.log("\n✅✅✅ SUCCESS! VRF callback selected committee! ✅✅✅");
  } else if (JSON.stringify(question.status) === '{"commitPhase":{}}') {
    console.log("\n⚠️ Callback fired but committee empty — check logs");
  } else {
    console.log("\n⏳ Status:", JSON.stringify(question.status), "— callback may still be pending");
  }
}

main().catch(console.error);
