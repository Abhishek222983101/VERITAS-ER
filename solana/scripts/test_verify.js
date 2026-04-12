const anchor = require("@coral-xyz/anchor");
const { Keypair, PublicKey, SystemProgram } = require("@solana/web3.js");

async function main() {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.diveIdentity;
  
  const dummyUser = Keypair.generate();
  
  const [configPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("dive_config")],
    program.programId
  );
  
  const [attestationPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("dive_human"), dummyUser.publicKey.toBuffer()],
    program.programId
  );
  
  const providerHash = new Uint8Array(32).fill(1);
  const reclaimProofHash = new Uint8Array(32).fill(2);
  const stableIdHash = new Uint8Array(32).fill(3);
  const expiresAt = Math.floor(Date.now() / 1000) + 86400;

  try {
    await program.methods
      .verifyHuman(
        Array.from(providerHash),
        Array.from(reclaimProofHash),
        Array.from(stableIdHash),
        new anchor.BN(expiresAt)
      )
      .accounts({
        issuer: dummyUser.publicKey,
        config: configPda,
        wallet: dummyUser.publicKey,
        humanAttestation: attestationPda,
        systemProgram: SystemProgram.programId,
      })
      .signers([dummyUser])
      .rpc();
  } catch (err) {
    console.log("Error caught:");
    console.log(err.message);
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
