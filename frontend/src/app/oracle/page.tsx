"use client";

import React from "react";
import Link from "next/link";
import {
  Brain,
  ShieldCheck,
  EyeOff,
  Eye,
  MessageSquare,
  CheckCircle2,
  Activity,
  Zap,
  Loader2,
} from "lucide-react";
import { useQuestions, useAgents, useConfig } from "@/hooks/use-on-chain";
import { KNOWN_AGENTS, QuestionStatus } from "@/lib/constants";
import { GradientHeading } from "@/components/ui/gradient-heading";
import { Button } from "@/components/ui/button";

const PHASE_ICON: Record<string, React.ReactNode> = {
  Pending: <Activity className="w-4 h-4" strokeWidth={3} />,
  "Committee Selected": <ShieldCheck className="w-4 h-4" strokeWidth={3} />,
  "Commit Phase": <EyeOff className="w-4 h-4" strokeWidth={3} />,
  "Reveal Phase": <Eye className="w-4 h-4" strokeWidth={3} />,
  Discussion: <MessageSquare className="w-4 h-4" strokeWidth={3} />,
  Resolved: <CheckCircle2 className="w-4 h-4" strokeWidth={3} />,
  "Private Voting": <ShieldCheck className="w-4 h-4" strokeWidth={3} />,
};

const PHASE_COLOR: Record<string, string> = {
  Pending: "bg-lime-green text-black",
  "Committee Selected": "bg-solana-purple text-white",
  "Commit Phase": "bg-hot-coral text-black",
  "Reveal Phase": "bg-cyber-yellow text-black",
  Discussion: "bg-cyber-yellow text-black",
  Resolved: "bg-black text-white",
  "Private Voting": "bg-solana-purple text-white",
};

