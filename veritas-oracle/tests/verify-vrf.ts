import * as anchor from "@coral-xyz/anchor";
import { BN } from "@coral-xyz/anchor";
import { VeritasOracle } from "../target/types/veritas_oracle";
import { PublicKey, Keypair, LAMPORTS_PER_SOL, Connection } from "@solana/web3.js";
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

  // Check question id=7 status and committee
  const qid = 7;
  const [questionPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("question"), new BN(qid).toArrayLike(Buffer, "le", 8)],
    program.programId
  );

  console.log("Checking Question PDA:", questionPda.toBase58());
  
  try {
    const question = await program.account.question.fetch(questionPda);
    console.log("\n=== QUESTION STATUS ===");
    console.log("Status:", JSON.stringify(question.status));
    console.log("Question:", question.questionText);
    console.log("\n=== COMMITTEE SELECTED ===");
    question.committee.forEach((member: any, i: number) => {
      const addr = member.toBase58();
      console.log(`Member ${i + 1}: ${addr === '11111111111111111111111111111111' ? 'NOT SET (default pubkey)' : addr}`);
    });
    
    if (question.committee[0].toBase58() !== '11111111111111111111111111111111') {
      console.log("\n✅ VRF COMMITTEE SUCCESSFULLY SELECTED!");
    }
  } catch (err: any) {
    console.log("Error fetching question:", err.message);
  }
}

main().catch(console.error);
