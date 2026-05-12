import { AGENTS } from "./agents";
import { researchQuestion } from "./researcher";
import { OnChainVoter } from "./voter";
import { tavilySearch, coingeckoPrices, heliusOnChainData, isCryptoRelated, SearchResult, CryptoPrice } from "./search";
import {
  getPaymentsAuthToken,
  buildTransferTx,
  getPublicBalance,
  getPrivateBalance,
  buildDepositTx,
  DEVNET_USDC_MINT,
} from "./private-payments";
import { Connection, Keypair, PublicKey, SystemProgram, Transaction, VersionedTransaction } from "@solana/web3.js";
import { AnchorProvider, Program, Wallet, BN } from "@coral-xyz/anchor";
import * as http from "http";
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";

dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

const RPC_URL = process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com";
const GROQ_API_KEY = process.env.GROQ_API_KEY || "";
const MISTRAL_API_KEY = process.env.MISTRAL_API_KEY || "";
const TAVILY_API_KEY = process.env.TAVILY_API_KEY || "";
const POLL_INTERVAL_MS = 30000;

const SSE_PORT = 3002;

interface ResearchCache {
  searchResults: SearchResult[];
  priceData: CryptoPrice[];
  onChainData: string;
  timestamp: number;
}

const researchCache: Map<number, ResearchCache> = new Map();
const RESEARCH_CACHE_TTL_MS = 10 * 60 * 1000;

const sseClients: Set<http.ServerResponse> = new Set();

function broadcastSSE(data: string) {
  const payload = `data: ${JSON.stringify({ text: data, ts: Date.now() })}\n\n`;
  for (const client of sseClients) {
    try {
      client.write(payload);
    } catch {
      sseClients.delete(client);
    }
  }
}

const originalLog = console.log;
const originalError = console.error;
console.log = (...args: any[]) => {
  const msg = args.map((a: any) => typeof a === "string" ? a : JSON.stringify(a)).join(" ");
  originalLog(...args);
  broadcastSSE(msg);
};
console.error = (...args: any[]) => {
  const msg = args.map((a: any) => typeof a === "string" ? a : JSON.stringify(a)).join(" ");
  originalError(...args);
  broadcastSSE("❌ " + msg);
};

function startSSEServer() {
  const server = http.createServer((req, res) => {
    if (req.headers.origin) {
      res.setHeader("Access-Control-Allow-Origin", req.headers.origin);
    }
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.writeHead(200);
    sseClients.add(res);
    broadcastSSE("Connected to VERITAS Orchestrator");
    req.on("close", () => {
      sseClients.delete(res);
    });
  });
  server.listen(SSE_PORT, () => {
    console.log(`SSE server on port ${SSE_PORT}`);
  });
}

// Debug env vars at startup
console.log("=== Environment ===");
console.log(`TAVILY_API_KEY: ${TAVILY_API_KEY ? "✅ configured" : "❌ MISSING"}`);
console.log(`GROQ_API_KEY: ${GROQ_API_KEY ? "✅ configured" : "❌ MISSING"}`);
console.log(`MISTRAL_API_KEY: ${MISTRAL_API_KEY ? "✅ configured" : "❌ MISSING"}`);
console.log(`SOLANA_RPC_URL: ${RPC_URL.slice(0, 40)}...`);

const IDL_PATH = path.resolve(__dirname, "../../../veritas-oracle/target/idl/veritas_oracle.json");
const IDL = JSON.parse(fs.readFileSync(IDL_PATH, "utf-8"));

const ADMIN_KEYPAIR_PATH = path.resolve(__dirname, "../../../veritas-oracle/keypairs/admin.json");
const PROGRAM_ID = new PublicKey(IDL.address);

interface PendingCommit {
  questionId: number;
  vote: number;
  salt: number[];
  confidence: number;
  evidenceHash: number[];
}

interface QuestionProgress {
  phase: "commit" | "reveal" | "resolve" | "undelegate" | "reputation" | "done";
  resolvedResult: number | null;
  votes: Map<string, number>;
  failureCount?: number;
}

