"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  TrendingUp,
  Clock,
  ShieldCheck,
  Eye,
  EyeOff,
  MessageSquare,
  CheckCircle2,
  Loader2,
  Vote,
  ExternalLink,
  AlertTriangle,
  Lock,
  Zap,
  Fingerprint,
  Globe,
  Activity,
} from "lucide-react";
import { PublicKey, Transaction, VersionedTransaction } from "@solana/web3.js";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { useQuestion, useAgents } from "@/hooks/use-on-chain";
import { QuestionStatus, TEE_VALIDATOR, KNOWN_AGENTS, CLUSTER } from "@/lib/constants";
import { useAnchor } from "@/components/providers/anchor-provider";
import { GradientHeading } from "@/components/ui/gradient-heading";
import { LiveTerminal } from "@/components/ui/live-terminal";
import { StackVerification } from "@/components/ui/stack-verification";

// Map Anchor error codes to human-readable messages
function getErrorMessage(error: any): string {
  const msg = error?.message || error?.toString() || "";
  
  // Check for custom error codes in the message
  if (msg.includes("Custom:3007")) return "Account is delegated to TEE — status must be updated via Ephemeral Rollup endpoint";
  if (msg.includes("Transaction too large")) return "Transaction too large — breaking into smaller transactions";
  if (msg.includes("Custom:6000")) return "Question not found on-chain";
  if (msg.includes("Custom:6001")) return "Agent not found";
  if (msg.includes("Custom:6002")) return "Only committee members can vote";
  if (msg.includes("Custom:6003")) return "Commit phase is not active";
  if (msg.includes("Custom:6004")) return "Reveal phase is not active — advance status first";
  if (msg.includes("Custom:6005")) return "Vote hash mismatch — reveal doesn't match commit";
  if (msg.includes("Custom:6006")) return "Agent already revealed their vote";
  if (msg.includes("Custom:6007")) return "Consensus was not reached";
  if (msg.includes("Custom:6008")) return "Question already resolved";
  if (msg.includes("Custom:6009")) return "Agent has insufficient reputation";
  if (msg.includes("Custom:6010")) return "Agent is not active";
  if (msg.includes("Custom:6011")) return "Invalid status for this operation";
  if (msg.includes("Custom:6012")) return "Invalid status transition";
  if (msg.includes("Custom:6013")) return "Question text too long (max 256 chars)";
  if (msg.includes("Custom:6014")) return "Name too long (max 32 chars)";
  if (msg.includes("Custom:6015")) return "Category too long (max 32 chars)";
  if (msg.includes("Custom:6016")) return "Deadline must be in the future";
  if (msg.includes("Custom:6017")) return "Invalid vote value";
  if (msg.includes("Custom:6018")) return "Confidence must be 0-100";
  if (msg.includes("Custom:6019")) return "No votes have been cast — agents need to commit first";
  if (msg.includes("Custom:6020")) return "Question has not been resolved";
  if (msg.includes("Custom:6021")) return "Not enough agents for committee";
  if (msg.includes("Custom:6022")) return "Arithmetic overflow";
  if (msg.includes("Custom:6023")) return "Human verification required";
  if (msg.includes("Custom:6024")) return "Attestation already exists";
  if (msg.includes("Custom:6025")) return "Agent already committed";
  if (msg.includes("Custom:6026")) return "Invalid TEE validator address";
  if (msg.includes("Custom:6027")) return "Permission creation failed";
  
  // Generic errors
  if (msg.includes("0x1")) return "Insufficient funds for transaction";
  if (msg.includes("blockhash not found")) return "Network busy — try again";
  if (msg.includes("User rejected")) return "Transaction rejected by user";
  
  return msg;
}

const PHASE_STEPS = [
  { key: 0, label: "Question Submitted", icon: TrendingUp },
  { key: 1, label: "Committee Selected (VRF)", icon: ShieldCheck },
  { key: 2, label: "Commit Phase (Hashed)", icon: EyeOff },
  { key: 3, label: "Reveal Phase", icon: Eye },
  { key: 4, label: "Discussion", icon: MessageSquare },
  { key: 5, label: "Resolved", icon: CheckCircle2 },
  { key: 6, label: "Private Voting (TEE)", icon: ShieldCheck },
];

