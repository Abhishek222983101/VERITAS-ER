"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { Wallet, TrendingUp, CheckCircle2, Clock, ArrowRight } from "lucide-react";
import { GradientHeading } from "@/components/ui/gradient-heading";
import { Button } from "@/components/ui/button";
import { useDive } from "@/hooks/useDive";

const MOCK_POSITIONS = [
  { marketId: "btc-150k", side: "YES" as const, amount: 5.0, entryPrice: 0.52 },
  { marketId: "sol-500", side: "YES" as const, amount: 12.0, entryPrice: 0.71 },
  { marketId: "ai-regulation", side: "NO" as const, amount: 3.0, entryPrice: 0.78 },
];

const MOCK_HISTORY = [
  { market: "Will ETH ETF be approved?", side: "YES", amount: 8.0, payout: 11.5, won: true },
  { market: "Will BTC drop below $40K?", side: "NO", amount: 2.0, payout: 2.0, won: true },
  { market: "Will OpenAI release GPT-5?", side: "YES", amount: 4.0, payout: 0, won: false },
];

export default function DashboardPage() {
  const { markets, loading } = useDive();

  const activePositions = useMemo(() => {
    return MOCK_POSITIONS.filter((p) => {
      const m = markets.find((mk) => mk.id === p.marketId);
      return m && m.status !== "resolved";
    });
  }, [markets]);

  const resolvedPositions = MOCK_HISTORY;

  return (
    <div className="min-h-screen bg-cream font-mono bg-noise">
      <div className="fixed inset-0 bg-dot-pattern opacity-[0.06] pointer-events-none z-0" />

      <div className="relative z-10">
        <div className="bg-black text-white py-4 border-brutal-b">
          <div className="mx-auto w-[95%] max-w-7xl flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Wallet className="w-6 h-6 text-solana-green" strokeWidth={3} />
              <h1 className="font-heading text-2xl md:text-3xl font-black uppercase tracking-tighter">
                Dashboard
              </h1>
            </div>
            <div className="font-mono text-xs font-bold text-white/40 uppercase">
              Connect Wallet to view positions
            </div>
          </div>
        </div>

        <div className="py-8">
          <div className="mx-auto w-[95%] max-w-7xl space-y-8">
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white border-brutal shadow-brutal-sm p-4 text-center">
                <p className="font-mono text-[10px] font-bold uppercase text-black/40 mb-1">Open Positions</p>
                <p className="font-heading font-black text-3xl text-solana-purple">{activePositions.length}</p>
              </div>
              <div className="bg-white border-brutal shadow-brutal-sm p-4 text-center">
                <p className="font-mono text-[10px] font-bold uppercase text-black/40 mb-1">Total Wagered</p>
                <p className="font-heading font-black text-3xl">{MOCK_POSITIONS.reduce((s, p) => s + p.amount, 0).toFixed(1)} SOL</p>
              </div>
              <div className="bg-white border-brutal shadow-brutal-sm p-4 text-center">
                <p className="font-mono text-[10px] font-bold uppercase text-black/40 mb-1">Won</p>
                <p className="font-heading font-black text-3xl text-lime-green">{MOCK_HISTORY.filter((h) => h.won).length}</p>
              </div>
              <div className="bg-white border-brutal shadow-brutal-sm p-4 text-center">
                <p className="font-mono text-[10px] font-bold uppercase text-black/40 mb-1">Total Payout</p>
                <p className="font-heading font-black text-3xl text-lime-green">{MOCK_HISTORY.reduce((s, h) => s + h.payout, 0).toFixed(1)} SOL</p>
              </div>
            </div>

            {/* Active Positions */}
            <div>
              <GradientHeading variant="default" size="lg" className="mb-4">
                Open Positions
              </GradientHeading>
              {activePositions.length > 0 ? (
                <div className="space-y-3">
                  {activePositions.map((pos, i) => {
                    const market = markets.find((m) => m.id === pos.marketId);
                    if (!market) return null;
                    const currentPrice = pos.side === "YES" ? market.yesPrice : market.noPrice;
                    const pnl = ((currentPrice - pos.entryPrice) / pos.entryPrice) * 100;

                    return (
                      <Link key={i} href={`/market/${pos.marketId}`} className="block">
                        <div className="bg-white border-brutal shadow-brutal-sm p-5 hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-brutal transition-all">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <h3 className="font-heading text-lg font-black uppercase tracking-tight">
                                {market.question}
                              </h3>
                              <div className="flex items-center gap-4 mt-2 font-mono text-xs font-bold text-black/50">
                                <span>Entry: {pos.entryPrice.toFixed(2)}</span>
                                <span>Current: {currentPrice.toFixed(2)}</span>
                                <span>Amount: {pos.amount} SOL</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className={`px-3 py-1 border-2 font-heading font-black text-sm uppercase ${
                                pos.side === "YES" ? "bg-lime-green text-black border-black" : "bg-hot-coral text-black border-black"
                              }`}>
                                {pos.side}
                              </span>
                              <span className={`font-heading font-black text-lg ${pnl >= 0 ? "text-lime-green" : "text-hot-coral"}`}>
                                {pnl >= 0 ? "+" : ""}{pnl.toFixed(1)}%
                              </span>
                            </div>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <div className="bg-white border-brutal shadow-brutal p-12 text-center">
                  <p className="font-heading text-xl font-black uppercase text-black/30">No open positions</p>
                  <Link href="/markets">
                    <Button variant="solana" className="mt-4">Browse Markets</Button>
                  </Link>
                </div>
              )}
            </div>

            {/* History */}
            <div>
              <GradientHeading variant="default" size="lg" className="mb-4">
                Transaction History
              </GradientHeading>
              <div className="space-y-2">
                {resolvedPositions.map((tx, i) => (
                  <div key={i} className="flex items-center justify-between p-4 bg-white border-2 border-black/10">
                    <div className="flex-1">
                      <p className="font-heading font-black text-sm uppercase">{tx.market}</p>
                      <p className="font-mono text-[10px] text-black/40">{tx.amount} SOL on {tx.side}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      {tx.won ? (
                        <>
                          <span className="font-heading font-black text-lime-green">+{tx.payout} SOL</span>
                          <CheckCircle2 className="w-5 h-5 text-lime-green" />
                        </>
                      ) : (
                        <span className="font-heading font-black text-hot-coral">-{tx.amount} SOL</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