const COMMIT_STORE_PATH = path.resolve(__dirname, "../../commit-store.json");
const PROGRESS_STORE_PATH = path.resolve(__dirname, "../../progress-store.json");
const SKIP_STORE_PATH = path.resolve(__dirname, "../../skip-store.json");

function loadJsonMap(filePath: string): Map<string, any> {
  try {
    if (fs.existsSync(filePath)) {
      const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
      return new Map(Object.entries(data));
    }
  } catch { /* ignore */ }
  return new Map();
}

function saveJsonSet(filePath: string, set: Set<number>): void {
  try {
    fs.writeFileSync(filePath, JSON.stringify(Array.from(set), null, 2));
  } catch (e: any) {
    console.error(`  [STORE] Failed to save ${filePath}: ${e.message?.slice(0, 60)}`);
  }
}

function loadJsonSet(filePath: string): Set<number> {
  try {
    if (fs.existsSync(filePath)) {
      const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
      return new Set(data);
    }
  } catch { /* ignore */ }
  return new Set();
}

function saveJsonMap(filePath: string, map: Map<string, any>): void {
  try {
    const obj = Object.fromEntries(map);
    fs.writeFileSync(filePath, JSON.stringify(obj, null, 2));
  } catch (e: any) {
    console.error(`  [STORE] Failed to save ${filePath}: ${e.message?.slice(0, 60)}`);
  }
}

const commitStore: Map<string, PendingCommit> = loadJsonMap(COMMIT_STORE_PATH) as Map<string, PendingCommit>;
const progressStore: Map<number, QuestionProgress> = new Map();
const skipStore: Set<number> = loadJsonSet(SKIP_STORE_PATH);

// Restore progressStore from persisted format
const rawProgressStore = loadJsonMap(PROGRESS_STORE_PATH);
for (const [k, v] of rawProgressStore) {
  progressStore.set(Number(k), { ...v, votes: new Map(Object.entries(v.votes || {})) });
}

function persistCommitStore(): void {
  saveJsonMap(COMMIT_STORE_PATH, commitStore);
}

function persistProgressStore(): void {
  const serializable = new Map<string, any>();
  for (const [k, v] of progressStore) {
    serializable.set(String(k), { ...v, votes: Object.fromEntries(v.votes) });
  }
  saveJsonMap(PROGRESS_STORE_PATH, serializable);
}

function persistSkipStore(): void {
  saveJsonSet(SKIP_STORE_PATH, skipStore);
}

