"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Brain,
  CheckCircle2,
  Clock,
  Zap,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Eye,
  EyeOff,
  MessageSquare,
  AlertTriangle,
  TrendingUp,
  ArrowRight,
} from "lucide-react";
import { AGENTS, MARKETS } from "@/lib/data";
import { GradientHeading } from "@/components/ui/gradient-heading";
import { Button } from "@/components/ui/button";
import DisputeTracker from "@/components/dispute-tracker";

const PHASE_LABELS: Record<string, { label: string; color: string }> = {
  pending: { label: "Pending", color: "bg-cyber-yellow text-black" },
  researching: { label: "Researching", color: "bg-cyber-yellow text-black" },
  voting: { label: "Voting", color: "bg-solana-purple text-white" },
  discussion: { label: "Discussion", color: "bg-hot-coral text-white" },
  revoting: { label: "Re-voting", color: "bg-solana-purple text-white" },
  mediating: { label: "Mediating", color: "bg-cyber-yellow text-black" },
  resolved: { label: "Resolved", color: "bg-lime-green text-black" },
  failed: { label: "Failed", color: "bg-hot-coral text-white" },
};

interface DisputeData {
  id: string;
  market_id: string;
  question: string;
  status: string;
  consensus_vote: string | null;
  consensus_confidence: number | null;
  round: number;
  created_at: string;
  updated_at: string;
}

