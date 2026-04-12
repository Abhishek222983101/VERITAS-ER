const anchor = require("@coral-xyz/anchor");
const { Program } = require("@coral-xyz/anchor");
const {
  Keypair, PublicKey, SystemProgram, LAMPORTS_PER_SOL,
} = require("@solana/web3.js");
const {
  getAssociatedTokenAddressSync, TOKEN_PROGRAM_ID,
} = require("@solana/spl-token");
const { expect } = require("chai");

describe("dive_market", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.diveMarket;
  const identityProgram = anchor.workspace.diveIdentity;
  const wallet = provider.wallet;
  const questionHash = new Uint8Array(32).fill(9);

  let marketPda, vaultPda, yesMintPda, noMintPda;
  let bettor;
  let attestationPda;
  let configPda;
  let issuerKeypair;

  before(async () => {
    [marketPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("dive_market"), questionHash],
      program.programId
    );
    [vaultPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("dive_vault"), marketPda.toBuffer()],
      program.programId
    );
    [yesMintPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("dive_yes_mint"), marketPda.toBuffer()],
      program.programId
    );
    [noMintPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("dive_no_mint"), marketPda.toBuffer()],
      program.programId
    );

    // Setup Identity
    issuerKeypair = provider.wallet.payer;
    bettor = Keypair.generate();

    const sig1 = await provider.connection.requestAirdrop(issuerKeypair.publicKey, 2 * LAMPORTS_PER_SOL);
    await provider.connection.confirmTransaction(sig1, "confirmed");
    const sig2 = await provider.connection.requestAirdrop(bettor.publicKey, 5 * LAMPORTS_PER_SOL);
    await provider.connection.confirmTransaction(sig2, "confirmed");

    [configPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("dive_config")],
      identityProgram.programId
    );

    try {
        await identityProgram.methods
        .initialize(issuerKeypair.publicKey)
        .accounts({
            authority: wallet.publicKey,
            config: configPda,
            systemProgram: SystemProgram.programId,
        })
        .rpc();
    } catch(e) {}

    [attestationPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("dive_human"), bettor.publicKey.toBuffer()],
      identityProgram.programId
    );

    const providerHash = new Uint8Array(32).fill(1);
    const reclaimProofHash = new Uint8Array(32).fill(2);
    const stableIdHash = new Uint8Array(32).fill(3);
    const expiresAt = Math.floor(Date.now() / 1000) + 86400;

    try {
        await identityProgram.methods
        .verifyHuman(
            Array.from(providerHash),
            Array.from(reclaimProofHash),
            Array.from(stableIdHash),
            new anchor.BN(expiresAt)
        )
        .accounts({
            issuer: issuerKeypair.publicKey,
            config: configPda,
            wallet: bettor.publicKey,
            humanAttestation: attestationPda,
            systemProgram: SystemProgram.programId,
        })
        .signers([issuerKeypair])
        .rpc();
    } catch(e) {}
  });

  it("Initializes a market", async () => {
    const deadlineTs = Math.floor(Date.now() / 1000) + 86400;
    const oracleAuthority = Keypair.generate().publicKey;

    await program.methods
      .initializeMarket(
        Array.from(questionHash),
        "Will it rain tomorrow?",
        ["Yes", "No"],
        new anchor.BN(deadlineTs),
        new anchor.BN(LAMPORTS_PER_SOL),
        oracleAuthority
      )
      .accounts({
        authority: wallet.publicKey,
        market: marketPda,
        vault: vaultPda,
        yesMint: yesMintPda,
        noMint: noMintPda,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const market = await program.account.market.fetch(marketPda);
    expect(market.question).to.eq("Will it rain tomorrow?");
  });

  it("Places a bet on Yes", async () => {
    const ataIx = await (
      await require("@solana/spl-token").getOrCreateAssociatedTokenAccount(
        provider.connection,
        bettor,
        yesMintPda,
        bettor.publicKey
      )
    ).address;

    await program.methods
        .placeBet({ yes: {} }, new anchor.BN(LAMPORTS_PER_SOL))
        .accounts({
            bettor: bettor.publicKey,
            humanAttestation: attestationPda,
            market: marketPda,
            vault: vaultPda,
            yesMint: yesMintPda,
            noMint: noMintPda,
            userTokenAccount: ataIx,
            tokenProgram: TOKEN_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
        })
        .signers([bettor])
        .rpc();
  });
});
