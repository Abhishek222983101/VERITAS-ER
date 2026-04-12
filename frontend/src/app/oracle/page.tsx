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
  Clock,
  Activity,
  Zap,
} from "lucide-react";
import { AGENTS, RESOLUTION_SESSIONS, MARKETS } from "@/lib/data";
import { GradientHeading } from "@/components/ui/gradient-heading";
import { Button } from "@/components/ui/button";

const PHASE_ICON: Record<string, React.ReactNode> = {
  committee: <ShieldCheck className="w-4 h-4" strokeWidth={3} />,
  research: <Brain className="w-4 h-4" strokeWidth={3} />,
  commit: <EyeOff className="w-4 h-4" strokeWidth={3} />,
  reveal: <Eye className="w-4 h-4" strokeWidth={3} />,
  discussion: <MessageSquare className="w-4 h-4" strokeWidth={3} />,
  final: <CheckCircle2 className="w-4 h-4" strokeWidth={3} />,
  complete: <Activity className="w-4 h-4" strokeWidth={3} />,
};

const PHASE_COLOR: Record<string, string> = {
  committee: "bg-solana-purple text-white",
  research: "bg-cyber-yellow text-black",
  commit: "bg-hot-coral text-black",
  reveal: "bg-lime-green text-black",
  discussion: "bg-cyber-yellow text-black",
  final: "bg-lime-green text-black",
  complete: "bg-black text-white",
};

