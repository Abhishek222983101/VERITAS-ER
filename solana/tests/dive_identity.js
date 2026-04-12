const anchor = require("@coral-xyz/anchor");
const { Program } = require("@coral-xyz/anchor");
const { Keypair, PublicKey, SystemProgram, LAMPORTS_PER_SOL } = require("@solana/web3.js");
const { expect } = require("chai");

describe("dive_identity", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.diveIdentity;
  const wallet = provider.wallet;

  let issuerKeypair;
  let subjectKeypair;
  let configPda;

  before(async () => {
    issuerKeypair = provider.wallet.payer;
    subjectKeypair = Keypair.generate();
    const sig1 = await provider.connection.requestAirdrop(issuerKeypair.publicKey, 2 * LAMPORTS_PER_SOL);
    await provider.connection.confirmTransaction(sig1, "confirmed");

    const sig2 = await provider.connection.requestAirdrop(wallet.publicKey, 2 * LAMPORTS_PER_SOL);
    await provider.connection.confirmTransaction(sig2, "confirmed");

    [configPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("dive_config")],
      program.programId
    );

    await program.methods
      .initialize(issuerKeypair.publicKey)
      .accounts({
        authority: wallet.publicKey,
        config: configPda,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
  });

  function getAttestationPda(walletPk) {
    return PublicKey.findProgramAddressSync(
      [Buffer.from("dive_human"), walletPk.toBuffer()],
      program.programId
    );
  }

  it("Verifies a human with reclaim proof", async () => {
    const [attestationPda] = getAttestationPda(subjectKeypair.publicKey);
    const providerHash = new Uint8Array(32).fill(1);
    const reclaimProofHash = new Uint8Array(32).fill(2);
    const stableIdHash = new Uint8Array(32).fill(3);
    const expiresAt = Math.floor(Date.now() / 1000) + 86400;

    await program.methods
      .verifyHuman(
        Array.from(providerHash),
        Array.from(reclaimProofHash),
        Array.from(stableIdHash),
        new anchor.BN(expiresAt)
      )
      .accounts({
        issuer: issuerKeypair.publicKey,
        config: configPda,
        wallet: subjectKeypair.publicKey,
        humanAttestation: attestationPda,
        systemProgram: SystemProgram.programId,
      })
      .signers([issuerKeypair])
      .rpc();

    const attestation = await program.account.humanAttestation.fetch(attestationPda);
    expect(attestation.issuer.toBase58()).to.eq(issuerKeypair.publicKey.toBase58());
    expect(attestation.revoked).to.eq(false);
  });

  it("Checks that a verified human passes", async () => {
    const [attestationPda] = getAttestationPda(subjectKeypair.publicKey);

    await program.methods
      .checkHuman()
      .accounts({
        wallet: subjectKeypair.publicKey,
        humanAttestation: attestationPda,
      })
      .rpc();
  });

  it("Revokes an attestation", async () => {
    const [attestationPda] = getAttestationPda(subjectKeypair.publicKey);

    await program.methods
      .revokeAttestation()
      .accounts({
        issuer: issuerKeypair.publicKey,
        wallet: subjectKeypair.publicKey,
        humanAttestation: attestationPda,
      })
      .signers([issuerKeypair])
      .rpc();

    const attestation = await program.account.humanAttestation.fetch(attestationPda);
    expect(attestation.revoked).to.eq(true);
  });

  it("Fails to check a revoked attestation", async () => {
    const [attestationPda] = getAttestationPda(subjectKeypair.publicKey);
    try {
      await program.methods
        .checkHuman()
        .accounts({
          wallet: subjectKeypair.publicKey,
          humanAttestation: attestationPda,
        })
        .rpc();
      expect.fail("Should have thrown");
    } catch (err) {
      expect(err.toString()).to.include("AttestationRevoked");
    }
  });
});
