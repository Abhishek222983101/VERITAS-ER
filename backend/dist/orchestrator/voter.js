"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.OnChainVoter = void 0;
const web3_js_1 = require("@solana/web3.js");
const anchor_1 = require("@coral-xyz/anchor");
const crypto = __importStar(require("crypto"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const PROGRAM_ID = new web3_js_1.PublicKey("GiJZVWSzASNJoZXJK4SSe3F59sPv8qVHnyvZAqDgyUFG");
const QUESTION_SEED = Buffer.from("question");
const VOTE_COMMIT_SEED = Buffer.from("vote_commit");
const VOTE_REVEAL_SEED = Buffer.from("vote_reveal");
// Maximum retries for transient failures
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;
function bnToU64LE(bn) {
    const buf = Buffer.alloc(8);
    let n = bn;
    for (let i = 0; i < 8; i++) {
        buf[i] = Number(n & BigInt(0xFF));
        n = n >> BigInt(8);
    }
    return buf;
}
function loadKeypair(keypairPath) {
    const fullPath = path.resolve(keypairPath);
    const data = JSON.parse(fs.readFileSync(fullPath, "utf-8"));
    return web3_js_1.Keypair.fromSecretKey(new Uint8Array(data));
}
function computeCommitHash(vote, salt, questionId, round) {
    const hash = crypto.createHash("sha256");
    hash.update(Buffer.from([vote]));
    hash.update(salt);
    hash.update(bnToU64LE(BigInt(questionId)));
    hash.update(Buffer.from([round]));
    const commitHash = hash.digest();
    return [commitHash, Array.from(salt)];
}
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
/**
 * Production-ready on-chain voter with:
 * - Automatic private voting detection (PER/TEE)
 * - Retry logic with exponential backoff
 * - Comprehensive error handling
 * - Detailed logging
 */
class OnChainVoter {
    constructor(rpcUrl, idl, keypairPath) {
        this.connection = new web3_js_1.Connection(rpcUrl, "confirmed");
        this.keypair = loadKeypair(keypairPath);
        const wallet = new anchor_1.Wallet(this.keypair);
        const provider = new anchor_1.AnchorProvider(this.connection, wallet, {
            commitment: "confirmed",
        });
        this.program = new anchor_1.Program(idl, provider);
    }
    get publicKey() {
        return this.keypair.publicKey;
    }
    async fetchQuestion(questionId) {
        const questionIdBuf = bnToU64LE(BigInt(questionId));
        const questionPda = web3_js_1.PublicKey.findProgramAddressSync([QUESTION_SEED, questionIdBuf], PROGRAM_ID)[0];
        try {
            return await this.program.account.question.fetch(questionPda);
        }
        catch {
            return null;
        }
    }
    async fetchConfig() {
        const configPda = web3_js_1.PublicKey.findProgramAddressSync([Buffer.from("config")], PROGRAM_ID)[0];
        try {
            return await this.program.account.config.fetch(configPda);
        }
        catch {
            return null;
        }
    }
    /**
     * Determine if a question requires private voting instructions.
     * Checks both the on-chain status field and account owner (delegation).
     */
    async isPrivateVoting(questionId) {
        const question = await this.fetchQuestion(questionId);
        if (!question)
            return false;
        // Check status field (new accounts)
        const status = question.status;
        if (status && (status.privateVoting !== undefined || status === 6)) {
            return true;
        }
        // Check account owner (fallback for delegated questions)
        const questionIdBuf = bnToU64LE(BigInt(questionId));
        const questionPda = web3_js_1.PublicKey.findProgramAddressSync([QUESTION_SEED, questionIdBuf], PROGRAM_ID)[0];
        try {
            const acc = await this.connection.getAccountInfo(questionPda);
            if (acc) {
                const DELEGATION_PROGRAM = new web3_js_1.PublicKey("DELeGGvXpWV2fqJUhqcF5ZSYMS4JTLjteaAMARRSaeSh");
                if (acc.owner.equals(DELEGATION_PROGRAM)) {
                    return true;
                }
            }
        }
        catch {
            // ignore
        }
        return false;
    }
    async sendTransactionWithRetry(tx, signers, label) {
        let lastError = null;
        for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
            try {
                const sig = await this.program.provider.connection.sendTransaction(tx, signers, {
                    skipPreflight: true,
                });
                console.log(`  [${label}] TX (attempt ${attempt}): ${sig}`);
                await this.program.provider.connection.confirmTransaction(sig, "confirmed");
                return sig;
            }
            catch (err) {
                lastError = err;
                console.error(`  [${label}] Attempt ${attempt} failed: ${err.message || err}`);
                if (attempt < MAX_RETRIES) {
                    const delay = RETRY_DELAY_MS * attempt;
                    console.log(`  [${label}] Retrying in ${delay}ms...`);
                    await sleep(delay);
                }
            }
        }
        throw new Error(`[${label}] Failed after ${MAX_RETRIES} attempts. Last error: ${lastError?.message || "Unknown"}`);
    }
    async commitVote(questionId, vote, confidence, evidenceHash) {
        const isPrivate = await this.isPrivateVoting(questionId);
        console.log(`  [COMMIT] Question ${questionId} private=${isPrivate}`);
        const questionIdBuf = bnToU64LE(BigInt(questionId));
        const questionPda = web3_js_1.PublicKey.findProgramAddressSync([QUESTION_SEED, questionIdBuf], PROGRAM_ID)[0];
        const voteCommitPda = web3_js_1.PublicKey.findProgramAddressSync([VOTE_COMMIT_SEED, questionPda.toBuffer(), this.keypair.publicKey.toBuffer()], PROGRAM_ID)[0];
        const salt = crypto.randomBytes(16);
        const [commitHash, saltArr] = computeCommitHash(vote, salt, questionId, 1);
        const commitHashArr = Array.from(commitHash);
        let ix;
        if (isPrivate) {
            ix = await this.program.methods
                .privateCommitVote(commitHashArr)
                .accounts({
                question: questionPda,
                voteCommit: voteCommitPda,
                agentWallet: this.keypair.publicKey,
                systemProgram: web3_js_1.SystemProgram.programId,
            })
                .instruction();
        }
        else {
            ix = await this.program.methods
                .commitVote(commitHashArr)
                .accounts({
                question: questionPda,
                voteCommit: voteCommitPda,
                agentWallet: this.keypair.publicKey,
                systemProgram: web3_js_1.SystemProgram.programId,
            })
                .instruction();
        }
        const tx = new web3_js_1.Transaction().add(ix);
        const sig = await this.sendTransactionWithRetry(tx, [this.keypair], "COMMIT");
        return { signature: sig, salt: saltArr };
    }
    async revealVote(questionId, vote, salt, confidence, evidenceHash) {
        const isPrivate = await this.isPrivateVoting(questionId);
        console.log(`  [REVEAL] Question ${questionId} private=${isPrivate}`);
        const questionIdBuf = bnToU64LE(BigInt(questionId));
        const questionPda = web3_js_1.PublicKey.findProgramAddressSync([QUESTION_SEED, questionIdBuf], PROGRAM_ID)[0];
        const voteCommitPda = web3_js_1.PublicKey.findProgramAddressSync([VOTE_COMMIT_SEED, questionPda.toBuffer(), this.keypair.publicKey.toBuffer()], PROGRAM_ID)[0];
        const voteRevealPda = web3_js_1.PublicKey.findProgramAddressSync([VOTE_REVEAL_SEED, questionPda.toBuffer(), this.keypair.publicKey.toBuffer()], PROGRAM_ID)[0];
        let ix;
        if (isPrivate) {
            ix = await this.program.methods
                .privateRevealVote(vote, salt, confidence, evidenceHash)
                .accounts({
                question: questionPda,
                voteCommit: voteCommitPda,
                voteReveal: voteRevealPda,
                agentWallet: this.keypair.publicKey,
                systemProgram: web3_js_1.SystemProgram.programId,
            })
                .instruction();
        }
        else {
            ix = await this.program.methods
                .revealVote(vote, salt, confidence, evidenceHash)
                .accounts({
                question: questionPda,
                voteCommit: voteCommitPda,
                voteReveal: voteRevealPda,
                agentWallet: this.keypair.publicKey,
                systemProgram: web3_js_1.SystemProgram.programId,
            })
                .instruction();
        }
        const tx = new web3_js_1.Transaction().add(ix);
        return await this.sendTransactionWithRetry(tx, [this.keypair], "REVEAL");
    }
}
exports.OnChainVoter = OnChainVoter;
