"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  TrendingUp,
  Clock,
  Brain,
  ShieldCheck,
  Eye,
  EyeOff,
  MessageSquare,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { useDive } from "@/hooks/useDive";
import { useDivePrograms } from "@/lib/anchor";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { useWallet } from "@solana/wallet-adapter-react";
import { Button } from "@/components/ui/button";
import { GradientHeading } from "@/components/ui/gradient-heading";
import dynamic from "next/dynamic";

const AgentSwarmGraph = dynamic(() => import("@/components/ui/AgentSwarmGraph"), { ssr: false });

const PHASE_STEPS = [
  { key: "committee", label: "Committee Selected", icon: ShieldCheck },
  { key: "research", label: "Research Phase", icon: Brain },
  { key: "commit", label: "Commit (PER)", icon: EyeOff },
  { key: "reveal", label: "Reveal (Base)", icon: Eye },
  { key: "discussion", label: "Discussion", icon: MessageSquare },
  { key: "final", label: "Final Vote", icon: CheckCircle2 },
  { key: "complete", label: "Settled", icon: TrendingUp },
];

export default function MarketDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const { markets, loading, refresh } = useDive();
  const { diveMarket, diveIdentity, provider } = useDivePrograms();
  const { publicKey } = useWallet();
  const router = useRouter();

  const market = markets.find((m) => m.id === id);

  const [betAmount, setBetAmount] = useState("");
  const [betSide, setBetSide] = useState<"YES" | "NO">("YES");

  const handlePlaceBet = async () => {
    if (!publicKey) {
      alert("Please connect your wallet");
      return;
    }
    
    // Check for HumanAttestation PDA
    const [attestationPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("human_attestation"), publicKey.toBuffer()],
      diveIdentity.programId
    );

    const attestationAccount = await provider.connection.getAccountInfo(attestationPda);
    if (!attestationAccount) {
      alert("You must verify your identity first.");
      router.push("/verify");
      return;
    }

    try {
      const marketPubkey = new PublicKey(id);
      
      const [betPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("bet"), marketPubkey.toBuffer(), publicKey.toBuffer()],
        diveMarket.programId
      );

      const amount = parseFloat(betAmount) * 1e9; // to lamports

      await diveMarket.methods
        .placeBet(new (provider as any).wallet.publicKey.constructor.BN(amount), betSide === "YES" ? { yes: {} } : { no: {} })
        .accounts({
          market: marketPubkey,
          bet: betPda,
          user: publicKey,
          systemProgram: SystemProgram.programId,
        } as any)
        .rpc();

      alert("Bet placed successfully!");
      refresh();
    } catch (e) {
      console.error(e);
      alert("Failed to place bet. See console.");
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-cream flex items-center justify-center font-mono">Loading...</div>;
  }

  if (!market) {
    return (
      <div className="min-h-screen bg-cream font-mono flex items-center justify-center">
        <div className="text-center">
          <h1 className="font-heading text-4xl font-black uppercase">Market Not Found</h1>
          <Link href="/markets" className="text-solana-purple font-bold mt-4 inline-block">Back to Markets</Link>
        </div>
      </div>
    );
  }

  const yesPercent = (market.yesPrice * 100).toFixed(0);
  const noPercent = (market.noPrice * 100).toFixed(0);

  return (
    <div className="min-h-screen bg-cream font-mono bg-noise">
      <div className="fixed inset-0 bg-dot-pattern opacity-[0.06] pointer-events-none z-0" />

      <div className="relative z-10">
        {/* Top Bar */}
        <div className="bg-black text-white py-3 border-brutal-b">
          <div className="mx-auto w-[95%] max-w-7xl flex items-center justify-between">
          <Link href="/markets" className="flex items-center gap-3 hover:text-lime-green transition-colors">
            <ArrowLeft className="w-5 h-5" strokeWidth={3} />
            <span className="font-heading font-black uppercase tracking-tighter">Back</span>
          </Link>
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-white/40">
              {market.category}
            </span>
            <span className={`px-2 py-1 border-2 font-heading font-black text-[10px] uppercase ${
              market.status === "active" ? "bg-lime-green text-black border-black" :
              market.status === "resolved" ? "bg-cyber-yellow text-black border-black" :
              market.status === "disputed" ? "bg-hot-coral text-black border-black" :
              "bg-solana-purple text-white border-white/30"
            }`}>
              {market.status}
            </span>
           </div>
          </div>
        </div>

        <div className="py-8">
          <div className="mx-auto w-[95%] max-w-7xl grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column - Market Info + Trading */}
            <div className="lg:col-span-2 space-y-6">
              {/* Question */}
              <div className="bg-white border-brutal shadow-brutal p-6 md:p-8">
                <GradientHeading variant="solana" size="lg" className="mb-4">
                  {market.question}
                </GradientHeading>
                <div className="flex items-center gap-6 font-mono text-sm font-bold text-black/50">
                  <div className="flex items-center gap-1">
                    <TrendingUp className="w-4 h-4" />
                    Vol: ${(market.totalVolume / 1000).toFixed(0)}K
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    Ends {new Date(market.deadline).toLocaleDateString()}
                  </div>
                </div>
              </div>

              {/* Trading Panel */}
              {market.status === "active" && (
                <div className="bg-white border-brutal shadow-brutal p-6 md:p-8">
                  <h2 className="font-heading text-xl font-black uppercase tracking-tight border-brutal-b pb-3 mb-6">
                    Place Bet
                  </h2>

                  {/* YES/NO Selector */}
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <button
                      onClick={() => setBetSide("YES")}
                      className={`p-4 border-4 transition-all ${
                        betSide === "YES"
                          ? "border-lime-green bg-lime-green/20 shadow-brutal-sm"
                          : "border-black hover:border-lime-green"
                      }`}
                    >
                      <p className="font-mono text-xs font-bold uppercase text-black/50">YES</p>
                      <p className="font-heading font-black text-3xl text-lime-green tabular-nums">{yesPercent}¢</p>
                    </button>
                    <button
                      onClick={() => setBetSide("NO")}
                      className={`p-4 border-4 transition-all ${
                        betSide === "NO"
                          ? "border-hot-coral bg-hot-coral/20 shadow-brutal-sm"
                          : "border-black hover:border-hot-coral"
                      }`}
                    >
                      <p className="font-mono text-xs font-bold uppercase text-black/50">NO</p>
                      <p className="font-heading font-black text-3xl text-hot-coral tabular-nums">{noPercent}¢</p>
                    </button>
                  </div>

                  {/* Amount Input */}
                  <div className="mb-4">
                    <label className="font-heading font-black uppercase text-sm tracking-wider mb-2 block">
                      Amount (SOL)
                    </label>
                    <input
                      type="number"
                      value={betAmount}
                      onChange={(e) => setBetAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full h-14 px-4 border-4 border-black bg-cream font-mono text-lg font-bold focus:outline-none focus:bg-white transition-colors"
                    />
                  </div>

                  <Button variant={betSide === "YES" ? "default" : "destructive"} className="w-full h-14 text-xl" onClick={handlePlaceBet}>
                    Bet {betSide} {betAmount ? `${betAmount} SOL` : ""}
                  </Button>

                  {market.resolution && (
                    <div className="mt-4 p-4 border-4 border-cyber-yellow bg-cyber-yellow/10 flex items-center gap-3">
                      <CheckCircle2 className="w-6 h-6 text-cyber-yellow" />
                      <div>
                        <p className="font-heading font-black uppercase text-sm">Resolved: {market.resolution}</p>
                        <p className="font-mono text-xs text-black/50">Claim your payout below</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Resolution Timeline (for non-active markets) */}
              {market.status !== "active" && (
                <div className="bg-white border-brutal shadow-brutal p-6 md:p-8">
                  <h2 className="font-heading text-xl font-black uppercase tracking-tight border-brutal-b pb-3 mb-6">
                    Resolution Pipeline
                  </h2>
                  <div className="space-y-4">
                    {PHASE_STEPS.map((step, i) => {
                      const phaseOrder = ["committee", "research", "commit", "reveal", "discussion", "final", "complete"];
                      const currentIdx = phaseOrder.indexOf(market.status);
                      const stepIdx = phaseOrder.indexOf(step.key);
                      const isComplete = stepIdx < currentIdx;
                      const isCurrent = step.key === market.status;
                      const Icon = step.icon;

                      return (
                        <div
                          key={step.key}
                          className={`flex items-center gap-4 p-3 border-2 ${
                            isCurrent ? "border-solana-purple bg-solana-purple/10" :
                            isComplete ? "border-lime-green bg-lime-green/10" :
                            "border-black/10 bg-black/5"
                          }`}
                        >
                          <div className={`w-10 h-10 flex items-center justify-center border-2 ${
                            isCurrent ? "border-solana-purple bg-solana-purple text-white" :
                            isComplete ? "border-lime-green bg-lime-green" :
                            "border-black/20 bg-white"
                          }`}>
                            <Icon className="w-5 h-5" strokeWidth={3} />
                          </div>
                          <div className="flex-1">
                            <p className={`font-heading font-black uppercase text-sm ${
                              isCurrent ? "text-solana-purple" : isComplete ? "text-lime-green" : "text-black/30"
                            }`}>
                              Phase {i + 1}: {step.label}
                            </p>
                          </div>
                          {isCurrent && (
                            <span className="px-2 py-1 bg-solana-purple text-white font-mono text-[10px] font-bold uppercase animate-pulse">
                              Live
                            </span>
                          )}
                          {isComplete && (
                            <CheckCircle2 className="w-5 h-5 text-lime-green" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 3D Agent Swarm Graph */}
              <div className="bg-white border-brutal shadow-brutal p-6 md:p-8 h-[400px] flex flex-col">
                <h2 className="font-heading text-xl font-black uppercase tracking-tight border-brutal-b pb-3 mb-6">
                  Agent Swarm Graph
                </h2>
                <div className="flex-1 relative">
                  <AgentSwarmGraph agents={
                    market.agentInsights.map(insight => ({
                      name: insight.agentName,
                      vote: insight.prediction as "YES" | "NO" | "UNSURE",
                      reputation: insight.confidence
                    }))
                  } />
                </div>
              </div>

              {/* Pool Info */}
              <div className="bg-white border-brutal shadow-brutal p-6 md:p-8">
                <h2 className="font-heading text-xl font-black uppercase tracking-tight border-brutal-b pb-3 mb-6">
                  Pool Breakdown
                </h2>
                <div className="grid grid-cols-2 gap-6">
                  <div className="border-4 border-lime-green p-4 text-center">
                    <p className="font-mono text-xs font-bold uppercase text-black/50 mb-1">YES Pool</p>
                    <p className="font-heading font-black text-2xl text-lime-green tabular-nums">
                      {market.yesPool.toLocaleString()} SOL
                    </p>
                  </div>
                  <div className="border-4 border-hot-coral p-4 text-center">
                    <p className="font-mono text-xs font-bold uppercase text-black/50 mb-1">NO Pool</p>
                    <p className="font-heading font-black text-2xl text-hot-coral tabular-nums">
                      {market.noPool.toLocaleString()} SOL
                    </p>
                  </div>
                </div>
                <div className="mt-4 h-6 border-2 border-black flex overflow-hidden">
                  <div
                    className="bg-lime-green transition-all duration-500"
                    style={{ width: `${parseFloat(yesPercent)}%` }}
                  />
                  <div
                    className="bg-hot-coral transition-all duration-500"
                    style={{ width: `${parseFloat(noPercent)}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Right Column - Agent Insights */}
            <div className="space-y-6">
              {/* Agent Insights */}
              <div className="bg-white border-brutal shadow-brutal p-6">
                <h2 className="font-heading text-xl font-black uppercase tracking-tight border-brutal-b pb-3 mb-4">
                  AI Predictions
                </h2>
                {market.agentInsights.length > 0 ? (
                  <div className="space-y-3">
                    {market.agentInsights.map((insight, i) => (
                      <div
                        key={i}
                        className={`border-2 p-3 ${
                          insight.prediction === "YES"
                            ? "border-lime-green bg-lime-green/5"
                            : "border-hot-coral bg-hot-coral/5"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-heading font-black uppercase text-sm">
                            {insight.agentName}
                          </span>
                          <span
                            className={`px-2 py-0.5 border font-heading font-black text-xs uppercase ${
                              insight.prediction === "YES"
                                ? "bg-lime-green text-black border-black"
                                : "bg-hot-coral text-black border-black"
                            }`}
                          >
                            {insight.prediction} {insight.confidence}%
                          </span>
                        </div>
                        <p className="font-mono text-xs text-black/70 leading-relaxed">
                          {insight.reasoning}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Brain className="w-8 h-8 text-black/20 mx-auto mb-2" />
                    <p className="font-mono text-xs font-bold uppercase text-black/30">
                      No agent insights yet
                    </p>
                  </div>
                )}
              </div>

              {/* Quick Links */}
              <div className="bg-black text-white border-brutal p-6 bg-grid-pattern-dark">
                <h3 className="font-heading font-black uppercase tracking-tight mb-4 text-lime-green">
                  Quick Links
                </h3>
                <div className="space-y-2">
                  <Link href="/oracle" className="block p-3 border-2 border-white/20 hover:border-lime-green hover:bg-white/5 font-mono text-sm font-bold transition-colors">
                    View Oracle Dashboard
                  </Link>
                  <Link href="/verify" className="block p-3 border-2 border-white/20 hover:border-solana-purple hover:bg-white/5 font-mono text-sm font-bold transition-colors">
                    Verify Your Identity
                  </Link>
                  <Link href="/create" className="block p-3 border-2 border-white/20 hover:border-cyber-yellow hover:bg-white/5 font-mono text-sm font-bold transition-colors">
                    Create New Market
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
