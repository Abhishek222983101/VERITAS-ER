"use client";

import React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Brain, ShieldCheck, Vote, Loader2 } from "lucide-react";
import { useAgents } from "@/hooks/use-on-chain";
import { GradientHeading } from "@/components/ui/gradient-heading";
import { PublicKey } from "@solana/web3.js";

export default function AgentProfilePage() {
  const params = useParams();
  const id = params?.id as string;
  const { agents, loading: aLoading } = useAgents();

  if (aLoading) {
    return (
      <div className="min-h-screen bg-cream font-mono flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-black/40" />
      </div>
    );
  }

  let agentWallet: PublicKey | null = null;
  try {
    agentWallet = new PublicKey(id);
  } catch {
    // invalid pubkey
  }

  const agent = agents.find((a) => agentWallet && a.wallet.equals(agentWallet));

  if (!agent) {
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
            </div>
          </div>
          <div className="py-8">
            <div className="mx-auto w-[95%] max-w-5xl space-y-6">
              <div className="bg-white border-brutal shadow-brutal p-6 md:p-8 text-center">
                <Brain className="w-16 h-16 text-black/20 mx-auto mb-4" strokeWidth={2} />
                <h1 className="font-heading text-3xl font-black uppercase mb-2">Committee Member</h1>
                <p className="font-mono text-sm text-black/50 mb-4">This wallet is serving on committees but is not a registered agent.</p>
                <div className="bg-cream border-2 border-black p-4 inline-block">
                  <p className="font-mono text-xs font-bold text-black/40 uppercase mb-1">Wallet</p>
                  <p className="font-mono text-sm font-bold break-all">{id}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

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
              agent.isActive ? "bg-lime-green text-black border-black" : "bg-cream text-black/50 border-black/20"
            }`}>
              {agent.isActive ? "active" : "idle"}
            </span>
          </div>
        </div>

        <div className="py-8">
          <div className="mx-auto w-[95%] max-w-5xl space-y-6">
            <div className="bg-white border-brutal shadow-brutal p-6 md:p-8">
              <div className="flex items-center gap-6 mb-6">
                <div className="w-20 h-20 border-brutal flex items-center justify-center" style={{ backgroundColor: agent.color }}>
                  <Brain className="w-10 h-10 text-black" strokeWidth={2} />
                </div>
                <div>
                  <GradientHeading variant="solana" size="lg">{agent.name}</GradientHeading>
                  <p className="font-mono text-sm font-bold text-black/60 uppercase mt-1 break-all">
                    {agent.wallet.toBase58()}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white border-brutal shadow-brutal-sm p-4 text-center">
                <p className="font-mono text-[10px] font-bold uppercase text-black/40 mb-1">Reputation</p>
                <p className="font-heading font-black text-3xl tabular-nums" style={{ color: agent.color }}>{agent.reputation}</p>
              </div>
              <div className="bg-white border-brutal shadow-brutal-sm p-4 text-center">
                <p className="font-mono text-[10px] font-bold uppercase text-black/40 mb-1">Accuracy</p>
                <p className="font-heading font-black text-3xl text-lime-green tabular-nums">{agent.accuracy}%</p>
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
                      style={{ width: `${Math.min(agent.reputation / 10, 100)}%`, backgroundColor: agent.color }}
                    />
                  </div>
                  <div className="flex justify-between mt-1 font-mono text-[9px] font-bold uppercase text-black/30">
                    <span>0</span>
                    <span>500</span>
                    <span>1000</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-black text-white border-brutal p-6 bg-grid-pattern-dark">
              <h2 className="font-heading text-lg font-black uppercase tracking-tight text-lime-green mb-4">
                On-chain Identity
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border-2 border-white/15 p-3">
                  <p className="font-mono text-[10px] font-bold uppercase text-white/30 mb-1">Agent PDA</p>
                  <p className="font-mono text-xs font-bold text-lime-green break-all">{agent.pda.toBase58()}</p>
                </div>
                <div className="border-2 border-white/15 p-3">
                  <p className="font-mono text-[10px] font-bold uppercase text-white/30 mb-1">Agent Wallet</p>
                  <p className="font-mono text-xs font-bold text-solana-purple break-all">{agent.wallet.toBase58()}</p>
                </div>
                <div className="border-2 border-white/15 p-3">
                  <p className="font-mono text-[10px] font-bold uppercase text-white/30 mb-1">Bond Amount</p>
                  <p className="font-mono text-xs font-bold text-cyber-yellow">{agent.bondAmount / 1e9} SOL</p>
                </div>
                <div className="border-2 border-white/15 p-3">
                  <p className="font-mono text-[10px] font-bold uppercase text-white/30 mb-1">Registered</p>
                  <p className="font-mono text-xs font-bold text-white/60">{new Date(agent.createdAt * 1000).toLocaleString()}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
