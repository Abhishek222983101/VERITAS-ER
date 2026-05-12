const { Connection } = require("@solana/web3.js");

const ER_RPC = "https://devnet-as.magicblock.app";

async function main() {
  const erConnection = new Connection(ER_RPC, "confirmed");

  try {
    const slot = await erConnection.getSlot();
    console.log("ER slot:", slot);

    const health = await erConnection.getHealth();
    console.log("ER health:", health);

    const version = await erConnection.getVersion();
    console.log("ER version:", version);
  } catch (err) {
    console.log("ER error:", err.message);
  }
}

main().catch(console.error);
