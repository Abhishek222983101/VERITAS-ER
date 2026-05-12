import { Connection, PublicKey } from "@solana/web3.js";

const ER_RPC = "https://devnet-as.magicblock.app";
const questionPda = new PublicKey("J1yPGfJKxQ1dCNbz5vYjTdqbZ6x1AqD7aLzj2y1q1q1"); // placeholder

async function main() {
  const erConnection = new Connection(ER_RPC, "confirmed");

  // Try to get account info from ER
  console.log("Testing ER account read...");
  try {
    const slot = await erConnection.getSlot();
    console.log("ER slot:", slot);

    // Try to get health
    const health = await erConnection.getHealth();
    console.log("ER health:", health);
  } catch (err: any) {
    console.log("ER connection error:", err.message);
  }
}

main().catch(console.error);
