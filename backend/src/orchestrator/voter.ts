import { Connection, Keypair, PublicKey, SystemProgram, Transaction, TransactionInstruction } from "@solana/web3.js";
import { AnchorProvider, Program, Wallet } from "@coral-xyz/anchor";
import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";
import nacl from "tweetnacl";
import { getAuthToken } from "@magicblock-labs/ephemeral-rollups-sdk";

const PROGRAM_ID = new PublicKey("6RE3cPuSF3XVEgLkULMpZi8vaPLdvfhQuB5esLFAQPbf");
const QUESTION_SEED = Buffer.from("question");
const AGENT_SEED = Buffer.from("agent");
const AGENT_REGISTRY_SEED = Buffer.from("agent_registry");
const VOTE_COMMIT_SEED = Buffer.from("vote_commit");
const VOTE_REVEAL_SEED = Buffer.from("vote_reveal");

const TEE_RPC_URL = process.env.MAGICBLOCK_TEE_RPC || "https://devnet-tee.magicblock.app";
const TEE_WS_URL = process.env.MAGICBLOCK_TEE_WS || "wss://devnet-tee.magicblock.app";
const ER_RPC_URL = process.env.MAGICBLOCK_ER_RPC || "https://devnet-as.magicblock.app";
const ER_WS_URL = process.env.MAGICBLOCK_ER_WS || "wss://devnet-as.magicblock.app";

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;

function bnToU64LE(bn: bigint): Buffer {
  const buf = Buffer.alloc(8);
  let n = bn;
  for (let i = 0; i < 8; i++) {
    buf[i] = Number(n & BigInt(0xFF));
    n = n >> BigInt(8);
  }
  return buf;
}

function loadKeypair(keypairPath: string): Keypair {
  const fullPath = path.resolve(keypairPath);
  const data = JSON.parse(fs.readFileSync(fullPath, "utf-8"));
  return Keypair.fromSecretKey(new Uint8Array(data));
}