function bnToU64LE(bn: bigint): Buffer {
  const buf = Buffer.alloc(8);
  let n = bn;
  for (let i = 0; i < 8; i++) {
    buf[i] = Number(n & BigInt(0xFF));
    n = n >> BigInt(8);
  }
  return buf;
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

const STATUS_LABELS = ["Pending", "CommitteeSelected", "CommitPhase", "RevealPhase", "Discussion", "Resolved", "PrivateVoting"];

function voteResultToNumber(result: any): number {
  if (!result) return 2;
  if (result.yes !== undefined) return 0;
  if (result.no !== undefined) return 1;
  return 2;
}

async function main() {
  console.log("=== VERITAS Agent Orchestrator ===");
  console.log(`RPC: ${RPC_URL}`);
  console.log(`Groq API: ${GROQ_API_KEY ? "configured" : "MISSING"}`);
  console.log(`Mistral API: ${MISTRAL_API_KEY ? "configured" : "MISSING"}`);
  console.log(`Agents: ${Object.keys(AGENTS).join(", ")}`);
  console.log(`Polling every ${POLL_INTERVAL_MS / 1000}s`);

  const adminKeypairData = JSON.parse(fs.readFileSync(ADMIN_KEYPAIR_PATH, "utf-8"));
  const adminKeypair = Keypair.fromSecretKey(new Uint8Array(adminKeypairData));
  const adminConnection = new Connection(RPC_URL, "confirmed");
  const adminWallet = new Wallet(adminKeypair);
  const adminProvider = new AnchorProvider(adminConnection, adminWallet as any, { commitment: "confirmed" });
  const adminProgram = new Program(IDL, adminProvider as any);

  const voters: Map<string, OnChainVoter> = new Map();
  const agentPubkeys: PublicKey[] = [];

  for (const [key, agent] of Object.entries(AGENTS)) {
    const keypairPath = path.resolve(__dirname, agent.keypairPath);
    if (!fs.existsSync(keypairPath)) {
      console.warn(`Keypair not found: ${keypairPath}, skipping ${agent.name}`);
      continue;
    }
    const voter = new OnChainVoter(RPC_URL, IDL, keypairPath);
    voters.set(key, voter);
    agentPubkeys.push(voter.publicKey);
    console.log(`  Loaded ${agent.name}: ${voter.publicKey.toBase58()}`);
  }

  if (voters.size === 0) {
    console.error("No agent keypairs loaded. Exiting.");
    process.exit(1);
  }

  async function adminUpdateStatus(questionId: number, newStatus: any): Promise<string> {
    const questionIdBuf = bnToU64LE(BigInt(questionId));
    const questionPda = PublicKey.findProgramAddressSync(
      [Buffer.from("question"), questionIdBuf],
      PROGRAM_ID
    )[0];

    const ix = await adminProgram.methods
      .updateQuestionStatus(newStatus)
      .accounts({
        question: questionPda,
        admin: adminKeypair.publicKey,
      } as any)
      .instruction();

    const tx = new Transaction().add(ix);
    const sig = await adminConnection.sendTransaction(tx, [adminKeypair], { skipPreflight: true });
    await adminConnection.confirmTransaction(sig, "confirmed");
    return sig;
  }

  async function doResearch(qid: number, questionText: string, category: string) {
    const cached = researchCache.get(qid);
    if (cached && Date.now() - cached.timestamp < RESEARCH_CACHE_TTL_MS) {
      console.log(`  [CACHE] Using cached research for Q${qid}`);
      return { searchResults: cached.searchResults, priceData: cached.priceData, onChainData: cached.onChainData };
    }

    let searchResults: SearchResult[] = [];
    let priceData: CryptoPrice[] = [];
    let onChainData = "";

    try {
      searchResults = await tavilySearch(questionText);
    } catch { /* ignore */ }

    if (isCryptoRelated(category, questionText)) {
      try {
        const symbols: string[] = [];
        const text = questionText.toLowerCase();
        if (text.includes("btc") || text.includes("bitcoin")) symbols.push("bitcoin");
        if (text.includes("sol") || text.includes("solana")) symbols.push("solana");
        if (text.includes("eth") || text.includes("ethereum")) symbols.push("ethereum");
        if (symbols.length > 0) {
          priceData = await coingeckoPrices(symbols);
        }
      } catch { /* ignore */ }

      try {
        onChainData = await heliusOnChainData(questionText);
      } catch { /* ignore */ }
    }

    researchCache.set(qid, { searchResults, priceData, onChainData, timestamp: Date.now() });
    return { searchResults, priceData, onChainData };
  }

  async function sendPrivateReward(
    agentWallet: PublicKey,
    amount: number,
    reason: string
  ) {
    try {
      const auth = await getPaymentsAuthToken(adminKeypair, "devnet");
      const treasuryPk = adminKeypair.publicKey.toBase58();
      const agentPk = agentWallet.toBase58();

      const treasuryBal = await getPublicBalance(treasuryPk, DEVNET_USDC_MINT, "devnet");
      if (treasuryBal === "0" || BigInt(treasuryBal) < BigInt(amount)) {
        console.log(`  [PAYMENTS] Skipping private reward — treasury has ${treasuryBal} USDC (need ${amount})`);
        return;
      }

      console.log(`  [PAYMENTS] Building private transfer: ${amount / 1e6} USDC to ${agentPk.slice(0, 8)}... (${reason})`);

      const txData = await buildTransferTx({
        from: treasuryPk,
        to: agentPk,
        amount,
        visibility: "private",
        fromBalance: "base",
        toBalance: "base",
        authToken: auth.token,
        memo: `VERITAS Oracle Reward: ${reason}`,
        split: 1,
        minDelayMs: 0,
        maxDelayMs: 60000,
        clientRefId: String(Date.now()),
      });

      const txBuf = Buffer.from(txData.transactionBase64, "base64");
      let tx: Transaction | VersionedTransaction;
      if (txData.version === "v0") {
        tx = VersionedTransaction.deserialize(txBuf);
      } else {
        tx = Transaction.from(txBuf);
      }

      if (tx instanceof Transaction) {
        tx.partialSign(adminKeypair);
      } else {
        const signers = txData.requiredSigners.filter(s => s === treasuryPk);
        if (signers.length > 0 && (tx as VersionedTransaction).sign) {
          (tx as VersionedTransaction).sign([adminKeypair]);
        }
      }

      const sendConn = txData.sendTo === "ephemeral"
        ? new Connection("https://devnet-as.magicblock.app", "confirmed")
        : adminConnection;

      const serialized = tx instanceof Transaction
        ? tx.serialize()
        : (tx as VersionedTransaction).serialize();

      const sig = await sendConn.sendRawTransaction(serialized, { skipPreflight: true });
      await sendConn.confirmTransaction(sig, "confirmed");
      console.log(`  [PAYMENTS] Private reward sent! TX: ${sig.slice(0, 20)}... (amount hidden on-chain)`);
    } catch (err: any) {
      console.error(`  [PAYMENTS] Private reward failed: ${err.message?.slice(0, 120)}`);
    }
  }

  async function updateReputations(
    qid: number,
    committee: PublicKey[],
    resultNum: number,
    votes: Map<string, number>
  ) {
    if (resultNum === 2) {
      console.log(`  Q${qid} result is UNSURE — no reputation changes`);
      return;
    }

    for (const committeePk of committee) {
      const pkStr = committeePk.toBase58();
      const agentKey = Array.from(voters.entries()).find(
        ([, voter]) => voter.publicKey.equals(committeePk)
      )?.[0];

      let delta = -3;

      if (votes.has(pkStr)) {
        const agentVote = votes.get(pkStr)!;
        delta = agentVote === resultNum ? 10 : -5;
      }

      if (!agentKey) {
        try {
          const adminVoter = voters.values().next().value as OnChainVoter;
          await adminVoter.updateReputation(committeePk, delta);
          console.log(`  Reputation ${delta > 0 ? "+" : ""}${delta} for ${pkStr.slice(0, 8)}...`);
        } catch (err: any) {
          console.error(`  Reputation update failed for ${pkStr.slice(0, 8)}: ${err.message?.slice(0, 60)}`);
        }
        continue;
      }

      const voter = voters.get(agentKey)!;
      try {
        await voter.updateReputation(committeePk, delta);
        console.log(`  ${AGENTS[agentKey].name} reputation ${delta > 0 ? "+" : ""}${delta}`);
      } catch (err: any) {
        console.error(`  ${AGENTS[agentKey].name} reputation failed: ${err.message?.slice(0, 60)}`);
      }
    }
  }

  async function pollAndVote() {
    try {
      const anyVoter = voters.values().next().value as OnChainVoter;
      const config = await anyVoter.fetchConfig();
      if (!config) {
        console.log("Config not found. Waiting...");
        return;
      }

      const questionCount = Number(config.questionCounter);

      for (let qid = 0; qid < questionCount; qid++) {
        const q = await anyVoter.fetchQuestion(qid);
        if (!q) continue;

        const status = statusToNumber(q.status);
        if (status === 5) continue;

        if (skipStore.has(qid)) continue;

        const committee = (q.committee as any[]).filter((c: any) => !c.equals(PublicKey.default));
        const questionText = q.questionText as string;
        const category = q.category as string;
        const isPrivate = status === 6;

        console.log(`\nQuestion #${qid} [${STATUS_LABELS[status] || "Unknown"}]: "${questionText.slice(0, 50)}..."`);

        if (status === 0) {
          console.log(`  Waiting for frontend to select committee...`);
          continue;
        }

        if (status === 1) {
          console.log(`  Committee selected — advancing to CommitPhase...`);
          try {
            const sig = await anyVoter.advanceToCommitPhase(qid);
            console.log(`  Advanced to CommitPhase! TX: ${sig.slice(0, 20)}...`);
          } catch (err: any) {
            console.error(`  Failed to advance to CommitPhase: ${err.message?.slice(0, 100)}`);
          }
          continue;
        }

        if (status === 2 || status === 6) {
          if (status === 6 && !progressStore.has(qid)) {
            const hasCommits = Array.from(commitStore.keys()).some(k => k.endsWith(`-${qid}`));
            if (!hasCommits) {
              console.log(`  PrivateVoting Q${qid} — no persisted commits, starting fresh commit flow`);
              progressStore.set(qid, { phase: "commit", resolvedResult: null, votes: new Map(), failureCount: 0 });
              persistProgressStore();
            }
          }

          // Auto-skip PrivateVoting questions that have persistent TEE/ER delegation failures
          if (status === 6 && progressStore.has(qid)) {
            const progress = progressStore.get(qid)!;
            if ((progress.failureCount || 0) >= 3) {
              console.log(`  PrivateVoting Q${qid} — failed ${progress.failureCount} times (TEE/ER delegation issue), skipping`);
              skipStore.add(qid);
              persistSkipStore();
              continue;
            }
          }

          const eligibleVoters = Array.from(voters.entries()).filter(([key, voter]) =>
            committee.some((c: any) => c.equals(voter.publicKey))
          );

          if (eligibleVoters.length === 0) {
            console.log(`  No matching agents in committee — skipping (committee: ${committee.map((c: any) => c.toBase58().slice(0, 8)).join(", ")})`);
            continue;
          }

          for (const [agentKey, voter] of eligibleVoters) {
            const commitKey = `${agentKey}-${qid}`;
            if (commitStore.has(commitKey)) {
              continue;
            }

            console.log(`  ${AGENTS[agentKey].name} researching...`);
            const { searchResults, priceData, onChainData } = await doResearch(qid, questionText, category);
            const research = await researchQuestion(
              agentKey, questionText, category, GROQ_API_KEY, MISTRAL_API_KEY,
              searchResults, priceData, onChainData
            );

            try {
              const { signature, salt } = await voter.commitVote(
                qid, research.vote, research.confidence, research.evidenceHash
              );
              commitStore.set(commitKey, {
                questionId: qid,
                vote: research.vote,
                salt,
                confidence: research.confidence,
                evidenceHash: research.evidenceHash,
              });
              persistCommitStore();
              console.log(`  ${AGENTS[agentKey].name} committed! TX: ${signature.slice(0, 20)}...`);
            } catch (err: any) {
              if (err.code === "ALREADY_COMMITTED" && commitStore.has(commitKey)) {
                console.log(`  ${AGENTS[agentKey].name} already committed (persisted store), continuing...`);
              } else {
                console.error(`  ${AGENTS[agentKey].name} commit failed: ${err.message?.slice(0, 100)}`);
                if (isPrivate && progressStore.has(qid)) {
                  const progress = progressStore.get(qid)!;
                  progress.failureCount = (progress.failureCount || 0) + 1;
                  persistProgressStore();
                }
              }
            }
          }

          const allCommitted = eligibleVoters.every(([key]) =>
            commitStore.has(`${key}-${qid}`)
          );

          if (allCommitted && eligibleVoters.length > 0) {
            if (isPrivate) {
              console.log(`  All committed (private) — starting reveals via ER/TEE endpoint...`);
              progressStore.set(qid, { phase: "reveal", resolvedResult: null, votes: new Map() });
              persistProgressStore();
              const progress = progressStore.get(qid)!;
              for (const [agentKey, voter] of eligibleVoters) {
                const commitKey = `${agentKey}-${qid}`;
                const pending = commitStore.get(commitKey);
                if (!pending) continue;
                try {
                  const sig = await voter.revealVote(
                    qid, pending.vote, pending.salt, pending.confidence, pending.evidenceHash
                  );
                  console.log(`  ${AGENTS[agentKey].name} revealed (private)! TX: ${sig.slice(0, 20)}...`);
                  const pkStr = voter.publicKey.toBase58();
                  progress.votes.set(pkStr, pending.vote);
                  commitStore.delete(commitKey);
                  persistCommitStore();
                } catch (err: any) {
                  console.error(`  ${AGENTS[agentKey].name} reveal failed: ${err.message?.slice(0, 100)}`);
                }
              }
              if (progress.votes.size > 0) {
                progress.phase = "resolve";
              }
            } else {
              console.log(`  All committed — advancing to RevealPhase...`);
              try {
                const sig = await adminUpdateStatus(qid, { revealPhase: {} });
                console.log(`  RevealPhase! TX: ${sig.slice(0, 20)}...`);
              } catch (err: any) {
                console.error(`  Status update failed: ${err.message?.slice(0, 80)}`);
              }
            }
          }
          continue;
        }

        if (status === 3) {
          // RevealPhase: we can only reveal if we have persisted commit data
          // We CANNOT commit in RevealPhase — the program rejects it (6003)
          const eligibleVoters = Array.from(voters.entries()).filter(([key, voter]) =>
            committee.some((c: any) => c.equals(voter.publicKey))
          );

          if (eligibleVoters.length === 0) {
            console.log(`  RevealPhase — no matching agents, skipping`);
            skipStore.add(qid);
            persistSkipStore();
            continue;
          }

          const hasAnyCommitForQ = Array.from(commitStore.keys()).some(k => k.endsWith(`-${qid}`));
          if (!hasAnyCommitForQ) {
            console.log(`  RevealPhase with no persisted commits — cannot commit or reveal. Skipping (add to skipStore).`);
            skipStore.add(qid);
            persistSkipStore();
            continue;
          }

          const progress = progressStore.get(qid);
          const votes: Map<string, number> = new Map();

          if (progress && progress.votes.size > 0) {
            for (const [pkStr, v] of progress.votes) {
              votes.set(pkStr, v);
            }
          }

          // Reveal all persisted commits
          for (const [agentKey, voter] of eligibleVoters) {
            const commitKey = `${agentKey}-${qid}`;
            const pending = commitStore.get(commitKey);
            if (!pending) continue;

            try {
              const sig = await voter.revealVote(
                qid, pending.vote, pending.salt, pending.confidence, pending.evidenceHash
              );
              console.log(`  ${AGENTS[agentKey].name} revealed! TX: ${sig.slice(0, 20)}...`);
              const pkStr = voter.publicKey.toBase58();
              votes.set(pkStr, pending.vote);
              commitStore.delete(commitKey);
              persistCommitStore();
            } catch (err: any) {
              console.error(`  ${AGENTS[agentKey].name} reveal failed: ${err.message?.slice(0, 100)}`);
            }
          }

          const anyCommitLeft = Array.from(commitStore.keys()).some(k => k.endsWith(`-${qid}`));
          if (!anyCommitLeft && votes.size > 0) {
            console.log(`  All reveals done — resolving question...`);
            try {
              const firstVoter = eligibleVoters[0]?.[1] || voters.values().next().value as OnChainVoter;
              const wasPrivate = progress != null;
              const sig = await firstVoter.resolveQuestion(qid, wasPrivate);
              console.log(`  Resolved! TX: ${sig.slice(0, 20)}...`);

              let resultNum: number;
              if (wasPrivate) {
                // For private questions, base layer votes are 0 — use in-memory votes
                resultNum = computeResultFromVotes(votes, committee);
                console.log(`  Result (from in-memory votes): ${["YES", "NO", "UNSURE"][resultNum]}`);
              } else {
                const resolvedQ = await anyVoter.fetchQuestion(qid);
                if (resolvedQ?.result) {
                  resultNum = voteResultToNumber(resolvedQ.result);
                  console.log(`  Result: ${["YES", "NO", "UNSURE"][resultNum]}`);
                } else {
                  resultNum = computeResultFromVotes(votes, committee);
                  console.log(`  Result (fallback to in-memory): ${["YES", "NO", "UNSURE"][resultNum]}`);
                }
              }
              await updateReputations(qid, committee, resultNum, votes);

              // Send private USDC rewards to correct agents
              if (resultNum !== 2) {
                const REWARD_AMOUNT = 100_000; // 0.1 USDC (6 decimals)
                for (const [pkStr, agentVote] of votes) {
                  if (agentVote === resultNum) {
                    await sendPrivateReward(new PublicKey(pkStr), REWARD_AMOUNT, `Q${qid} correct vote`);
                  }
                }
              }

              if (wasPrivate) {
                try {
                  const sig2 = await firstVoter.undelegateQuestion(qid);
                  console.log(`  Undelegated! TX: ${sig2.slice(0, 20)}...`);
                } catch (err: any) {
                  console.error(`  Undelegate failed: ${err.message?.slice(0, 80)}`);
                }
              }
              progressStore.delete(qid);
              persistProgressStore();
            } catch (err: any) {
              console.error(`  Resolve failed: ${err.message?.slice(0, 80)}`);
            }
          }
          continue;
        }

        if (status === 6 && !progressStore.has(qid)) {
          // PrivateVoting question with no progress — check if we have commits in persistent store
          const hasCommits = Array.from(commitStore.keys()).some(k => k.endsWith(`-${qid}`));
          if (hasCommits) {
            console.log(`  PrivateVoting Q${qid} has persisted commits — creating progress entry for reveals`);
            progressStore.set(qid, { phase: "reveal", resolvedResult: null, votes: new Map() });
            persistProgressStore();
          } else {
            console.log(`  PrivateVoting Q${qid} — no commits found, waiting for fresh commits`);
          }
        }

        if (status === 6 && progressStore.has(qid)) {
          const progress = progressStore.get(qid)!;

          if (progress.phase === "resolve") {
            try {
              const firstVoter = Array.from(voters.entries()).find(([, v]) =>
                committee.some((c: any) => c.equals(v.publicKey))
              )?.[1] || voters.values().next().value as OnChainVoter;

              const sig = await firstVoter.resolveQuestion(qid, true);
              console.log(`  Resolved (private)! TX: ${sig.slice(0, 20)}...`);
              progress.phase = "undelegate";
              persistProgressStore();
            } catch (err: any) {
              console.error(`  Resolve (private) failed: ${err.message?.slice(0, 80)}`);
            }
          }

          if (progress.phase === "undelegate") {
            try {
              const firstVoter = Array.from(voters.entries()).find(([, v]) =>
                committee.some((c: any) => c.equals(v.publicKey))
              )?.[1] || voters.values().next().value as OnChainVoter;

              const sig = await firstVoter.undelegateQuestion(qid);
              console.log(`  Undelegated! TX: ${sig.slice(0, 20)}...`);
              progress.phase = "reputation";
              persistProgressStore();
            } catch (err: any) {
              console.error(`  Undelegate failed: ${err.message?.slice(0, 80)}`);
              progress.phase = "reputation";
              persistProgressStore();
            }
          }

          if (progress.phase === "reputation") {
            const resultNum = computeResultFromVotes(progress.votes, committee);
            await updateReputations(qid, committee, resultNum, progress.votes);
            progress.phase = "done";
            progressStore.delete(qid);
          }
          continue;
        }
      }
    } catch (err: any) {
      console.error("Poll error:", err.message?.slice(0, 200));
    }
  }

  function computeResultFromVotes(votes: Map<string, number>, committee: PublicKey[]): number {
    let yes = 0, no = 0, unsure = 0;
    for (const v of votes.values()) {
      if (v === 0) yes++;
      else if (v === 1) no++;
      else unsure++;
    }
    const total = yes + no + unsure;
    if (total === 0) return 2;
    if ((yes / total) * 100 >= 70) return 0;
    if ((no / total) * 100 >= 70) return 1;
    return 2;
  }

  console.log("\nStarting poll loop...");
  startSSEServer();
  await pollAndVote();
  setInterval(pollAndVote, POLL_INTERVAL_MS);
}

main().catch(console.error);