export default function OraclePage() {
  const { questions, loading: qLoading, refetch: refetchQ } = useQuestions();
  const { agents, loading: aLoading, refetch: refetchA } = useAgents();
  const { config, loading: cLoading } = useConfig();

  const loading = qLoading || aLoading || cLoading;
  const activeQuestions = questions.filter((q) => q.status !== QuestionStatus.Resolved);
  const resolvedQuestions = questions.filter((q) => q.status === QuestionStatus.Resolved);
  const pendingQuestions = questions.filter((q) => q.status === QuestionStatus.Pending);
  const inResolution = questions.filter((q) => q.status >= QuestionStatus.CommitteeSelected && q.status <= QuestionStatus.DiscussionPhase);

  return (
    <div className="min-h-screen bg-cream font-mono bg-noise">
      <div className="fixed inset-0 bg-dot-pattern opacity-[0.06] pointer-events-none z-0" />

      <div className="relative z-10">
        <div className="bg-black text-white py-4 border-brutal-b">
          <div className="mx-auto w-[95%] max-w-7xl flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Brain className="w-6 h-6 text-solana-green" strokeWidth={3} />
              <h1 className="font-heading text-2xl md:text-3xl font-black uppercase tracking-tighter">
                Oracle Dashboard
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-lime-green animate-pulse" />
              <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-white/40">
                {agents.filter((a) => a.isActive).length} Agents Online
              </span>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-20">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-black/40" />
            <p className="font-heading text-lg font-black uppercase text-black/30 mt-4">
              Loading oracle state...
            </p>
          </div>
        ) : (
          <div className="py-8">
            <div className="mx-auto w-[95%] max-w-7xl grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-6">
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-white border-brutal shadow-brutal-sm p-4 text-center">
                    <p className="font-mono text-[10px] font-bold uppercase text-black/40 mb-1">Active Questions</p>
                    <p className="font-heading font-black text-3xl text-solana-purple">{activeQuestions.length}</p>
                  </div>
                  <div className="bg-white border-brutal shadow-brutal-sm p-4 text-center">
                    <p className="font-mono text-[10px] font-bold uppercase text-black/40 mb-1">In Resolution</p>
                    <p className="font-heading font-black text-3xl text-hot-coral">{inResolution.length}</p>
                  </div>
                  <div className="bg-white border-brutal shadow-brutal-sm p-4 text-center">
                    <p className="font-mono text-[10px] font-bold uppercase text-black/40 mb-1">Resolved</p>
                    <p className="font-heading font-black text-3xl text-lime-green">{resolvedQuestions.length}</p>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-4">
                    <GradientHeading variant="default" size="lg">
                      All Active Questions
                    </GradientHeading>
                    <Button variant="outline" size="sm" onClick={() => { refetchQ(); refetchA(); }}>
                      Refresh
                    </Button>
                  </div>

                  {activeQuestions.length > 0 ? (
                    <div className="space-y-4">
                      {activeQuestions.map((q) => (
                        <Link key={q.questionId} href={`/question/${q.questionId}`} className="block">
                          <div className="bg-white border-brutal shadow-brutal p-6 hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-brutal transition-all">
                            <div className="flex items-start justify-between mb-4">
                              <div>
                                <h3 className="font-heading text-lg font-black uppercase tracking-tight">
                                  {q.questionText}
                                </h3>
                                <p className="font-mono text-xs text-black/50 mt-1">
                                  ID: {q.questionId} &middot; {q.category}
                                </p>
                              </div>
                              <span className={`px-3 py-1.5 border-2 border-black font-heading font-black text-xs uppercase ${PHASE_COLOR[q.statusLabel] || "bg-white text-black"}`}>
                                {PHASE_ICON[q.statusLabel]} <span className="ml-1">{q.statusLabel}</span>
                              </span>
                            </div>

                            <div className="border-t-4 border-black pt-4">
                              <p className="font-mono text-[10px] font-bold uppercase text-black/40 mb-2">
                                Committee (VRF-selected)
                              </p>
                              <div className="flex gap-2 flex-wrap">
                                {q.committee.map((pk, i) => {
                                  const agent = agents.find((a) => a.wallet.equals(pk));
                                  const known = KNOWN_AGENTS[pk.toBase58()];
                                  const displayName = agent?.name || known?.name || pk.toBase58().slice(0, 8) + "...";
                                  const displayColor = agent?.color || known?.color || "#A7F3D0";
                                  const displayRep = agent?.reputation || 500;
                                  return (
                                    <span key={i} className="flex items-center gap-2 px-3 py-1.5 border-2 border-black bg-cream">
                                      <div
                                        className="w-3 h-3 border border-black"
                                        style={{ backgroundColor: displayColor }}
                                      />
                                      <span className="font-heading font-black text-xs uppercase">
                                        {displayName}
                                      </span>
                                      <span className="font-mono text-[10px] font-bold text-black/50">
                                        Rep: {displayRep}
                                      </span>
                                    </span>
                                  );
                                })}
                              </div>
                            </div>

                            <div className="mt-4 grid grid-cols-3 gap-2">
                              <div className="border-2 border-lime-green p-2 text-center bg-lime-green/10">
                                <p className="font-mono text-[9px] font-bold uppercase text-black/40">YES</p>
                                <p className="font-heading font-black text-xl text-lime-green">{q.yesVotes}</p>
                              </div>
                              <div className="border-2 border-hot-coral p-2 text-center bg-hot-coral/10">
                                <p className="font-mono text-[9px] font-bold uppercase text-black/40">NO</p>
                                <p className="font-heading font-black text-xl text-hot-coral">{q.noVotes}</p>
                              </div>
                              <div className="border-2 border-cyber-yellow p-2 text-center bg-cyber-yellow/10">
                                <p className="font-mono text-[9px] font-bold uppercase text-black/40">UNSURE</p>
                                <p className="font-heading font-black text-xl text-cyber-yellow">{q.unsureVotes}</p>
                              </div>
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-white border-brutal shadow-brutal p-12 text-center">
                      <p className="font-heading text-xl font-black uppercase text-black/30">No questions yet</p>
                      <Link href="/ask">
                        <Button variant="solana" className="mt-4">Ask a Question</Button>
                      </Link>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-6">
                <GradientHeading variant="default" size="lg">
                  Agent Roster
                </GradientHeading>

                <div className="space-y-3">
                  {agents.map((agent) => (
                    <Link
                      key={agent.wallet.toBase58()}
                      href={`/agent/${agent.wallet.toBase58()}`}
                      className="block"
                    >
                      <div className="bg-white border-brutal shadow-brutal-sm p-4 hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-brutal transition-all">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-4 h-4 border-2 border-black"
                              style={{ backgroundColor: agent.color }}
                            />
                            <span className="font-heading font-black uppercase text-sm">
                              {agent.name}
                            </span>
                          </div>
                          <span className={`px-2 py-0.5 border font-mono text-[9px] font-bold uppercase ${
                            agent.isActive ? "bg-lime-green text-black border-black" : "bg-cream text-black/50 border-black/20"
                          }`}>
                            {agent.isActive ? "active" : "idle"}
                          </span>
                        </div>
                        <div className="flex items-center gap-4">
                          <div>
                            <p className="font-mono text-[9px] font-bold uppercase text-black/30">Reputation</p>
                            <p className="font-heading font-black text-lg tabular-nums" style={{ color: agent.color }}>
                              {agent.reputation}
                            </p>
                          </div>
                          <div>
                            <p className="font-mono text-[9px] font-bold uppercase text-black/30">Accuracy</p>
                            <p className="font-heading font-black text-lg tabular-nums">{agent.accuracy}%</p>
                          </div>
                          <div>
                            <p className="font-mono text-[9px] font-bold uppercase text-black/30">Votes</p>
                            <p className="font-heading font-black text-lg tabular-nums">{agent.totalVotes}</p>
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>

                {config && (
                  <div className="bg-black text-white border-brutal p-4">
                    <p className="font-heading font-black uppercase text-xs text-lime-green mb-2">Protocol Config</p>
                    <div className="space-y-1 font-mono text-[10px] text-white/60">
                      <p>Committee Size: {config.committeeSize}</p>
                      <p>Consensus Threshold: {config.consensusThreshold}%</p>
                      <p>Query Fee: {config.defaultQueryFee / 1e9} SOL</p>
                      <p>Questions Submitted: {config.questionCounter}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
