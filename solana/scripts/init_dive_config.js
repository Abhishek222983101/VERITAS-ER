const anchor = require("@coral-xyz/anchor");
const { PublicKey, SystemProgram } = require("@solana/web3.js");

async function main() {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.diveIdentity;
  const wallet = provider.wallet;

  console.log("Wallet:", wallet.publicKey.toBase58());
  console.log("Program ID:", program.programId.toBase58());

  const [configPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("dive_config")],
    program.programId
  );
  
  console.log("Config PDA:", configPda.toBase58());

  try {
    const configData = await program.account.globalConfig.fetch(configPda);
    console.log("dive_config is already initialized.");
    console.log("Authority:", configData.authority.toBase58());
    console.log("Authorized Issuer:", configData.authorizedIssuer.toBase58());
  } catch (err) {
    console.log("dive_config not found or error fetching. Initializing...");
    try {
      const tx = await program.methods
        .initialize(wallet.publicKey)
        .accounts({
          authority: wallet.publicKey,
          config: configPda,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
      console.log("Initialized config with TX:", tx);
    } catch (e) {
      console.error("Failed to initialize:", e);
    }
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