export default function QuestionDetailPage() {
  const params = useParams();
  const id = parseInt(params?.id as string, 10);
  const { question, loading, isRefetching, refetch } = useQuestion(id);
  const { agents } = useAgents();
  const { enablePrivateVoting, selectCommittee, adminSetCommittee, updateQuestionStatus, resolveQuestion, isAdmin, connected, publicKey } = useAnchor();
  const { sendTransaction, wallet: walletAdapter } = useWallet();
  const { connection } = useConnection();
  const [perLoading, setPerLoading] = useState(false);
  const [perTxHash, setPerTxHash] = useState<string | null>(null);
  const [perError, setPerError] = useState<string | null>(null);
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminTxHash, setAdminTxHash] = useState<string | null>(null);
  const [adminError, setAdminError] = useState<string | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);
  const [statusTxHash, setStatusTxHash] = useState<string | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [resolveLoading, setResolveLoading] = useState(false);
  const [resolveTxHash, setResolveTxHash] = useState<string | null>(null);
  const [resolveError, setResolveError] = useState<string | null>(null);
  const [isAdminUser, setIsAdminUser] = useState(false);
  const [isAdminChecking, setIsAdminChecking] = useState(false);
  const [privateRewardLoading, setPrivateRewardLoading] = useState(false);
  const [privateRewardTxHash, setPrivateRewardTxHash] = useState<string | null>(null);
  const [privateRewardTxHashes, setPrivateRewardTxHashes] = useState<string[]>([]);
  const [privateRewardError, setPrivateRewardError] = useState<string | null>(null);

  // Auto-refresh when waiting for VRF callback
  useEffect(() => {
    if (!question) return;
    if ((question.status >= 1 && question.status <= 4) || question.status === 6) {
      const interval = setInterval(() => {
        refetch();
      }, 15000);
      return () => clearInterval(interval);
    }
  }, [question?.status, refetch]);

  useEffect(() => {
    if (publicKey) {
      setIsAdminChecking(true);
      isAdmin()
        .then((result) => {
          setIsAdminUser(result);
        })
        .catch((err) => {
          console.error("Admin check failed:", err);
          setIsAdminUser(false);
        })
        .finally(() => {
          setIsAdminChecking(false);
        });
    } else {
      setIsAdminUser(false);
    }
  }, [publicKey, isAdmin]);

  if (loading) {
    return (
      <div className="min-h-screen bg-cream font-mono flex items-center justify-center bg-noise">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-black/40" />
          <p className="font-heading text-lg font-black uppercase text-black/30 mt-4">
            Loading question #{id}...
          </p>
        </div>
      </div>
    );
  }

  if (!question) {
    return (
      <div className="min-h-screen bg-cream font-mono flex items-center justify-center">
        <div className="text-center">
          <h1 className="font-heading text-4xl font-black uppercase">Question Not Found</h1>
          <Link href="/questions" className="text-solana-purple font-bold mt-4 inline-block">Back to Questions</Link>
        </div>
      </div>
    );
  }

  const committeeAgents = question.committee.map((pk) => {
    const found = agents.find((a) => a.wallet.equals(pk));
    if (found) return found;
    // Fallback to known agents for demo
    const known = KNOWN_AGENTS[pk.toBase58()];
    if (known) {
      return { wallet: pk, name: known.name, reputation: 500, color: known.color };
    }
    return { wallet: pk, name: pk.toBase58().slice(0, 8) + "...", reputation: 0, color: "#A7F3D0" };
  });

  const totalVotes = question.yesVotes + question.noVotes + question.unsureVotes;
  const yesPct = totalVotes > 0 ? Math.round((question.yesVotes / totalVotes) * 100) : 0;
  const noPct = totalVotes > 0 ? Math.round((question.noVotes / totalVotes) * 100) : 0;

  return (
    <div className="min-h-screen bg-cream font-mono bg-noise">
      <div className="fixed inset-0 bg-dot-pattern opacity-[0.06] pointer-events-none z-0" />

      <div className="relative z-10">
        <div className="bg-black text-white py-3 border-brutal-b">
          <div className="mx-auto w-[95%] max-w-7xl flex items-center justify-between">
            <Link href="/questions" className="flex items-center gap-3 hover:text-lime-green transition-colors">
              <ArrowLeft className="w-5 h-5" strokeWidth={3} />
              <span className="font-heading font-black uppercase tracking-tighter">Back</span>
            </Link>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-white/40">
                {question.category}
              </span>
              {isRefetching && (
                <Loader2 className="w-3 h-3 animate-spin text-white/60" />
              )}
              <span className={`px-2 py-1 border-2 font-heading font-black text-[10px] uppercase ${
                question.status === 5 ? "bg-lime-green text-black border-black" :
                question.status >= 2 && question.status <= 4 ? "bg-solana-purple text-white border-white/30" :
                "bg-cyber-yellow text-black border-black"
              }`}>
                {question.statusLabel}
              </span>
            </div>
          </div>
        </div>

        <div className="py-8">
          <div className="mx-auto w-[95%] max-w-7xl grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white border-brutal shadow-brutal p-6 md:p-8">
                <GradientHeading variant="solana" size="lg" className="mb-4">
                  {question.questionText}
                </GradientHeading>
                <div className="flex items-center gap-6 font-mono text-sm font-bold text-black/50">
                  <div className="flex items-center gap-1">
                    <Vote className="w-4 h-4" />
                    ID: {question.questionId}
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {new Date(question.deadline * 1000).toLocaleDateString()}
                  </div>
                  <div className="flex items-center gap-1">
                    <TrendingUp className="w-4 h-4" />
                    Fee: {question.queryFee / 1e9} SOL
                  </div>
                </div>
              </div>

              <div className="bg-white border-brutal shadow-brutal p-6 md:p-8">
                <h2 className="font-heading text-xl font-black uppercase tracking-tight border-brutal-b pb-3 mb-6 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Resolution Pipeline
                </h2>
                <div className="flex items-center gap-1">
                  {PHASE_STEPS.map((step, i) => {
                    const isComplete = step.key < question.status;
                    const isCurrent = step.key === question.status;
                    const Icon = step.icon;
                    const isLast = i === PHASE_STEPS.length - 1;

                    return (
                      <div key={step.key} className="flex-1 flex flex-col items-center relative">
                        <div className={`w-10 h-10 flex items-center justify-center border-2 mb-2 transition-all duration-300 ${
                          isCurrent ? "border-solana-purple bg-solana-purple text-white shadow-[0_0_10px_rgba(153,69,255,0.3)]" :
                          isComplete ? "border-lime-green bg-lime-green text-black" :
                          "border-black/20 bg-white text-black/30"
                        }`}>
                          <Icon className="w-5 h-5" strokeWidth={2.5} />
                        </div>
                        <p className={`font-heading font-black text-[10px] uppercase text-center leading-tight ${
                          isCurrent ? "text-solana-purple" : isComplete ? "text-lime-green" : "text-black/25"
                        }`}>
                          {step.label}
                        </p>
                        {isCurrent && (
                          <span className="mt-1 px-1.5 py-0.5 bg-solana-purple text-white font-mono text-[8px] font-bold uppercase animate-pulse">
                            Live
                          </span>
                        )}
                        {!isLast && (
                          <div className="absolute top-5 left-[60%] w-[80%] h-0.5 bg-black/10">
                            <div
                              className={`h-full transition-all duration-500 ${isComplete ? "bg-lime-green w-full" : "w-0"}`}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="bg-white border-brutal shadow-brutal p-6 md:p-8">
                <h2 className="font-heading text-xl font-black uppercase tracking-tight border-brutal-b pb-3 mb-6 flex items-center gap-2">
                  <Vote className="w-5 h-5" />
                  Vote Tally
                </h2>
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { label: "YES", count: question.yesVotes, borderColor: "#A7F3D0", textColor: "#A7F3D0", bgColor: "rgba(167,243,208,0.05)" },
                    { label: "NO", count: question.noVotes, borderColor: "#FF6B6B", textColor: "#FF6B6B", bgColor: "rgba(255,107,107,0.05)" },
                    { label: "UNSURE", count: question.unsureVotes, borderColor: "#FFD700", textColor: "#FFD700", bgColor: "rgba(255,215,0,0.05)" },
                  ].map((item) => {
                    const pct = totalVotes > 0 ? Math.round((item.count / totalVotes) * 100) : 0;
                    return (
                      <div key={item.label} className="border-4 p-4 text-center relative overflow-hidden" style={{ borderColor: item.borderColor, backgroundColor: item.bgColor }}>
                        <div
                          className="absolute bottom-0 left-0 h-1 transition-all duration-700"
                          style={{ width: `${pct}%`, backgroundColor: item.borderColor }}
                        />
                        <p className="font-mono text-xs font-bold uppercase mb-2" style={{ color: item.textColor }}>{item.label}</p>
                        <p className="font-heading font-black text-3xl tabular-nums" style={{ color: item.textColor }}>
                          {item.count}
                        </p>
                        {totalVotes > 0 && (
                          <p className="font-mono text-[10px] text-black/30 mt-1">{pct}%</p>
                        )}
                      </div>
                    );
                  })}
                </div>
                {totalVotes > 0 && (
                  <div className="mt-5 h-4 border-2 border-black flex overflow-hidden">
                    <div className="bg-lime-green transition-all duration-500" style={{ width: `${yesPct}%` }} />
                    <div className="bg-hot-coral transition-all duration-500" style={{ width: `${noPct}%` }} />
                    <div className="bg-cyber-yellow transition-all duration-500" style={{ width: `${100 - yesPct - noPct}%` }} />
                  </div>
                )}
                {question.result !== null && (
                  <div className="mt-4 p-4 border-4 border-lime-green bg-lime-green/10 flex items-center gap-3">
                    <CheckCircle2 className="w-6 h-6 text-lime-green" />
                    <div>
                      <p className="font-heading font-black uppercase text-sm">Resolved: {question.resultLabel}</p>
                      <p className="font-mono text-xs text-black/50">Confidence: {question.confidence}%</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-white border-brutal shadow-brutal p-6">
                <h2 className="font-heading text-xl font-black uppercase tracking-tight border-brutal-b pb-3 mb-4">
                  Committee (VRF)
                </h2>
                {committeeAgents.length > 0 ? (
                  <div className="space-y-3">
                    {committeeAgents.map((agent, i) => (
                      <Link
                        key={i}
                        href={`/agent/${agent.wallet.toBase58()}`}
                        className="flex items-center gap-3 p-3 border-2 border-black bg-cream hover:bg-lime-green transition-colors"
                      >
                        <div
                          className="w-4 h-4 border-2 border-black"
                          style={{ backgroundColor: agent.color }}
                        />
                        <span className="font-heading font-black text-xs uppercase">
                          {typeof agent.name === "string" ? agent.name : "Agent"}
                        </span>
                        <span className="font-mono text-[10px] font-bold text-black/50 ml-auto">
                          Rep: {agent.reputation}
                        </span>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <ShieldCheck className="w-8 h-8 text-black/20 mx-auto mb-2" />
                    <p className="font-mono text-xs font-bold uppercase text-black/30">
                      Committee not yet selected
                    </p>
                  </div>
                )}

                {question.committee.length > 0 && (
                  <div className="mt-2 p-2 bg-cream border border-black/10">
                    <p className="font-mono text-[9px] text-black/30">
                      Status: {question.statusLabel} | Committee: {question.committee.length}
                    </p>
                  </div>
                )}

                {question.status === QuestionStatus.Pending && isAdminUser && (
                  <div className="mt-4 pt-4 border-t-4 border-black">
                    {isAdminChecking ? (
                      <div className="p-3 bg-cream border-2 border-black/20 text-center">
                        <Loader2 className="w-4 h-4 animate-spin mx-auto text-black/40" />
                        <p className="font-mono text-[10px] text-black/40 mt-1">Checking admin status...</p>
                      </div>
                    ) : (
                      <>
                        <button
                          onClick={async () => {
                            setAdminLoading(true);
                            setAdminError(null);
                            setAdminTxHash(null);
                            try {
                              const committee = Object.keys(KNOWN_AGENTS).slice(0, 3).map(k => new PublicKey(k));
                              const sig = await adminSetCommittee(id, committee);
                              setAdminTxHash(sig);
                              await refetch();
                            } catch (e: any) {
                              setAdminError(getErrorMessage(e));
                            } finally {
                              setAdminLoading(false);
                            }
                          }}
                          disabled={adminLoading}
                          className="w-full p-3 bg-solana-purple text-white font-heading font-black uppercase text-sm border-2 border-black hover:bg-solana-purple/80 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        >
                          {adminLoading ? "Selecting Committee..." : "Select Committee (VRF + Demo Agents)"}
                        </button>
                        {adminTxHash && (
                          <div className="mt-2 space-y-2">
                            <div className="p-2 bg-lime-green/10 border-2 border-lime-green">
                              <p className="font-mono text-[10px] text-lime-green font-bold">Committee Selected!</p>
                              <a
                                href={`https://explorer.solana.com/tx/${adminTxHash}?cluster=${CLUSTER}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-mono text-[10px] text-solana-purple hover:underline break-all flex items-center gap-1"
                              >
                                <ExternalLink className="w-3 h-3" />
                                Transaction: {adminTxHash.slice(0, 20)}...
                              </a>
                            </div>
                          </div>
                        )}
                         {adminError && (
                          <p className="mt-2 font-mono text-[10px] text-hot-coral break-all">
                            Error: {adminError}
                          </p>
                        )}

                        {isAdminUser && (
                          <div className="mt-3 pt-3 border-t-2 border-black/10">
                            <p className="font-mono text-[9px] text-black/40 mb-2 uppercase">Alternative: On-Chain VRF Entropy</p>
                            <button
                              onClick={async () => {
                                setAdminLoading(true);
                                setAdminError(null);
                                setAdminTxHash(null);
                                try {
                                  const sig = await selectCommittee(id);
                                  setAdminTxHash(sig);
                                  await refetch();
                                } catch (e: any) {
                                  setAdminError(getErrorMessage(e));
                                } finally {
                                  setAdminLoading(false);
                                }
                              }}
                              disabled={adminLoading}
                              className="w-full p-2 bg-cyber-yellow text-black font-heading font-black uppercase text-xs border-2 border-black hover:bg-cyber-yellow/80 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                            >
                              {adminLoading ? "Selecting..." : "VRF Committee (Slot Hash Entropy)"}
                            </button>
                            <p className="mt-1 font-mono text-[8px] text-black/30">
                              Uses on-chain slot hashes — may pick unknown agents without keypairs
                            </p>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}

                {question.status === QuestionStatus.CommitteeSelected && (
                  <div className="mt-4 pt-4 border-t-4 border-black space-y-3">
                    <div className="p-3 bg-solana-purple/10 border-2 border-solana-purple">
                      <p className="font-mono text-[10px] text-solana-purple font-bold">Committee selected — orchestrator will auto-advance to Commit Phase</p>
                      <p className="font-mono text-[8px] text-black/40 mt-1">Or click below to advance manually</p>
                    </div>
                    <button
                      onClick={async () => {
                        setStatusLoading(true);
                        setStatusError(null);
                        setStatusTxHash(null);
                        try {
                          await refetch();
                          if (question.status !== QuestionStatus.CommitteeSelected) {
                            setStatusError("Status already changed — refresh page");
                            setStatusLoading(false);
                            return;
                          }
                          const sig = await updateQuestionStatus(id, { commitPhase: {} });
                          setStatusTxHash(sig);
                          await refetch();
                        } catch (e: any) {
                          setStatusError(getErrorMessage(e));
                        } finally {
                          setStatusLoading(false);
                        }
                      }}
                      disabled={statusLoading || !connected || !isAdminUser}
                      className="w-full p-3 bg-lime-green text-black font-heading font-black uppercase text-sm border-2 border-black hover:bg-lime-green/80 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      {statusLoading ? "Advancing..." : "Start Voting (Commit Phase)"}
                    </button>
                    {statusTxHash && (
                      <div className="p-2 bg-lime-green/10 border-2 border-lime-green">
                        <p className="font-mono text-[10px] text-lime-green font-bold">Commit Phase started!</p>
                        <a href={`https://explorer.solana.com/tx/${statusTxHash}?cluster=${CLUSTER}`} target="_blank" rel="noopener noreferrer" className="font-mono text-[10px] text-solana-purple hover:underline break-all flex items-center gap-1">
                          <ExternalLink className="w-3 h-3" />TX: {statusTxHash.slice(0, 20)}...
                        </a>
                      </div>
                    )}
                    {statusError && <p className="font-mono text-[10px] text-hot-coral break-all">Error: {statusError}</p>}
                  </div>
                )}

                {question.status === QuestionStatus.CommitPhase && isAdminUser && (
                  <div className="mt-4 pt-4 border-t-4 border-black space-y-3">
                    <button
                      onClick={async () => {
                        setStatusLoading(true);
                        setStatusError(null);
                        setStatusTxHash(null);
                        try {
                          const sig = await updateQuestionStatus(id, { revealPhase: {} });
                          setStatusTxHash(sig);
                          await refetch();
                        } catch (e: any) {
                          setStatusError(getErrorMessage(e));
                        } finally {
                          setStatusLoading(false);
                        }
                      }}
                      disabled={statusLoading}
                      className="w-full p-2 bg-solana-purple text-white font-heading font-black uppercase text-xs border-2 border-black hover:bg-solana-purple/80 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      {statusLoading ? "Advancing..." : "Admin: Advance to Reveal Phase"}
                    </button>
                    {statusTxHash && (
                      <a href={`https://explorer.solana.com/tx/${statusTxHash}?cluster=${CLUSTER}`} target="_blank" rel="noopener noreferrer" className="font-mono text-[10px] text-solana-purple hover:underline flex items-center gap-1">
                        <ExternalLink className="w-3 h-3" />TX: {statusTxHash.slice(0, 20)}...
                      </a>
                    )}
                    {statusError && <p className="font-mono text-[10px] text-hot-coral break-all">Error: {statusError}</p>}
                  </div>
                )}

                {question.status === QuestionStatus.RevealPhase && isAdminUser && (
                  <div className="mt-4 pt-4 border-t-4 border-black space-y-3">
                    <button
                      onClick={async () => {
                        setResolveLoading(true);
                        setResolveError(null);
                        setResolveTxHash(null);
                        try {
                          const sig = await resolveQuestion(id);
                          setResolveTxHash(sig);
                          await refetch();
                        } catch (e: any) {
                          setResolveError(getErrorMessage(e));
                        } finally {
                          setResolveLoading(false);
                        }
                      }}
                      disabled={resolveLoading || (question.yesVotes + question.noVotes + question.unsureVotes) === 0}
                      className="w-full p-3 bg-lime-green text-black font-heading font-black uppercase text-sm border-2 border-black hover:bg-lime-green/80 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      {resolveLoading ? "Resolving..." : (question.yesVotes + question.noVotes + question.unsureVotes) === 0 ? `Waiting for ${question.committee.length} agent votes...` : `Resolve (${question.yesVotes + question.noVotes + question.unsureVotes}/${question.committee.length} votes)`}
                    </button>
                    {resolveTxHash && (
                      <div className="p-2 bg-lime-green/10 border-2 border-lime-green">
                        <p className="font-mono text-[10px] text-lime-green font-bold">Question Resolved!</p>
                        <a href={`https://explorer.solana.com/tx/${resolveTxHash}?cluster=${CLUSTER}`} target="_blank" rel="noopener noreferrer" className="font-mono text-[10px] text-solana-purple hover:underline flex items-center gap-1">
                          <ExternalLink className="w-3 h-3" />TX: {resolveTxHash.slice(0, 20)}...
                        </a>
                      </div>
                    )}
                    {resolveError && <p className="font-mono text-[10px] text-hot-coral break-all">Error: {resolveError}</p>}
                  </div>
                )}

                {question.status === QuestionStatus.DiscussionPhase && isAdminUser && (
                  <div className="mt-4 pt-4 border-t-4 border-black space-y-3">
                    <button
                      onClick={async () => {
                        setResolveLoading(true);
                        setResolveError(null);
                        setResolveTxHash(null);
                        try {
                          const sig = await resolveQuestion(id);
                          setResolveTxHash(sig);
                          await refetch();
                        } catch (e: any) {
                          setResolveError(getErrorMessage(e));
                        } finally {
                          setResolveLoading(false);
                        }
                      }}
                      disabled={resolveLoading || (question.yesVotes + question.noVotes + question.unsureVotes) === 0}
                      className="w-full p-3 bg-lime-green text-black font-heading font-black uppercase text-sm border-2 border-black hover:bg-lime-green/80 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      {resolveLoading ? "Resolving..." : (question.yesVotes + question.noVotes + question.unsureVotes) === 0 ? `Waiting for ${question.committee.length} agent votes...` : `Resolve (${question.yesVotes + question.noVotes + question.unsureVotes}/${question.committee.length} votes)`}
                    </button>
                    {resolveTxHash && (
                      <a href={`https://explorer.solana.com/tx/${resolveTxHash}?cluster=${CLUSTER}`} target="_blank" rel="noopener noreferrer" className="font-mono text-[10px] text-solana-purple hover:underline flex items-center gap-1">
                        <ExternalLink className="w-3 h-3" />TX: {resolveTxHash.slice(0, 20)}...
                      </a>
                    )}
                    {resolveError && <p className="font-mono text-[10px] text-hot-coral break-all">Error: {resolveError}</p>}
                  </div>
                )}
              </div>

              {(question.status === QuestionStatus.CommitteeSelected || question.status === QuestionStatus.CommitPhase) && !question.isImproperlyDelegated && (
                <div className="bg-white border-brutal shadow-brutal p-6">
                  <h2 className="font-heading text-xl font-black uppercase tracking-tight border-brutal-b pb-3 mb-4 flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-solana-purple" />
                    PER/TEE Privacy
                  </h2>
                  <div className="space-y-3">
                    <div className="bg-cream border-2 border-black/10 p-3">
                      <p className="font-mono text-[10px] font-bold uppercase text-black/40 mb-2">What this does:</p>
                      <ol className="font-mono text-xs text-black/60 space-y-1 list-decimal list-inside">
                        <li>Create permission account (access control)</li>
                        <li>Delegate question PDA to TEE validator</li>
                        <li>Switch status to PrivateVoting</li>
                      </ol>
                    </div>
                    {question.isLegacy ? (
                      <div className="p-3 bg-hot-coral/10 border-2 border-hot-coral">
                        <p className="font-mono text-xs text-hot-coral font-bold">
                          <AlertTriangle className="w-3 h-3 inline mr-1" />
                          Not Available — Legacy account format lacks PER/TEE fields
                        </p>
                      </div>
                    ) : (
                      <>
                        {(question.status === QuestionStatus.CommitteeSelected || question.status === QuestionStatus.CommitPhase) ? (
                          <button
                            onClick={async () => {
                              setPerLoading(true);
                              setPerError(null);
                              setPerTxHash(null);
                              try {
                                const sig = await enablePrivateVoting(id);
                                setPerTxHash(sig);
                                await refetch();
                              } catch (e: any) {
                                setPerError(getErrorMessage(e));
                              } finally {
                                setPerLoading(false);
                              }
                            }}
                            disabled={!connected || perLoading}
                            className="w-full p-3 bg-solana-purple text-white font-heading font-black uppercase text-sm border-2 border-black hover:bg-solana-purple/80 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                          >
                            {perLoading ? "Processing..." : "Enable Private Voting (PER/TEE)"}
                          </button>
                        ) : (
                          <div className="p-3 bg-cyber-yellow/10 border-2 border-cyber-yellow">
                            <p className="font-mono text-xs text-black/70">
                              <AlertTriangle className="w-3 h-3 inline mr-1" />
                              PER/TEE can only be enabled when question is in CommitteeSelected or CommitPhase status.
                            </p>
                          </div>
                        )}
                      </>
                    )}
                    {perTxHash && (
                      <div className="mt-2 p-2 bg-lime-green/10 border-2 border-lime-green">
                        <p className="font-mono text-[10px] text-lime-green font-bold">Private Voting Enabled!</p>
                        <a
                          href={`https://explorer.solana.com/tx/${perTxHash}?cluster=${CLUSTER}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-mono text-[10px] text-solana-purple hover:underline break-all flex items-center gap-1 mt-1"
                        >
                          <ExternalLink className="w-3 h-3" />
                          Verify Transaction: {perTxHash.slice(0, 20)}...
                        </a>
                      </div>
                    )}
                    {perError && (
                      <p className="mt-2 font-mono text-[10px] text-hot-coral break-all">
                        Error: {perError}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {question.status === QuestionStatus.PrivateVoting && (
                <div className="bg-solana-purple/10 border-2 border-solana-purple p-6">
                  <h2 className="font-heading text-xl font-black uppercase tracking-tight text-solana-purple mb-2 flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5" />
                    Privacy Mode Active
                  </h2>
                  <p className="font-mono text-xs text-black/60 mb-3">
                    This question is delegated to a TEE validator. Votes are committed and revealed through the Ephemeral Rollup for privacy.
                  </p>

                  <div className="space-y-2 mb-3">
                    <div className="bg-white border-2 border-solana-purple/30 p-2">
                      <p className="font-mono text-[10px] font-bold uppercase text-solana-purple mb-1">On-Chain Verification:</p>
                      <a
                        href={`https://explorer.solana.com/address/${question.pda.toBase58()}?cluster=${CLUSTER}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 font-mono text-[10px] text-solana-purple hover:underline mb-1"
                      >
                        <ExternalLink className="w-3 h-3" />
                        Question PDA (owner = DELeGGv... = Delegation Program)
                      </a>
                      <a
                        href={`https://explorer.solana.com/address/${question.pda.toBase58()}/anchor-account?cluster=${CLUSTER}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 font-mono text-[10px] text-solana-purple hover:underline mb-1"
                      >
                        <ExternalLink className="w-3 h-3" />
                        Anchor Data (status = 6 = PrivateVoting, isPrivate = true)
                      </a>
                      <a
                        href={`https://explorer.solana.com/address/${TEE_VALIDATOR.toBase58()}?cluster=${CLUSTER}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 font-mono text-[10px] text-solana-purple hover:underline"
                      >
                        <ExternalLink className="w-3 h-3" />
                        TEE Validator: {TEE_VALIDATOR.toBase58().slice(0, 20)}...
                      </a>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-2 h-2 bg-lime-green rounded-full animate-pulse" />
                    <span className="font-mono text-[10px] font-bold uppercase text-lime-green">
                      Orchestrator auto-processing via ER endpoint
                    </span>
                  </div>

                  <div className="bg-cream border-2 border-black/10 p-2 mb-3">
                    <p className="font-mono text-[10px] font-bold uppercase text-black/40 mb-1">Vote Progress:</p>
                    {question.yesVotes + question.noVotes + question.unsureVotes > 0 ? (
                      <div className="space-y-1">
                        <p className="font-mono text-xs">YES: {question.yesVotes} | NO: {question.noVotes} | UNSURE: {question.unsureVotes}</p>
                      </div>
                    ) : (
                      <p className="font-mono text-xs text-black/40">Waiting for agent commits...</p>
                    )}
                  </div>

                  {isAdminUser && (
                    <div className="mt-2 pt-2 border-t-2 border-solana-purple/30 space-y-2">
                      <p className="font-mono text-[9px] text-black/40 uppercase">Admin Controls</p>
                      <div className="p-2 bg-cyber-yellow/10 border-2 border-cyber-yellow/40">
                        <p className="font-mono text-[9px] font-bold text-black/60">
                          Question is delegated to TEE — status updates must go through the Ephemeral Rollup endpoint.
                          The orchestrator will attempt to advance this question automatically.
                        </p>
                      </div>
                      <button
                        onClick={async () => {
                          setStatusLoading(true);
                          setStatusError(null);
                          try {
                            const sig = await updateQuestionStatus(id, { revealPhase: {} });
                            setStatusTxHash(sig);
                            await refetch();
                          } catch (e: any) {
                            setStatusError(getErrorMessage(e));
                          } finally {
                            setStatusLoading(false);
                          }
                        }}
                        disabled={statusLoading}
                        className="w-full p-2 bg-solana-purple text-white font-heading font-black uppercase text-xs border-2 border-black hover:bg-solana-purple/80 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      >
                        {statusLoading ? "Advancing..." : "Force Reveal Phase (base layer)"}
                      </button>
                      {statusTxHash && (
                        <a href={`https://explorer.solana.com/tx/${statusTxHash}?cluster=${CLUSTER}`} target="_blank" rel="noopener noreferrer" className="font-mono text-[10px] text-solana-purple hover:underline flex items-center gap-1">
                          <ExternalLink className="w-3 h-3" />TX: {statusTxHash.slice(0, 20)}...
                        </a>
                      )}
                      {statusError && <p className="font-mono text-[10px] text-hot-coral break-all">Error: {statusError}</p>}
                    </div>
                  )}
                </div>
              )}

              {question.status === QuestionStatus.Resolved && isAdminUser && (
                <div className="bg-white border-brutal shadow-brutal p-6">
                  <h2 className="font-heading text-xl font-black uppercase tracking-tight border-brutal-b pb-3 mb-4 flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-solana-purple" />
                    Private Payments (MagicBlock)
                  </h2>
                  <div className="space-y-3">
                    <div className="bg-solana-purple/5 border-2 border-solana-purple/20 p-3">
                      <p className="font-mono text-[10px] font-bold uppercase text-solana-purple mb-2">What this does:</p>
                      <ol className="font-mono text-xs text-black/60 space-y-1 list-decimal list-inside">
                        <li>Send USDC reward to correct agents</li>
                        <li>Amount and recipient hidden on Solana Explorer</li>
                        <li>Uses MagicBlock Private Ephemeral Rollup</li>
                      </ol>
                    </div>
                    <button
                      onClick={async () => {
                        setPrivateRewardLoading(true);
                        setPrivateRewardError(null);
                        setPrivateRewardTxHash(null);
                        try {
                          const resultNum = question.result;
                          if (resultNum === null) {
                            setPrivateRewardError("Question not yet resolved");
                            setPrivateRewardLoading(false);
                            return;
                          }

                          const rewardAmount = 100000;

                          // Step 1: Get auth challenge
                          const challengeResp = await fetch(`/api/payments?pubkey=${publicKey?.toBase58()}`);
                          const challengeData = await challengeResp.json();
                          if (!challengeData.challenge) {
                            setPrivateRewardError("Failed to get auth challenge from MagicBlock Payments API");
                            setPrivateRewardLoading(false);
                            return;
                          }

                          // Step 2: Sign the challenge with the wallet
                          const message = new TextEncoder().encode(challengeData.challenge);
                          const adapter = walletAdapter?.adapter as any;
                          const signature = adapter?.signMessage
                            ? await adapter.signMessage(message) as Uint8Array
                            : null;
                          if (!signature) {
                            setPrivateRewardError("Wallet does not support message signing — try Phantom or Solflare");
                            setPrivateRewardLoading(false);
                            return;
                          }

                          // Step 3: Login to get auth token
                          const loginResp = await fetch("/api/payments", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              action: "login",
                              pubkey: publicKey?.toBase58(),
                              challenge: challengeData.challenge,
                              signature: Buffer.from(signature).toString("base64"),
                              cluster: "devnet",
                            }),
                          });
                          const loginData = await loginResp.json();
                          const authToken = loginData.token;

                          if (!authToken) {
                            setPrivateRewardError("Failed to authenticate with MagicBlock Payments: " + JSON.stringify(loginData));
                            setPrivateRewardLoading(false);
                            return;
                          }

                          // Step 4: Check treasury balance
                          const balResp = await fetch("/api/payments", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ action: "balance", address: publicKey?.toBase58() }),
                          });
                          const balData = await balResp.json();
                          const bal = BigInt(balData.balance || "0");
                          if (bal < BigInt(rewardAmount * committeeAgents.length)) {
                            setPrivateRewardError(`Treasury has ${Number(bal) / 1e6} USDC — needs at least ${(rewardAmount * committeeAgents.length) / 1e6} USDC. Deposit first.`);
                            setPrivateRewardLoading(false);
                            return;
                          }

                          // Step 5: Send private reward to each committee member (one TX at a time)
                          let lastSig: string | null = null;
                          const txHashes: string[] = [];
                          for (const agent of committeeAgents) {
                            // Try transfer WITHOUT init flags to keep TX small
                            const transferResp = await fetch("/api/payments", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({
                                action: "transfer",
                                token: authToken,
                                from: publicKey?.toBase58(),
                                to: agent.wallet.toBase58(),
                                amount: rewardAmount,
                                visibility: "private",
                                fromBalance: "base",
                                toBalance: "base",
                              }),
                            });
                            const transferData = await transferResp.json();

                            if (transferData.error) {
                              const errMsg = typeof transferData.error === "string" ? transferData.error : transferData.error.message || JSON.stringify(transferData.error);
                              if (errMsg.includes("not found") || errMsg.includes("not initialized") || errMsg.includes("does not exist")) {
                                // Retry WITH init flags for this specific agent
                                const retryResp = await fetch("/api/payments", {
                                  method: "POST",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({
                                    action: "transfer",
                                    token: authToken,
                                    from: publicKey?.toBase58(),
                                    to: agent.wallet.toBase58(),
                                    amount: rewardAmount,
                                    visibility: "private",
                                    fromBalance: "base",
                                    toBalance: "base",
                                    initIfMissing: true,
                                  }),
                                });
                                const retryData = await retryResp.json();
                                if (retryData.error) {
                                  setPrivateRewardError(`Transfer to ${agent.name} failed: ${typeof retryData.error === "string" ? retryData.error : retryData.error.message || JSON.stringify(retryData.error)}`);
                                  break;
                                }
                                if (retryData.transactionBase64) {
                                  try {
                                    const txBuf = Buffer.from(retryData.transactionBase64, "base64");
                                    let tx: Transaction | VersionedTransaction;
                                    if (retryData.version === "v0") {
                                      tx = VersionedTransaction.deserialize(txBuf);
                                    } else {
                                      tx = Transaction.from(txBuf);
                                    }
                                    const sig = await sendTransaction(tx, connection);
                                    lastSig = sig;
                                    txHashes.push(sig);
                                  } catch (e: any) {
                                    setPrivateRewardError(`TX send failed for ${agent.name}: ${getErrorMessage(e)}`);
                                    break;
                                  }
                                }
                              } else {
                                setPrivateRewardError(`Transfer to ${agent.name} failed: ${errMsg}`);
                                break;
                              }
                            } else if (transferData.transactionBase64) {
                              try {
                                const txBuf = Buffer.from(transferData.transactionBase64, "base64");
                                let tx: Transaction | VersionedTransaction;
                                if (transferData.version === "v0") {
                                  tx = VersionedTransaction.deserialize(txBuf);
                                } else {
                                  tx = Transaction.from(txBuf);
                                }
                                const sig = await sendTransaction(tx, connection);
                                lastSig = sig;
                                txHashes.push(sig);
                              } catch (e: any) {
                                setPrivateRewardError(`TX send failed for ${agent.name}: ${getErrorMessage(e)}`);
                                break;
                              }
                            }
                          }
                          if (lastSig) { setPrivateRewardTxHash(lastSig); setPrivateRewardTxHashes(txHashes); }
                        } catch (e: any) {
                          setPrivateRewardError(getErrorMessage(e));
                        } finally {
                          setPrivateRewardLoading(false);
                        }
                      }}
                      disabled={privateRewardLoading || !connected}
                      className="w-full p-3 bg-solana-purple text-white font-heading font-black uppercase text-sm border-2 border-black hover:bg-solana-purple/80 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      {privateRewardLoading ? "Sending..." : `Send Private Reward (${question.result !== null ? (question.result === 0 ? "YES" : question.result === 1 ? "NO" : "UNSURE") : "?"})`}
                    </button>
                    {privateRewardTxHash && (
                      <div className="p-2 bg-lime-green/10 border-2 border-lime-green">
                        <p className="font-mono text-[10px] text-lime-green font-bold">Private Payment Sent!</p>
                        <p className="font-mono text-[9px] text-black/40">Amount and recipient are encrypted on Solana Explorer</p>
                      </div>
                    )}
                    {privateRewardError && <p className="font-mono text-[10px] text-hot-coral break-all">Error: {privateRewardError}</p>}
                    <p className="font-mono text-[8px] text-black/30">
                      Uses MagicBlock Private Payments API — transfers are encrypted via TEE
                    </p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-4 gap-2">
                {[
                  { href: "/oracle", label: "Oracle", icon: Activity },
                  { href: "/stack", label: "Stack", icon: ShieldCheck },
                  { href: "/verify", label: "Verify", icon: Fingerprint },
                  { href: "/ask", label: "Ask", icon: MessageSquare },
                ].map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="flex items-center justify-center gap-1.5 p-2.5 bg-white border-2 border-black hover:bg-solana-purple hover:text-white transition-colors group"
                  >
                    <link.icon className="w-3.5 h-3.5 text-black/40 group-hover:text-white transition-colors" strokeWidth={2} />
                    <span className="font-mono text-[10px] font-bold text-black/60 group-hover:text-white transition-colors">
                      {link.label}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </div>

          <div className="mx-auto w-[95%] max-w-7xl mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
            <StackVerification
              question={question}
              perTxHash={perTxHash}
              adminTxHash={adminTxHash}
              privateRewardTxHash={privateRewardTxHash}
            />

            <div className="space-y-4">
              <LiveTerminal questionId={id} />

              <div className="bg-black text-white border-brutal p-6 bg-grid-pattern-dark">
                <h3 className="font-heading font-black uppercase tracking-tight mb-5 text-lime-green flex items-center gap-2">
                  <Zap className="w-5 h-5" />
                  Why Not Just Ask ChatGPT?
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    {
                      icon: Fingerprint,
                      title: "Cryptographic Proof",
                      desc: "Every vote has a sha256 commit hash. Verify no one changed their vote after seeing others.",
                      color: "#9945FF", bg: "rgba(153,69,255,0.1)", border: "rgba(153,69,255,0.3)",
                    },
                    {
                      icon: Lock,
                      title: "Anti-Collusion",
                      desc: "Votes are sealed inside a Trusted Execution Environment. Agents cannot see each others votes before committing.",
                      color: "#A7F3D0", bg: "rgba(167,243,208,0.1)", border: "rgba(167,243,208,0.3)",
                    },
                    {
                      icon: ShieldCheck,
                      title: "VRF Committee",
                      desc: "Committee is selected using on-chain randomness. No one can choose which agents vote.",
                      color: "#FFD700", bg: "rgba(255,215,0,0.1)", border: "rgba(255,215,0,0.3)",
                    },
                    {
                      icon: TrendingUp,
                      title: "Reputation Stakes",
                      desc: "Agents lose reputation for wrong answers. Skin in the game = better answers over time.",
                      color: "#FF6B6B", bg: "rgba(255,107,107,0.1)", border: "rgba(255,107,107,0.3)",
                    },
                  ].map((card) => (
                    <div
                      key={card.title}
                      className="p-4 border hover:bg-white/[0.03] transition-all group"
                      style={{ backgroundColor: card.bg, borderColor: card.border }}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 border flex items-center justify-center" style={{ backgroundColor: card.bg, borderColor: card.border }}>
                          <card.icon className="w-4 h-4" strokeWidth={2.5} style={{ color: card.color }} />
                        </div>
                        <p className="font-heading font-black text-xs uppercase" style={{ color: card.color }}>
                          {card.title}
                        </p>
                      </div>
                      <p className="font-mono text-[10px] text-white/40 leading-relaxed">
                        {card.desc}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
