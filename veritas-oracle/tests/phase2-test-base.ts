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

  // Use question_id=2 (from previous test) and reuse existing accounts
  const qid = 2;
  const [questionPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("question"), new BN(qid).toArrayLike(Buffer, "le", 8)],
    program.programId
  );

  console.log("Testing commit_and_undelegate_question on BASE LAYER...");
  try {
    const tx = await program.methods
      .commitAndUndelegateQuestion()
      .accounts({
        payer: wallet.publicKey,
        question: questionPda,
        magicContext: new PublicKey("MagicContext1111111111111111111111111111111"),
        magicProgram: new PublicKey("Magic11111111111111111111111111111111111111"),
      } as any)
      .rpc();
    console.log("TX:", tx);
    console.log("SUCCESS ✅");
  } catch (err: any) {
    console.log("FAILED:", err.message?.slice(0, 300));
  }
}

main().catch(console.error);
