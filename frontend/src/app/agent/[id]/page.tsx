"use client";

import React, { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Brain, ShieldCheck, TrendingUp, Clock, Activity } from "lucide-react";
import { AGENTS } from "@/lib/data";
import { GradientHeading } from "@/components/ui/gradient-heading";
import { Button } from "@/components/ui/button";

const MOCK_VOTE_HISTORY = [
  { market: "Will BTC hit $150K?", vote: "YES", correct: true, confidence: 78 },
  { market: "Will ETH ETF be approved?", vote: "YES", correct: true, confidence: 85 },
  { market: "Will AI regulation pass?", vote: "NO", correct: true, confidence: 81 },
  { market: "Will Solana reach $500?", vote: "YES", correct: false, confidence: 72 },
  { market: "Will India win T20?", vote: "YES", correct: false, confidence: 58 },
];

export default function AgentProfilePage() {
  const params = useParams();
  const id = params?.id as string;
  const agent = AGENTS.find((a) => a.id === id);

  if (!agent) {
    return (
      <div className="min-h-screen bg-cream font-mono flex items-center justify-center">
        <div className="text-center">
          <h1 className="font-heading text-4xl font-black uppercase">Agent Not Found</h1>
          <Link href="/oracle" className="text-solana-purple font-bold mt-4 inline-block">Back to Oracle</Link>
        </div>
      </div>
    );
  }

  const accuracy = agent.totalVotes > 0 ? Math.round((agent.correctVotes / agent.totalVotes) * 100) : 0;

  return (
    <div className="min-h-screen bg-cream font-mono bg-noise">
      <div className="fixed inset-0 bg-dot-pattern opacity-[0.06] pointer-events-none z-0" />

      <div className="relative z-10">
        <div className="bg-black text-white py-3 border-brutal-b">
          <div className="mx-auto w-[95%] max-w-7xl flex items-center justify-between">
          <Link href="/oracle" className="flex items-center gap-3 hover:text-lime-green transition-colors">
            <ArrowLeft className="w-5 h-5" strokeWidth={3} />
            <span className="font-heading font-black uppercase tracking-tighter">Oracle</span>
          </Link>
          <span className={`px-2 py-1 border font-heading font-black text-[10px] uppercase ${
            agent.status === "active" ? "bg-lime-green text-black border-black" :
            agent.status === "voting" ? "bg-solana-purple text-white border-black" :
            agent.status === "researching" ? "bg-cyber-yellow text-black border-black" :
            "bg-cream text-black/50 border-black/20"
          }`}>
            {agent.status}
          </span>
          </div>
        </div>

        <div className="py-8">
          <div className="mx-auto w-[95%] max-w-5xl space-y-6">
            {/* Agent Header */}
            <div className="bg-white border-brutal shadow-brutal p-6 md:p-8">
              <div className="flex items-center gap-6 mb-6">
                <div className="w-20 h-20 border-brutal flex items-center justify-center" style={{ backgroundColor: agent.color }}>
                  <Brain className="w-10 h-10 text-black" strokeWidth={2} />
                </div>
                <div>
                  <GradientHeading variant="solana" size="lg">{agent.name}</GradientHeading>
                  <p className="font-mono text-sm font-bold text-black/60 uppercase mt-1">{agent.role}</p>
                </div>
              </div>
              <p className="font-mono text-base text-black/70 border-l-4 border-black pl-4">
                {agent.personality}
              </p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white border-brutal shadow-brutal-sm p-4 text-center">
                <p className="font-mono text-[10px] font-bold uppercase text-black/40 mb-1">Reputation</p>
                <p className="font-heading font-black text-3xl tabular-nums" style={{ color: agent.color }}>{agent.reputation}%</p>
              </div>
              <div className="bg-white border-brutal shadow-brutal-sm p-4 text-center">
                <p className="font-mono text-[10px] font-bold uppercase text-black/40 mb-1">Accuracy</p>
                <p className="font-heading font-black text-3xl text-lime-green tabular-nums">{accuracy}%</p>
              </div>
              <div className="bg-white border-brutal shadow-brutal-sm p-4 text-center">
                <p className="font-mono text-[10px] font-bold uppercase text-black/40 mb-1">Total Votes</p>
                <p className="font-heading font-black text-3xl tabular-nums">{agent.totalVotes}</p>
              </div>
              <div className="bg-white border-brutal shadow-brutal-sm p-4 text-center">
                <p className="font-mono text-[10px] font-bold uppercase text-black/40 mb-1">Correct</p>
                <p className="font-heading font-black text-3xl text-lime-green tabular-nums">{agent.correctVotes}</p>
              </div>
            </div>

            {/* Reputation Bar */}
            <div className="bg-white border-brutal shadow-brutal p-6">
              <h2 className="font-heading text-lg font-black uppercase tracking-tight border-brutal-b pb-3 mb-4">
                Reputation Score
              </h2>
              <div className="flex items-center gap-4">
                <span className="font-heading font-black text-5xl tabular-nums" style={{ color: agent.color }}>{agent.reputation}</span>
                <div className="flex-1">
                  <div className="w-full h-6 border-2 border-black bg-black/10">
                    <div
                      className="h-full transition-all duration-500"
                      style={{ width: `${agent.reputation}%`, backgroundColor: agent.color }}
                    />
                  </div>
                  <div className="flex justify-between mt-1 font-mono text-[9px] font-bold uppercase text-black/30">
                    <span>0</span>
                    <span>50</span>
                    <span>100</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Vote History */}
            <div className="bg-white border-brutal shadow-brutal p-6">
              <h2 className="font-heading text-lg font-black uppercase tracking-tight border-brutal-b pb-3 mb-4">
                Recent Votes
              </h2>
              <div className="space-y-2">
                {MOCK_VOTE_HISTORY.map((vote, i) => (
                  <div key={i} className="flex items-center justify-between p-3 border-2 border-black/10 hover:border-black transition-colors">
                    <div className="flex-1">
                      <p className="font-mono text-sm font-bold">{vote.market}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`px-2 py-0.5 border font-heading font-black text-xs uppercase ${
                        vote.vote === "YES" ? "bg-lime-green text-black border-black" : "bg-hot-coral text-black border-black"
                      }`}>
                        {vote.vote}
                      </span>
                      <span className="font-mono text-xs font-bold text-black/40">{vote.confidence}%</span>
                      {vote.correct ? (
                        <ShieldCheck className="w-4 h-4 text-lime-green" />
                      ) : (
                        <span className="w-4 h-4 flex items-center justify-center font-heading font-black text-[10px] text-hot-coral">X</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* On-chain Identity */}
            <div className="bg-black text-white border-brutal p-6 bg-grid-pattern-dark">
              <h2 className="font-heading text-lg font-black uppercase tracking-tight text-lime-green mb-4">
                On-chain Identity
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border-2 border-white/15 p-3">
                  <p className="font-mono text-[10px] font-bold uppercase text-white/30 mb-1">SAS Attestation</p>
                  <p className="font-mono text-xs font-bold text-lime-green break-all">0x7f3a...b2c1</p>
                </div>
                <div className="border-2 border-white/15 p-3">
                  <p className="font-mono text-[10px] font-bold uppercase text-white/30 mb-1">Agent Wallet</p>
                  <p className="font-mono text-xs font-bold text-solana-purple break-all">7xKXtg2CW87dU...3jv8Q</p>
                </div>
                <div className="border-2 border-white/15 p-3">
                  <p className="font-mono text-[10px] font-bold uppercase text-white/30 mb-1">Human Verified</p>
                  <p className="font-mono text-xs font-bold text-lime-green">YES — Reclaim zkTLS</p>
                </div>
                <div className="border-2 border-white/15 p-3">
                  <p className="font-mono text-[10px] font-bold uppercase text-white/30 mb-1">TEE Attestation</p>
                  <p className="font-mono text-xs font-bold text-cyber-yellow">Verified — MagicBlock PER</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
