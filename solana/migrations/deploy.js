const anchor = require("@coral-xyz/anchor");

module.exports = async function (provider) {
  anchor.setProvider(provider);

  const diveIdentity = anchor.workspace.diveIdentity;
  const diveOracle = anchor.workspace.diveOracle;
  const diveMarket = anchor.workspace.diveMarket;

  console.log("DIVE-Solana deployment complete.");
  console.log("  dive_identity:", diveIdentity.programId.toBase58());
  console.log("  dive_oracle:   ", diveOracle.programId.toBase58());
  console.log("  dive_market:   ", diveMarket.programId.toBase58());
};
