const anchor = require("@coral-xyz/anchor");
const { Program } = require("@coral-xyz/anchor");
const { Keypair, PublicKey, SystemProgram, LAMPORTS_PER_SOL } = require("@solana/web3.js");
const { expect } = require("chai");

describe("dive_oracle", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.diveOracle;
  const identityProgram = anchor.workspace.diveIdentity;
  const wallet = provider.wallet;

  let agentPda, sessionPda, configPda, attestationPda, issuerKeypair;

  before(async () => {
    // Setup Identity
    issuerKeypair = provider.wallet.payer;
    const sig1 = await provider.connection.requestAirdrop(issuerKeypair.publicKey, 2 * LAMPORTS_PER_SOL);
    await provider.connection.confirmTransaction(sig1, "confirmed");

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
      [Buffer.from("dive_human"), wallet.publicKey.toBuffer()],
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
          wallet: wallet.publicKey,
          humanAttestation: attestationPda,
          systemProgram: SystemProgram.programId,
        })
        .signers([issuerKeypair])
        .rpc();
    } catch(e) {}
  });

  it("Registers an agent", async () => {
    [agentPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("dive_agent"), wallet.publicKey.toBuffer()],
      program.programId
    );

    const personalityHash = new Uint8Array(32).fill(7);

    await program.methods
      .registerAgent("SignalGamma", Array.from(personalityHash))
      .accounts({
        authority: wallet.publicKey,
        humanAttestation: attestationPda,
        agent: agentPda,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const agent = await program.account.agent.fetch(agentPda);
    expect(agent.name).to.eq("SignalGamma");
    expect(agent.isActive).to.eq(true);
    expect(agent.reputation.toNumber()).to.eq(100);
  });

  it("Initializes a resolution session", async () => {
    const marketPk = Keypair.generate().publicKey;
    const now = Math.floor(Date.now() / 1000);

    [sessionPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("dive_session"), marketPk.toBuffer()],
      program.programId
    );

    await program.methods
      .initializeResolutionSession(
        marketPk,
        3,
        new anchor.BN(now + 3600),
        new anchor.BN(now + 7200)
      )
      .accounts({
        authority: wallet.publicKey,
        session: sessionPda,
        market: marketPk,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const session = await program.account.resolutionSession.fetch(sessionPda);
    expect(session.committee.length).to.eq(0);
    expect(session.currentRound).to.eq(0);
  });

  it("Submits an agent insight (Signal Gamma prediction)", async () => {
    const marketPk = Keypair.generate().publicKey;
    const modelHash = new Uint8Array(32).fill(42);

    const [insightPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("dive_insight"), agentPda.toBuffer(), marketPk.toBuffer()],
      program.programId
    );

    await program.methods
      .submitInsight(
        marketPk,
        { yes: {} },
        85,
        "Strong bullish signal with 85% confidence based on on-chain volume analysis",
        Array.from(modelHash)
      )
      .accounts({
        authority: wallet.publicKey,
        agent: agentPda,
        insight: insightPda,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const insight = await program.account.agentInsight.fetch(insightPda);
    expect(insight.predictedOutcome).to.eq(0);
  });

  it("Resolves an insight correctly and updates reputation", async () => {
    const marketPk = Keypair.generate().publicKey;
    const modelHash = new Uint8Array(32).fill(42);

    const [insightPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("dive_insight"), agentPda.toBuffer(), marketPk.toBuffer()],
      program.programId
    );

    await program.methods
      .submitInsight(
        marketPk,
        { no: {} },
        70,
        "Bearish divergence detected in funding rate",
        Array.from(modelHash)
      )
      .accounts({
        authority: wallet.publicKey,
        agent: agentPda,
        insight: insightPda,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const agentBefore = await program.account.agent.fetch(agentPda);

    await program.methods
      .resolveInsight(1)
      .accounts({
        authority: wallet.publicKey,
        agent: agentPda,
        insight: insightPda,
      })
      .rpc();

    const agentAfter = await program.account.agent.fetch(agentPda);
    expect(agentAfter.reputation.toNumber()).to.be.gt(agentBefore.reputation.toNumber());
  });

  it("Resolves an insight incorrectly and penalizes reputation", async () => {
    const marketPk = Keypair.generate().publicKey;
    const modelHash = new Uint8Array(32).fill(42);

    const [insightPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("dive_insight"), agentPda.toBuffer(), marketPk.toBuffer()],
      program.programId
    );

    await program.methods
      .submitInsight(
        marketPk,
        { yes: {} },
        90,
        "Incorrect bullish prediction with high confidence",
        Array.from(modelHash)
      )
      .accounts({
        authority: wallet.publicKey,
        agent: agentPda,
        insight: insightPda,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const agentBefore = await program.account.agent.fetch(agentPda);

    await program.methods
      .resolveInsight(1)
      .accounts({
        authority: wallet.publicKey,
        agent: agentPda,
        insight: insightPda,
      })
      .rpc();

    const agentAfter = await program.account.agent.fetch(agentPda);
    expect(agentAfter.reputation.toNumber()).to.be.lt(agentBefore.reputation.toNumber());
  });
});