export default function OraclePage() {
  const [disputes, setDisputes] = useState<DisputeData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeDisputeId, setActiveDisputeId] = useState<string | null>(null);
  const [resolvingDisputeId, setResolvingDisputeId] = useState<string | null>(null);

  const fetchDisputes = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/disputes");
      const data = await res.json();
      setDisputes(data.disputes || []);
    } catch {} finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDisputes();
  }, [fetchDisputes]);

  const handleSolveDispute = async (disputeId: string) => {
    setResolvingDisputeId(disputeId);
    setActiveDisputeId(disputeId);
    try {
      await fetch(`/api/dispute/${disputeId}?action=resolve`, { method: "POST" });
    } catch {}
    setResolvingDisputeId(null);
  };

  const handleCreateDispute = async (marketId: string, question: string, deadline: string) => {
    setResolvingDisputeId(marketId);
    try {
      const res = await fetch("/api/dispute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          market_id: marketId,
          question,
          resolution_criteria: `Resolve whether: ${question}`,
          resolution_date: deadline,
        }),
      });
      const data = await res.json();
      if (data.dispute) {
        setActiveDisputeId(data.dispute.id);
        fetchDisputes();
      }
    } catch {}
    setResolvingDisputeId(null);
  };

  const pendingDisputes = disputes.filter((d) => d.status === "pending");
  const activeDisputes = disputes.filter((d) => d.status !== "resolved" && d.status !== "failed" && d.status !== "pending");
  const resolvedDisputes = disputes.filter((d) => d.status === "resolved");

  const marketsWithoutDisputes = MARKETS.filter(
    (m) => m.status !== "resolved" && !disputes.some((d) => d.market_id === m.id && d.status !== "resolved")
  );

  return (
    <div className="min-h-screen bg-cream font-mono bg-noise">
      <div className="fixed inset-0 bg-dot-pattern opacity-[0.06] pointer-events-none z-0" />

      <div className="relative z-10">
        {/* Header */}
        <div className="bg-black text-white py-4 border-brutal-b">
          <div className="mx-auto w-[95%] max-w-7xl flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Brain className="w-6 h-6 text-lime-green" strokeWidth={3} />
              <h1 className="font-heading text-2xl md:text-3xl font-black uppercase tracking-tighter">
                Oracle Dashboard
              </h1>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="solana" className="h-8 text-xs" onClick={fetchDisputes} disabled={isLoading}>
                {isLoading ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <RefreshCw className="w-3 h-3 mr-1" />}
                Refresh
              </Button>
              <Zap className="w-4 h-4 text-lime-green animate-pulse" />
              <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-white/40">
                4 Agents Online
              </span>
            </div>
          </div>
        </div>

        <div className="py-8">
          <div className="mx-auto w-[95%] max-w-7xl grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column */}
            <div className="lg:col-span-2 space-y-6">
              {/* Stats */}
              <div className="grid grid-cols-4 gap-3">
                <div className="bg-white border-brutal shadow-brutal-sm p-3 text-center">
                  <p className="font-mono text-[9px] font-bold uppercase text-black/40 mb-1">Markets</p>
                  <p className="font-heading font-black text-2xl text-solana-purple">{MARKETS.filter((m) => m.status !== "resolved").length}</p>
                </div>
                <div className="bg-white border-brutal shadow-brutal-sm p-3 text-center">
                  <p className="font-mono text-[9px] font-bold uppercase text-black/40 mb-1">Pending</p>
                  <p className="font-heading font-black text-2xl text-cyber-yellow">{pendingDisputes.length}</p>
                </div>
                <div className="bg-white border-brutal shadow-brutal-sm p-3 text-center">
                  <p className="font-mono text-[9px] font-bold uppercase text-black/40 mb-1">In Progress</p>
                  <p className="font-heading font-black text-2xl text-hot-coral">{activeDisputes.length}</p>
                </div>
                <div className="bg-white border-brutal shadow-brutal-sm p-3 text-center">
                  <p className="font-mono text-[9px] font-bold uppercase text-black/40 mb-1">Resolved</p>
                  <p className="font-heading font-black text-2xl text-lime-green">{resolvedDisputes.length}</p>
                </div>
              </div>

              {/* Active Tracker (if one is selected) */}
              {activeDisputeId && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <GradientHeading variant="solana" size="lg">
                      Live Resolution
                    </GradientHeading>
                    <Button variant="default" className="h-7 text-[10px]" onClick={() => setActiveDisputeId(null)}>
                      Back to List
                    </Button>
                  </div>
                  <DisputeTracker
                    disputeId={activeDisputeId}
                    onComplete={fetchDisputes}
                    onDismiss={() => setActiveDisputeId(null)}
                  />
                </div>
              )}

              {/* Pending Disputes - Click to Solve */}
              {!activeDisputeId && pendingDisputes.length > 0 && (
                <div>
                  <GradientHeading variant="default" size="lg" className="mb-4">
                    Pending Disputes
                  </GradientHeading>
                  <div className="space-y-3">
                    {pendingDisputes.map((d) => (
                      <div key={d.id} className="bg-white border-brutal shadow-brutal p-5">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <h3 className="font-heading text-base font-black uppercase tracking-tight">
                              {d.question}
                            </h3>
                            <p className="font-mono text-[10px] text-black/40 mt-1">
                              Market: {d.market_id} &middot; Created {new Date(d.created_at).toLocaleString()}
                            </p>
                          </div>
                          <span className="px-2 py-1 border-2 border-black font-heading font-black text-[9px] uppercase bg-cyber-yellow text-black">
                            PENDING
                          </span>
                        </div>
                        <Button
                          variant="solana"
                          className="w-full"
                          onClick={() => handleSolveDispute(d.id)}
                          disabled={resolvingDisputeId === d.id}
                        >
                          {resolvingDisputeId === d.id ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Starting AI Agents...
                            </>
                          ) : (
                            <>
                              <Zap className="w-4 h-4 mr-2" />
                              Solve Dispute with 4 AI Agents
                            </>
                          )}
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Active Resolutions - Click to View */}
              {!activeDisputeId && activeDisputes.length > 0 && (
                <div>
                  <GradientHeading variant="default" size="lg" className="mb-4">
                    Active Resolutions
                  </GradientHeading>
                  <div className="space-y-3">
                    {activeDisputes.map((d) => {
                      const phase = PHASE_LABELS[d.status] || { label: d.status, color: "bg-white text-black" };
                      return (
                        <button
                          key={d.id}
                          onClick={() => setActiveDisputeId(d.id)}
                          className="w-full text-left bg-white border-brutal shadow-brutal p-5 hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-brutal-lg transition-all"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <h3 className="font-heading text-base font-black uppercase tracking-tight">
                                {d.question}
                              </h3>
                              <p className="font-mono text-[10px] text-black/40 mt-1">
                                Round {d.round} &middot; {new Date(d.updated_at).toLocaleString()}
                              </p>
                            </div>
                            <span className={`px-2 py-1 border-2 border-black font-heading font-black text-[9px] uppercase ${phase.color}`}>
                              {phase.label}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-solana-purple">
                            <Loader2 className="w-3 h-3 animate-spin" />
                            <span className="font-mono text-[10px] font-bold uppercase">Click to view live progress</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Open New Dispute from Markets */}
              {!activeDisputeId && marketsWithoutDisputes.length > 0 && (
                <div>
                  <GradientHeading variant="default" size="lg" className="mb-4">
                    Open New Dispute
                  </GradientHeading>
                  <div className="space-y-3">
                    {marketsWithoutDisputes.map((m) => (
                      <div key={m.id} className="bg-white border-brutal shadow-brutal-sm p-4 flex items-center justify-between">
                        <div className="flex-1 mr-4">
                          <p className="font-heading font-black uppercase text-sm">{m.question}</p>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="font-mono text-[9px] text-black/40 uppercase">{m.category}</span>
                            <span className="font-mono text-[9px] text-black/30">
                              YES {Math.round(m.yesPrice * 100)}¢ / NO {Math.round(m.noPrice * 100)}¢
                            </span>
                          </div>
                        </div>
                        <Button
                          variant="solana"
                          className="flex-shrink-0 h-8 text-[10px]"
                          onClick={() => handleCreateDispute(m.id, m.question, m.deadline)}
                          disabled={resolvingDisputeId === m.id}
                        >
                          {resolvingDisputeId === m.id ? (
                            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                          ) : (
                            <Zap className="w-3 h-3 mr-1" />
                          )}
                          Open Dispute
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Resolved */}
              {!activeDisputeId && resolvedDisputes.length > 0 && (
                <div>
                  <GradientHeading variant="default" size="lg" className="mb-4">
                    Resolved Disputes
                  </GradientHeading>
                  <div className="space-y-3">
                    {resolvedDisputes.map((d) => (
                      <button
                        key={d.id}
                        onClick={() => setActiveDisputeId(d.id)}
                        className="w-full text-left bg-white border-brutal shadow-brutal-sm p-4 flex items-center justify-between hover:bg-lime-green/5 transition-colors"
                      >
                        <div>
                          <p className="font-heading font-black uppercase text-sm">{d.question}</p>
                          <p className="font-mono text-[10px] text-black/40">
                            Resolved in {d.round} round(s) &middot; {d.consensus_confidence}% confidence
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 border-2 font-heading font-black text-xs uppercase ${
                            d.consensus_vote === "YES" ? "bg-lime-green text-black border-black" : "bg-hot-coral text-black border-black"
                          }`}>
                            {d.consensus_vote}
                          </span>
                          <ArrowRight className="w-3 h-3 text-black/30" />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Empty State */}
              {!activeDisputeId && disputes.length === 0 && !isLoading && (
                <div className="bg-white border-brutal shadow-brutal p-12 text-center">
                  <ShieldCheck className="w-12 h-12 text-black/20 mx-auto mb-3" />
                  <p className="font-heading text-xl font-black uppercase text-black/30">
                    No Disputes Yet
                  </p>
                  <p className="font-mono text-sm text-black/40 mb-6">
                    Open a dispute from the markets below to start AI-powered resolution
                  </p>
                </div>
              )}

              {/* Loading */}
              {isLoading && disputes.length === 0 && (
                <div className="bg-white border-brutal shadow-brutal p-12 text-center">
                  <Loader2 className="w-12 h-12 text-solana-purple mx-auto mb-3 animate-spin" />
                  <p className="font-mono text-sm text-black/50">Loading from Supabase...</p>
                </div>
              )}
            </div>

            {/* Right - Agent Roster */}
            <div className="space-y-6">
              <GradientHeading variant="default" size="lg">
                Agent Roster
              </GradientHeading>

              <div className="space-y-3">
                {AGENTS.map((agent) => (
                  <Link key={agent.id} href={`/agent/${agent.id}`} className="block">
                    <div className="bg-white border-brutal shadow-brutal-sm p-4 hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-brutal transition-all">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 border-2 border-black" style={{ backgroundColor: agent.color }} />
                          <span className="font-heading font-black uppercase text-sm">{agent.name}</span>
                        </div>
                        <span className={`px-2 py-0.5 border font-mono text-[9px] font-bold uppercase ${
                          agent.status === "active" ? "bg-lime-green text-black border-black" :
                          agent.status === "voting" ? "bg-solana-purple text-white border-black" :
                          agent.status === "researching" ? "bg-cyber-yellow text-black border-black" :
                          "bg-cream text-black/50 border-black/20"
                        }`}>
                          {agent.status}
                        </span>
                      </div>
                      <p className="font-mono text-[10px] text-black/50 uppercase mb-2">{agent.role}</p>
                      <div className="flex items-center gap-4">
                        <div>
                          <p className="font-mono text-[9px] font-bold uppercase text-black/30">Reputation</p>
                          <p className="font-heading font-black text-lg tabular-nums" style={{ color: agent.reputation >= 90 ? "#A7F3D0" : agent.reputation >= 70 ? "#FFD700" : "#FF6B6B" }}>
                            {agent.reputation}%
                          </p>
                        </div>
                        <div>
                          <p className="font-mono text-[9px] font-bold uppercase text-black/30">Accuracy</p>
                          <p className="font-heading font-black text-lg tabular-nums">
                            {agent.totalVotes > 0 ? Math.round((agent.correctVotes / agent.totalVotes) * 100) : 0}%
                          </p>
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

              <Link href="/create">
                <Button variant="solana" className="w-full">Register New Agent</Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