export default function OraclePage() {
  const activeSessions = RESOLUTION_SESSIONS.filter((s) => s.phase !== "complete");

  return (
    <div className="min-h-screen bg-cream font-mono bg-noise">
      <div className="fixed inset-0 bg-dot-pattern opacity-[0.06] pointer-events-none z-0" />

      <div className="relative z-10">
        {/* Header */}
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
                {AGENTS.filter((a) => a.status === "active" || a.status === "voting" || a.status === "researching").length} Agents Online
              </span>
            </div>
          </div>
        </div>

        <div className="py-8">
          <div className="mx-auto w-[95%] max-w-7xl grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left - Active Sessions */}
            <div className="lg:col-span-2 space-y-6">
              {/* Stats Bar */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-white border-brutal shadow-brutal-sm p-4 text-center">
                  <p className="font-mono text-[10px] font-bold uppercase text-black/40 mb-1">Active Markets</p>
                  <p className="font-heading font-black text-3xl text-solana-purple">{MARKETS.filter((m) => m.status !== "resolved").length}</p>
                </div>
                <div className="bg-white border-brutal shadow-brutal-sm p-4 text-center">
                  <p className="font-mono text-[10px] font-bold uppercase text-black/40 mb-1">In Resolution</p>
                  <p className="font-heading font-black text-3xl text-hot-coral">{activeSessions.length}</p>
                </div>
                <div className="bg-white border-brutal shadow-brutal-sm p-4 text-center">
                  <p className="font-mono text-[10px] font-bold uppercase text-black/40 mb-1">Resolved</p>
                  <p className="font-heading font-black text-3xl text-lime-green">{MARKETS.filter((m) => m.status === "resolved").length}</p>
                </div>
              </div>

              {/* Active Resolution Sessions */}
              <div>
                <GradientHeading variant="default" size="lg" className="mb-4">
                  Active Resolution Sessions
                </GradientHeading>

                {activeSessions.length > 0 ? (
                  <div className="space-y-4">
                    {activeSessions.map((session) => {
                      const market = MARKETS.find((m) => m.id === session.marketId);
                      const committeeAgents = session.committee.map((aid) =>
                        AGENTS.find((a) => a.id === aid)
                      ).filter(Boolean);

                      return (
                        <div
                          key={session.id}
                          className="bg-white border-brutal shadow-brutal p-6"
                        >
                          <div className="flex items-start justify-between mb-4">
                            <div>
                              <h3 className="font-heading text-lg font-black uppercase tracking-tight">
                                {market?.question || session.marketId}
                              </h3>
                              <p className="font-mono text-xs text-black/50 mt-1">
                                Session {session.id} &middot; Round {session.currentRound}
                              </p>
                            </div>
                            <span className={`px-3 py-1.5 border-2 border-black font-heading font-black text-xs uppercase ${PHASE_COLOR[session.phase] || "bg-white text-black"}`}>
                              {PHASE_ICON[session.phase]} <span className="ml-1">{session.phase}</span>
                            </span>
                          </div>

                          {/* Committee Members */}
                          <div className="border-t-4 border-black pt-4">
                            <p className="font-mono text-[10px] font-bold uppercase text-black/40 mb-2">
                              Committee (VRF-selected)
                            </p>
                            <div className="flex gap-2 flex-wrap">
                              {committeeAgents.map((agent) => (
                                <Link
                                  key={agent!.id}
                                  href={`/agent/${agent!.id}`}
                                  className="flex items-center gap-2 px-3 py-1.5 border-2 border-black bg-cream hover:bg-lime-green transition-colors"
                                >
                                  <div
                                    className="w-3 h-3 border border-black"
                                    style={{ backgroundColor: agent!.color }}
                                  />
                                  <span className="font-heading font-black text-xs uppercase">
                                    {agent!.name}
                                  </span>
                                  <span className="font-mono text-[10px] font-bold text-black/50">
                                    Rep: {agent!.reputation}%
                                  </span>
                                </Link>
                              ))}
                            </div>
                          </div>

                          {/* Vote Tally */}
                          <div className="mt-4 grid grid-cols-3 gap-2">
                            <div className="border-2 border-lime-green p-2 text-center bg-lime-green/10">
                              <p className="font-mono text-[9px] font-bold uppercase text-black/40">YES</p>
                              <p className="font-heading font-black text-xl text-lime-green">{session.yesVotes}</p>
                            </div>
                            <div className="border-2 border-hot-coral p-2 text-center bg-hot-coral/10">
                              <p className="font-mono text-[9px] font-bold uppercase text-black/40">NO</p>
                              <p className="font-heading font-black text-xl text-hot-coral">{session.noVotes}</p>
                            </div>
                            <div className="border-2 border-cyber-yellow p-2 text-center bg-cyber-yellow/10">
                              <p className="font-mono text-[9px] font-bold uppercase text-black/40">UNSURE</p>
                              <p className="font-heading font-black text-xl text-cyber-yellow">{session.unsureVotes}</p>
                            </div>
                          </div>

                          {/* Deadline */}
                          <div className="mt-3 flex items-center gap-1 text-black/40">
                            <Clock className="w-3 h-3" />
                            <span className="font-mono text-[10px] font-bold uppercase">
                              Deadline: {new Date(session.deadline).toLocaleString()}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="bg-white border-brutal shadow-brutal p-12 text-center">
                    <CheckCircle2 className="w-12 h-12 text-lime-green mx-auto mb-3" />
                    <p className="font-heading text-xl font-black uppercase text-lime-green">
                      All Clear
                    </p>
                    <p className="font-mono text-sm text-black/50">No active resolution sessions</p>
                  </div>
                )}
              </div>
            </div>

            {/* Right - Agent Roster */}
            <div className="space-y-6">
              <GradientHeading variant="default" size="lg">
                Agent Roster
              </GradientHeading>

              <div className="space-y-3">
                {AGENTS.map((agent) => (
                  <Link
                    key={agent.id}
                    href={`/agent/${agent.id}`}
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
                          agent.status === "active" ? "bg-lime-green text-black border-black" :
                          agent.status === "voting" ? "bg-solana-purple text-white border-black" :
                          agent.status === "researching" ? "bg-cyber-yellow text-black border-black" :
                          "bg-cream text-black/50 border-black/20"
                        }`}>
                          {agent.status}
                        </span>
                      </div>
                      <p className="font-mono text-[10px] text-black/50 uppercase mb-2">
                        {agent.role}
                      </p>
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