function computeCommitHash(vote: number, salt: Buffer, questionId: number, round: number): [Buffer, number[]] {
  const hash = crypto.createHash("sha256");
  hash.update(Buffer.from([vote]));
  hash.update(salt);
  hash.update(bnToU64LE(BigInt(questionId)));
  hash.update(Buffer.from([round]));
  const commitHash = hash.digest();
  return [commitHash, Array.from(salt)];
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function statusToNumber(s: any): number {
  if (!s) return -1;
  if (s.pending !== undefined) return 0;
  if (s.committeeSelected !== undefined) return 1;
  if (s.commitPhase !== undefined) return 2;
  if (s.revealPhase !== undefined) return 3;
  if (s.discussionPhase !== undefined) return 4;
  if (s.resolved !== undefined) return 5;
  if (s.privateVoting !== undefined) return 6;
  return -1;
}

export class OnChainVoter {
  private connection: Connection;
  private program: Program;
  private idl: any;
  private keypair: Keypair;
  private authToken: string | null = null;
  private authTokenExpiresAt: number = 0;
  private authEndpoint: string | null = null;

  constructor(rpcUrl: string, idl: any, keypairPath: string) {
    this.connection = new Connection(rpcUrl, "confirmed");
    this.idl = idl;
    this.keypair = loadKeypair(keypairPath);

    const wallet = new Wallet(this.keypair);
    const provider = new AnchorProvider(this.connection, wallet as any, {
      commitment: "confirmed",
    });
    this.program = new Program(idl, provider as any);
  }

  get publicKey(): PublicKey {
    return this.keypair.publicKey;
  }

  async fetchQuestion(questionId: number): Promise<any> {
    const questionIdBuf = bnToU64LE(BigInt(questionId));
    const questionPda = PublicKey.findProgramAddressSync(
      [QUESTION_SEED, questionIdBuf],
      PROGRAM_ID
    )[0];
    try {
      return await (this.program.account as any).question.fetch(questionPda);
    } catch {
      return null;
    }
  }

  async fetchConfig(): Promise<any> {
    const configPda = PublicKey.findProgramAddressSync(
      [Buffer.from("config")],
      PROGRAM_ID
    )[0];
    try {
      return await (this.program.account as any).config.fetch(configPda);
    } catch {
      return null;
    }
  }

  async fetchVoteReveal(questionId: number, agentWallet: PublicKey): Promise<any> {
    const questionIdBuf = bnToU64LE(BigInt(questionId));
    const questionPda = PublicKey.findProgramAddressSync(
      [QUESTION_SEED, questionIdBuf],
      PROGRAM_ID
    )[0];
    const voteRevealPda = PublicKey.findProgramAddressSync(
      [VOTE_REVEAL_SEED, questionPda.toBuffer(), agentWallet.toBuffer()],
      PROGRAM_ID
    )[0];
    try {
      return await (this.program.account as any).voteReveal.fetch(voteRevealPda);
    } catch {
      return null;
    }
  }

  async isPrivateVoting(questionId: number): Promise<boolean> {
    const question = await this.fetchQuestion(questionId);
    if (!question) return false;

    const status = question.status;
    if (status && (status.privateVoting !== undefined || status === 6)) {
      return true;
    }

    const questionIdBuf = bnToU64LE(BigInt(questionId));
    const questionPda = PublicKey.findProgramAddressSync(
      [QUESTION_SEED, questionIdBuf],
      PROGRAM_ID
    )[0];
    try {
      const acc = await this.connection.getAccountInfo(questionPda);
      if (acc) {
        const DELEGATION_PROGRAM = new PublicKey("DELeGGvXpWV2fqJUhqcF5ZSYMS4JTLjteaAMARRSaeSh");
        if (acc.owner.equals(DELEGATION_PROGRAM)) {
          return true;
        }
      }
    } catch { /* ignore */ }

    return false;
  }

  async getDelegatedConnection(): Promise<Connection> {
    if (this.authToken && Date.now() < this.authTokenExpiresAt && this.authEndpoint) {
      const url = `${this.authEndpoint}?token=${this.authToken}`;
      const wsUrl = `${this.authEndpoint.replace(/^https?/, this.authEndpoint.startsWith("https") ? "wss" : "ws")}?token=${this.authToken}`;
      return new Connection(url, { wsEndpoint: wsUrl, commitment: "confirmed" });
    }

    const endpoints = [
      { name: "TEE", rpc: TEE_RPC_URL, ws: TEE_WS_URL },
      { name: "ER", rpc: ER_RPC_URL, ws: ER_WS_URL },
    ];

    let lastError: Error | null = null;

    for (const ep of endpoints) {
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          console.log(`  [${ep.name}] Getting auth token (attempt ${attempt}) for ${this.keypair.publicKey.toBase58().slice(0, 8)}...`);
          const { token } = await getAuthToken(
            ep.rpc,
            this.keypair.publicKey,
            async (message: Uint8Array) => {
              return nacl.sign.detached(message, this.keypair.secretKey);
            }
          );
          this.authToken = token;
          this.authTokenExpiresAt = Date.now() + 5 * 60 * 1000;
          this.authEndpoint = ep.rpc;
          console.log(`  [${ep.name}] Auth token obtained`);

          const url = `${ep.rpc}?token=${token}`;
          const wsUrl = `${ep.ws}?token=${token}`;

          const testConn = new Connection(url, { wsEndpoint: wsUrl, commitment: "confirmed" });
          await testConn.getRecentBlockhash("confirmed");
          console.log(`  [${ep.name}] Connection verified`);
          return testConn;
        } catch (err: any) {
          lastError = err;
          console.error(`  [${ep.name}] Auth attempt ${attempt} failed: ${err.message?.slice(0, 100)}`);
          if (attempt < 2) await sleep(2000);
        }
      }
      this.authToken = null;
      this.authEndpoint = null;
    }

    throw new Error(`All delegation endpoints failed: ${lastError?.message?.slice(0, 100) || "Unknown"}`);
  }

  private async sendTransactionWithRetry(
    tx: Transaction,
    signers: Keypair[],
    label: string,
    overrideConnection?: Connection
  ): Promise<string> {
    const conn = overrideConnection || this.connection;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const sig = await conn.sendTransaction(tx, signers, {
          skipPreflight: true,
        });
        console.log(`  [${label}] TX (attempt ${attempt}): ${sig}`);

        const result = await conn.confirmTransaction(sig, "confirmed");

        if (result.value.err) {
          throw new Error(`Transaction failed on-chain: ${JSON.stringify(result.value.err)}`);
        }
        return sig;
      } catch (err: any) {
        lastError = err;
        console.error(`  [${label}] Attempt ${attempt} failed: ${err.message?.slice(0, 120)}`);

        if (err.message?.includes("429") || err.message?.includes("rate limit")) {
          await sleep(5000);
        }

        if (err.message?.includes("token") || err.message?.includes("auth") || err.message?.includes("401") || err.message?.includes("403")) {
          this.authToken = null;
          this.authEndpoint = null;
          if (overrideConnection) {
            console.log(`  [${label}] Auth error with delegated connection, will re-auth on retry`);
          }
        }

        if (attempt < MAX_RETRIES) {
          const delay = RETRY_DELAY_MS * attempt;
          await sleep(delay);
        }
      }
    }

    throw new Error(
      `[${label}] Failed after ${MAX_RETRIES} attempts. Last: ${lastError?.message?.slice(0, 100) || "Unknown"}`
    );
  }

  async commitVote(
    questionId: number,
    vote: number,
    confidence: number,
    evidenceHash: number[]
  ): Promise<{ signature: string; salt: number[] }> {
    const isPrivate = await this.isPrivateVoting(questionId);
    console.log(`  [COMMIT] Q${questionId} private=${isPrivate}`);

    const questionIdBuf = bnToU64LE(BigInt(questionId));
    const questionPda = PublicKey.findProgramAddressSync(
      [QUESTION_SEED, questionIdBuf],
      PROGRAM_ID
    )[0];
    const voteCommitPda = PublicKey.findProgramAddressSync(
      [VOTE_COMMIT_SEED, questionPda.toBuffer(), this.keypair.publicKey.toBuffer()],
      PROGRAM_ID
    )[0];

    // Check if vote commit already exists (orchestrator restart scenario)
    // If it does, we can't recover the salt — the orchestrator should use persisted commitStore
    try {
      const existing = await this.connection.getAccountInfo(voteCommitPda);
      if (existing && existing.lamports > 0) {
        console.log(`  [COMMIT] VoteCommit already exists for Q${questionId} — check persistent commitStore`);
        const err = new Error("ALREADY_COMMITTED") as any;
        err.code = "ALREADY_COMMITTED";
        throw err;
      }
    } catch (err: any) {
      if (err.code === "ALREADY_COMMITTED") throw err;
      /* ignore other check errors */
    }

    const salt = crypto.randomBytes(16);
    const [commitHash, saltArr] = computeCommitHash(vote, salt, questionId, 1);
    const commitHashArr = Array.from(commitHash);

    let ix: TransactionInstruction;
    if (isPrivate) {
      ix = await this.program.methods
        .privateCommitVote(commitHashArr)
        .accounts({
          question: questionPda,
          voteCommit: voteCommitPda,
          agentWallet: this.keypair.publicKey,
          systemProgram: SystemProgram.programId,
        } as any)
        .instruction();
    } else {
      ix = await this.program.methods
        .commitVote(commitHashArr)
        .accounts({
          question: questionPda,
          voteCommit: voteCommitPda,
          agentWallet: this.keypair.publicKey,
          systemProgram: SystemProgram.programId,
        } as any)
        .instruction();
    }

    const tx = new Transaction().add(ix);

    let teeConn: Connection | undefined;
    if (isPrivate) {
      try {
        teeConn = await this.getDelegatedConnection();
        console.log(`  [COMMIT] Using delegated connection for private vote`);
      } catch (err: any) {
        console.error(`  [COMMIT] CRITICAL: Delegated endpoint failed, aborting private commit: ${err.message?.slice(0, 80)}`);
        throw new Error(`Private commit requires TEE/ER connection: ${err.message?.slice(0, 80)}`);
      }
    }

    const sig = await this.sendTransactionWithRetry(tx, [this.keypair], "COMMIT", teeConn);
    return { signature: sig, salt: saltArr };
  }

  async revealVote(
    questionId: number,
    vote: number,
    salt: number[],
    confidence: number,
    evidenceHash: number[]
  ): Promise<string> {
    const isPrivate = await this.isPrivateVoting(questionId);
    console.log(`  [REVEAL] Q${questionId} private=${isPrivate}`);

    const questionIdBuf = bnToU64LE(BigInt(questionId));
    const questionPda = PublicKey.findProgramAddressSync(
      [QUESTION_SEED, questionIdBuf],
      PROGRAM_ID
    )[0];
    const voteCommitPda = PublicKey.findProgramAddressSync(
      [VOTE_COMMIT_SEED, questionPda.toBuffer(), this.keypair.publicKey.toBuffer()],
      PROGRAM_ID
    )[0];
    const voteRevealPda = PublicKey.findProgramAddressSync(
      [VOTE_REVEAL_SEED, questionPda.toBuffer(), this.keypair.publicKey.toBuffer()],
      PROGRAM_ID
    )[0];

    let ix: TransactionInstruction;
    if (isPrivate) {
      ix = await this.program.methods
        .privateRevealVote(vote, salt, confidence, evidenceHash)
        .accounts({
          question: questionPda,
          voteCommit: voteCommitPda,
          voteReveal: voteRevealPda,
          agentWallet: this.keypair.publicKey,
          systemProgram: SystemProgram.programId,
        } as any)
        .instruction();
    } else {
      ix = await this.program.methods
        .revealVote(vote, salt, confidence, evidenceHash)
        .accounts({
          question: questionPda,
          voteCommit: voteCommitPda,
          voteReveal: voteRevealPda,
          agentWallet: this.keypair.publicKey,
          systemProgram: SystemProgram.programId,
        } as any)
        .instruction();
    }

    const tx = new Transaction().add(ix);

    let teeConn: Connection | undefined;
    if (isPrivate) {
      try {
        teeConn = await this.getDelegatedConnection();
        console.log(`  [REVEAL] Using delegated connection for private reveal`);
      } catch (err: any) {
        console.error(`  [REVEAL] CRITICAL: Delegated endpoint failed, aborting private reveal: ${err.message?.slice(0, 80)}`);
        throw new Error(`Private reveal requires TEE/ER connection: ${err.message?.slice(0, 80)}`);
      }
    }

    return await this.sendTransactionWithRetry(tx, [this.keypair], "REVEAL", teeConn);
  }

  async resolveQuestion(questionId: number, useTee: boolean): Promise<string> {
    const questionIdBuf = bnToU64LE(BigInt(questionId));
    const questionPda = PublicKey.findProgramAddressSync(
      [QUESTION_SEED, questionIdBuf],
      PROGRAM_ID
    )[0];

    const ix = await this.program.methods
      .resolveQuestion()
      .accounts({
        question: questionPda,
      } as any)
      .instruction();

    const tx = new Transaction().add(ix);

    let teeConn: Connection | undefined;
    if (useTee) {
      try {
        teeConn = await this.getDelegatedConnection();
        console.log(`  [RESOLVE] Using delegated connection`);
      } catch (err: any) {
        console.error(`  [RESOLVE] WARNING: Delegated endpoint failed, trying base layer: ${err.message?.slice(0, 80)}`);
      }
    }

    return await this.sendTransactionWithRetry(tx, [this.keypair], "RESOLVE", teeConn);
  }

  async updateReputation(agentWallet: PublicKey, delta: number): Promise<string> {
    const agentPda = PublicKey.findProgramAddressSync(
      [AGENT_SEED, agentWallet.toBuffer()],
      PROGRAM_ID
    )[0];
    const agentRegistryPda = PublicKey.findProgramAddressSync(
      [AGENT_REGISTRY_SEED],
      PROGRAM_ID
    )[0];

    const ix = await this.program.methods
      .updateReputation(delta)
      .accounts({
        agent: agentPda,
        admin: this.keypair.publicKey,
        agentRegistry: agentRegistryPda,
      } as any)
      .instruction();

    const tx = new Transaction().add(ix);
    return await this.sendTransactionWithRetry(tx, [this.keypair], "REPUTATION");
  }

  async advanceToCommitPhase(questionId: number): Promise<string> {
    const questionIdBuf = bnToU64LE(BigInt(questionId));
    const questionPda = PublicKey.findProgramAddressSync(
      [QUESTION_SEED, questionIdBuf],
      PROGRAM_ID
    )[0];

    const ix = await this.program.methods
      .updateQuestionStatus({ commitPhase: {} } as any)
      .accounts({
        question: questionPda,
        admin: this.keypair.publicKey,
      } as any)
      .instruction();

    const tx = new Transaction().add(ix);
    return await this.sendTransactionWithRetry(tx, [this.keypair], "ADVANCE_COMMIT");
  }

  async advanceToRevealPhase(questionId: number): Promise<string> {
    const questionIdBuf = bnToU64LE(BigInt(questionId));
    const questionPda = PublicKey.findProgramAddressSync(
      [QUESTION_SEED, questionIdBuf],
      PROGRAM_ID
    )[0];

    const ix = await this.program.methods
      .updateQuestionStatus({ revealPhase: {} } as any)
      .accounts({
        question: questionPda,
        admin: this.keypair.publicKey,
      } as any)
      .instruction();

    const tx = new Transaction().add(ix);
    return await this.sendTransactionWithRetry(tx, [this.keypair], "ADVANCE_REVEAL");
  }

  async undelegateQuestion(questionId: number): Promise<string> {
    const questionIdBuf = bnToU64LE(BigInt(questionId));
    const questionPda = PublicKey.findProgramAddressSync(
      [QUESTION_SEED, questionIdBuf],
      PROGRAM_ID
    )[0];

    const ix = await this.program.methods
      .commitAndUndelegatePrivate()
      .accounts({
        payer: this.keypair.publicKey,
        question: questionPda,
      } as any)
      .instruction();

    const tx = new Transaction().add(ix);

    let teeConn: Connection | undefined;
    try {
      teeConn = await this.getDelegatedConnection();
      console.log(`  [UNDELEGATE] Using delegated connection`);
    } catch (err: any) {
      console.error(`  [UNDELEGATE] WARNING: Delegated endpoint failed, trying base layer: ${err.message?.slice(0, 80)}`);
    }

    return await this.sendTransactionWithRetry(tx, [this.keypair], "UNDELEGATE", teeConn);
  }

  questionIsPrivate(q: any): boolean {
    const statusNum = statusToNumber(q.status);
    return statusNum === 6;
  }
}
