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
const agents_1 = require("./agents");
const researcher_1 = require("./researcher");
const voter_1 = require("./voter");
const web3_js_1 = require("@solana/web3.js");
const anchor_1 = require("@coral-xyz/anchor");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const dotenv = __importStar(require("dotenv"));
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });
const RPC_URL = process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com";
const GROQ_API_KEY = process.env.GROQ_API_KEY || "";
const MISTRAL_API_KEY = process.env.MISTRAL_API_KEY || "";
const POLL_INTERVAL_MS = 15000;
const IDL_PATH = path.resolve(__dirname, "../../../veritas-oracle/target/idl/veritas_oracle.json");
const IDL = JSON.parse(fs.readFileSync(IDL_PATH, "utf-8"));
const ADMIN_KEYPAIR_PATH = path.resolve(__dirname, "../../../veritas-oracle/keypairs/admin.json");
const PROGRAM_ID = new web3_js_1.PublicKey(IDL.address);
const commitStore = new Map();
function bnToU64LE(bn) {
    const buf = Buffer.alloc(8);
    let n = bn;
    for (let i = 0; i < 8; i++) {
        buf[i] = Number(n & BigInt(0xFF));
        n = n >> BigInt(8);
    }
    return buf;
}
function statusToNumber(s) {
    if (!s)
        return -1;
    if (s.pending !== undefined)
        return 0;
    if (s.committeeSelected !== undefined)
        return 1;
    if (s.commitPhase !== undefined)
        return 2;
    if (s.revealPhase !== undefined)
        return 3;
    if (s.discussionPhase !== undefined)
        return 4;
    if (s.resolved !== undefined)
        return 5;
    if (s.privateVoting !== undefined)
        return 6;
    return -1;
}
const STATUS_LABELS = ["Pending", "CommitteeSelected", "CommitPhase", "RevealPhase", "Discussion", "Resolved", "PrivateVoting"];
async function main() {
    console.log("=== VERITAS Agent Orchestrator ===");
    console.log(`RPC: ${RPC_URL}`);
    console.log(`Groq API: ${GROQ_API_KEY ? "configured" : "MISSING"}`);
    console.log(`Agents: ${Object.keys(agents_1.AGENTS).join(", ")}`);
    console.log(`Polling every ${POLL_INTERVAL_MS / 1000}s`);
    const adminKeypairData = JSON.parse(fs.readFileSync(ADMIN_KEYPAIR_PATH, "utf-8"));
    const adminKeypair = web3_js_1.Keypair.fromSecretKey(new Uint8Array(adminKeypairData));
    const adminConnection = new web3_js_1.Connection(RPC_URL, "confirmed");
    const adminWallet = new anchor_1.Wallet(adminKeypair);
    const adminProvider = new anchor_1.AnchorProvider(adminConnection, adminWallet, { commitment: "confirmed" });
    const adminProgram = new anchor_1.Program(IDL, adminProvider);
    const voters = new Map();
    const agentPubkeys = [];
    for (const [key, agent] of Object.entries(agents_1.AGENTS)) {
        const keypairPath = path.resolve(__dirname, agent.keypairPath);
        if (!fs.existsSync(keypairPath)) {
            console.warn(`Keypair not found: ${keypairPath}, skipping ${agent.name}`);
            continue;
        }
        const voter = new voter_1.OnChainVoter(RPC_URL, IDL, keypairPath);
        voters.set(key, voter);
        agentPubkeys.push(voter.publicKey);
        console.log(`  Loaded ${agent.name}: ${voter.publicKey.toBase58()}`);
    }
    if (voters.size === 0) {
        console.error("No agent keypairs loaded. Exiting.");
        process.exit(1);
    }
    async function adminSetCommittee(questionId, committeePks) {
        const questionIdBuf = bnToU64LE(BigInt(questionId));
        const questionPda = web3_js_1.PublicKey.findProgramAddressSync([Buffer.from("question"), questionIdBuf], PROGRAM_ID)[0];
        const ix = await adminProgram.methods
            .adminSetCommittee(committeePks.slice(0, 3))
            .accounts({
            question: questionPda,
            admin: adminKeypair.publicKey,
        })
            .instruction();
        const tx = new web3_js_1.Transaction().add(ix);
        const sig = await adminConnection.sendTransaction(tx, [adminKeypair], { skipPreflight: true });
        await adminConnection.confirmTransaction(sig, "confirmed");
        return sig;
    }
    async function adminUpdateStatus(questionId, newStatus) {
        const questionIdBuf = bnToU64LE(BigInt(questionId));
        const questionPda = web3_js_1.PublicKey.findProgramAddressSync([Buffer.from("question"), questionIdBuf], PROGRAM_ID)[0];
        const ix = await adminProgram.methods
            .updateQuestionStatus(newStatus)
            .accounts({
            question: questionPda,
            admin: adminKeypair.publicKey,
        })
            .instruction();
        const tx = new web3_js_1.Transaction().add(ix);
        const sig = await adminConnection.sendTransaction(tx, [adminKeypair], { skipPreflight: true });
        await adminConnection.confirmTransaction(sig, "confirmed");
        return sig;
    }
    async function adminResolve(questionId) {
        const questionIdBuf = bnToU64LE(BigInt(questionId));
        const questionPda = web3_js_1.PublicKey.findProgramAddressSync([Buffer.from("question"), questionIdBuf], PROGRAM_ID)[0];
        const ix = await adminProgram.methods
            .resolveQuestion()
            .accounts({
            question: questionPda,
        })
            .instruction();
        const tx = new web3_js_1.Transaction().add(ix);
        const sig = await adminConnection.sendTransaction(tx, [adminKeypair], { skipPreflight: true });
        await adminConnection.confirmTransaction(sig, "confirmed");
        return sig;
    }
    async function pollAndVote() {
        try {
            const anyVoter = voters.values().next().value;
            const config = await anyVoter.fetchConfig();
            if (!config) {
                console.log("Config not found. Waiting...");
                return;
            }
            const questionCount = Number(config.questionCounter);
            for (let qid = 0; qid < questionCount; qid++) {
                const q = await anyVoter.fetchQuestion(qid);
                if (!q)
                    continue;
                const status = statusToNumber(q.status);
                if (status === 5)
                    continue;
                const committee = q.committee.filter((c) => !c.equals(web3_js_1.PublicKey.default));
                const questionText = q.questionText;
                const category = q.category;
                console.log(`\nQuestion #${qid} [${STATUS_LABELS[status] || "Unknown"}]: "${questionText.slice(0, 50)}..."`);
                if (status === 0 && committee.length === 0) {
                    console.log(`  No committee — setting committee with first 3 agents...`);
                    try {
                        const sig = await adminSetCommittee(qid, agentPubkeys.slice(0, 3));
                        console.log(`  Committee set! TX: ${sig.slice(0, 20)}...`);
                    }
                    catch (err) {
                        console.error(`  Failed to set committee: ${err.message?.slice(0, 80)}`);
                    }
                    continue;
                }
                if (status === 0 && committee.length > 0) {
                    const anyAgentOnCommittee = committee.some((c) => agentPubkeys.some(ap => ap.equals(c)));
                    if (!anyAgentOnCommittee) {
                        console.log(`  Committee exists but no agents match — overriding committee...`);
                        try {
                            const sig = await adminSetCommittee(qid, agentPubkeys.slice(0, 3));
                            console.log(`  Committee overridden! TX: ${sig.slice(0, 20)}...`);
                        }
                        catch (err) {
                            console.error(`  Failed to override committee: ${err.message?.slice(0, 80)}`);
                        }
                        continue;
                    }
                    console.log(`  Advancing to CommitPhase...`);
                    try {
                        const sig = await adminUpdateStatus(qid, { commitPhase: {} });
                        console.log(`  Status updated! TX: ${sig.slice(0, 20)}...`);
                    }
                    catch (err) {
                        console.error(`  Status update failed: ${err.message?.slice(0, 80)}`);
                    }
                    continue;
                }
                if (status === 1) {
                    const anyAgentOnCommittee = committee.some((c) => agentPubkeys.some(ap => ap.equals(c)));
                    if (!anyAgentOnCommittee) {
                        console.log(`  Committee doesn't match agents — overriding...`);
                        try {
                            const sig = await adminSetCommittee(qid, agentPubkeys.slice(0, 3));
                            console.log(`  Committee overridden! TX: ${sig.slice(0, 20)}...`);
                        }
                        catch (err) {
                            console.error(`  Failed to override committee: ${err.message?.slice(0, 80)}`);
                        }
                        continue;
                    }
                    console.log(`  Advancing to CommitPhase...`);
                    try {
                        const sig = await adminUpdateStatus(qid, { commitPhase: {} });
                        console.log(`  Status updated! TX: ${sig.slice(0, 20)}...`);
                    }
                    catch (err) {
                        console.error(`  Status update failed: ${err.message?.slice(0, 80)}`);
                    }
                    continue;
                }
                if (status === 2 || status === 6) {
                    const eligibleVoters = Array.from(voters.entries()).filter(([key, voter]) => committee.some((c) => c.equals(voter.publicKey)));
                    if (eligibleVoters.length === 0) {
                        console.log(`  No committee agents match — overriding committee...`);
                        try {
                            await adminSetCommittee(qid, agentPubkeys.slice(0, 3));
                        }
                        catch (err) {
                            console.error(`  Override failed: ${err.message?.slice(0, 80)}`);
                        }
                        continue;
                    }
                    for (const [agentKey, voter] of eligibleVoters) {
                        const commitKey = `${agentKey}-${qid}`;
                        if (commitStore.has(commitKey)) {
                            continue;
                        }
                        console.log(`  ${agents_1.AGENTS[agentKey].name} researching...`);
                        const research = await (0, researcher_1.researchQuestion)(agentKey, questionText, category, GROQ_API_KEY, MISTRAL_API_KEY);
                        try {
                            const { signature, salt } = await voter.commitVote(qid, research.vote, research.confidence, research.evidenceHash);
                            commitStore.set(commitKey, {
                                questionId: qid,
                                vote: research.vote,
                                salt,
                                confidence: research.confidence,
                                evidenceHash: research.evidenceHash,
                            });
                            console.log(`  ${agents_1.AGENTS[agentKey].name} committed! TX: ${signature.slice(0, 20)}...`);
                        }
                        catch (err) {
                            console.error(`  ${agents_1.AGENTS[agentKey].name} commit failed: ${err.message?.slice(0, 100)}`);
                        }
                    }
                    const allCommitted = eligibleVoters.every(([key]) => commitStore.has(`${key}-${qid}`));
                    if (allCommitted && eligibleVoters.length > 0) {
                        console.log(`  All committee members committed — advancing to RevealPhase...`);
                        try {
                            const sig = await adminUpdateStatus(qid, { revealPhase: {} });
                            console.log(`  RevealPhase! TX: ${sig.slice(0, 20)}...`);
                        }
                        catch (err) {
                            console.error(`  Status update failed: ${err.message?.slice(0, 80)}`);
                        }
                    }
                    continue;
                }
                if (status === 3) {
                    const eligibleVoters = Array.from(voters.entries()).filter(([key, voter]) => committee.some((c) => c.equals(voter.publicKey)));
                    for (const [agentKey, voter] of eligibleVoters) {
                        const commitKey = `${agentKey}-${qid}`;
                        const pending = commitStore.get(commitKey);
                        if (!pending)
                            continue;
                        try {
                            const sig = await voter.revealVote(qid, pending.vote, pending.salt, pending.confidence, pending.evidenceHash);
                            console.log(`  ${agents_1.AGENTS[agentKey].name} revealed! TX: ${sig.slice(0, 20)}...`);
                            commitStore.delete(commitKey);
                        }
                        catch (err) {
                            console.error(`  ${agents_1.AGENTS[agentKey].name} reveal failed: ${err.message?.slice(0, 100)}`);
                        }
                    }
                    const anyCommitLeft = Array.from(commitStore.keys()).some(k => k.endsWith(`-${qid}`));
                    if (!anyCommitLeft) {
                        console.log(`  All reveals done — resolving question...`);
                        try {
                            const sig = await adminResolve(qid);
                            console.log(`  Resolved! TX: ${sig.slice(0, 20)}...`);
                        }
                        catch (err) {
                            console.error(`  Resolve failed: ${err.message?.slice(0, 80)}`);
                        }
                    }
                    continue;
                }
            }
        }
        catch (err) {
            console.error("Poll error:", err.message?.slice(0, 200));
        }
    }
    console.log("\nStarting poll loop...");
    await pollAndVote();
    setInterval(pollAndVote, POLL_INTERVAL_MS);
}
main().catch(console.error);
