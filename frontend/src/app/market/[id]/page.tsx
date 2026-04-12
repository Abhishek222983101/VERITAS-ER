"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  TrendingUp,
  Clock,
  Brain,
  CheckCircle2,
  Loader2,
  Zap,
} from "lucide-react";
import { MARKETS } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { GradientHeading } from "@/components/ui/gradient-heading";
import DisputeTracker from "@/components/dispute-tracker";

export default function MarketDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const market = MARKETS.find((m) => m.id === id);

  const [betAmount, setBetAmount] = useState("");
  const [betSide, setBetSide] = useState<"YES" | "NO">("YES");
  const [activeDisputeId, setActiveDisputeId] = useState<string | null>(null);
  const [isResolving, setIsResolving] = useState(false);

  const checkExistingDispute = useCallback(async () => {
    if (!id) return;
    try {
      const res = await fetch(`/api/dispute/${id}?byMarket=true&light=true`);
      const data = await res.json();
      if (data.dispute && ["researching", "voting", "discussion", "revoting", "mediating"].includes(data.dispute.status)) {
        setActiveDisputeId(data.dispute.id);
      }
    } catch {}
  }, [id]);

  useEffect(() => {
    checkExistingDispute();
  }, [checkExistingDispute]);

  const handleOpenDispute = async () => {
    if (!market) return;
    setIsResolving(true);
    try {
      const res = await fetch("/api/dispute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          market_id: market.id,
          question: market.question,
          resolution_criteria: `Resolve whether: ${market.question}`,
          resolution_date: market.deadline,
        }),
      });
      const data = await res.json();
      if (data.dispute) {
        setActiveDisputeId(data.dispute.id);
      }
    } catch (err) {
      console.error("Dispute resolution failed:", err);
    } finally {
      setIsResolving(false);
    }
  };

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
            {/* Left Column */}
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
                  <Button variant={betSide === "YES" ? "default" : "destructive"} className="w-full h-14 text-xl">
                    Bet {betSide} {betAmount ? `${betAmount} SOL` : ""}
                  </Button>
                </div>
              )}

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
                  <div className="bg-lime-green transition-all duration-500" style={{ width: `${parseFloat(yesPercent)}%` }} />
                  <div className="bg-hot-coral transition-all duration-500" style={{ width: `${parseFloat(noPercent)}%` }} />
                </div>
              </div>
            </div>

            {/* Right Column - AI Predictions */}
            <div className="space-y-6">
              {/* Live AI Predictions */}
              <div className="bg-white border-brutal shadow-brutal p-6">
                <h2 className="font-heading text-xl font-black uppercase tracking-tight border-brutal-b pb-3 mb-4">
                  AI Predictions
                </h2>

                {activeDisputeId ? (
                  <DisputeTracker disputeId={activeDisputeId} onDismiss={() => setActiveDisputeId(null)} />
                ) : (
                  <div className="text-center py-6">
                    <Brain className="w-8 h-8 text-black/20 mx-auto mb-2" />
                    <p className="font-mono text-xs font-bold uppercase text-black/30 mb-4">
                      No live predictions yet
                    </p>
                    {market.agentInsights.length > 0 && (
                      <div className="space-y-2 mb-4">
                        {market.agentInsights.map((insight, i) => (
                          <div key={i} className={`border-2 p-2 text-left ${
                            insight.prediction === "YES" ? "border-lime-green bg-lime-green/5" : "border-hot-coral bg-hot-coral/5"
                          }`}>
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-heading font-black uppercase text-[10px]">{insight.agentName}</span>
                              <span className="font-mono text-[9px] font-bold uppercase text-black/40">
                                {insight.prediction} {insight.confidence}%
                              </span>
                            </div>
                            <p className="font-mono text-[9px] text-black/50 leading-relaxed">{insight.reasoning}</p>
                          </div>
                        ))}
                        <p className="font-mono text-[8px] text-black/30 uppercase mt-2">Static predictions - click below for live</p>
                      </div>
                    )}
                    <Button
                      variant="solana"
                      className="w-full"
                      onClick={handleOpenDispute}
                      disabled={isResolving}
                    >
                      {isResolving ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Starting...
                        </>
                      ) : (
                        <>
                          <Zap className="w-4 h-4 mr-2" />
                          Solve with AI Agents
                        </>
                      )}
                    </Button>
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
