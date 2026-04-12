"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Search, TrendingUp, BarChart3, Filter, RefreshCw } from "lucide-react";
import { useDive } from "@/hooks/useDive";
import { Button } from "@/components/ui/button";

const STATUS_STYLES: Record<string, { bg: string; text: string }> = {
  active: { bg: "bg-lime-green", text: "text-black" },
  resolved: { bg: "bg-cyber-yellow", text: "text-black" },
  disputed: { bg: "bg-hot-coral", text: "text-black" },
  commit: { bg: "bg-solana-purple", text: "text-white" },
  reveal: { bg: "bg-solana-purple", text: "text-white" },
  discussion: { bg: "bg-hot-coral", text: "text-black" },
};

export default function MarketsPage() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<string>("all");
  const { markets: MARKETS, loading } = useDive();

  const categories = ["all", ...Array.from(new Set(MARKETS.map((m) => m.category)))];

  const filtered = MARKETS.filter((m) => {
    const matchSearch = m.question.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === "all" || m.category === filter;
    return matchSearch && matchFilter;
  });

  return (
    <div className="min-h-screen bg-cream font-mono bg-noise">
      <div className="fixed inset-0 bg-dot-pattern opacity-[0.06] pointer-events-none z-0" />

      <div className="relative z-10">
        {/* Header Bar */}
        <div className="bg-black text-white py-4 border-brutal-b">
          <div className="mx-auto w-[95%] max-w-7xl flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <BarChart3 className="w-6 h-6 text-solana-green" strokeWidth={3} />
              <h1 className="font-heading text-2xl md:text-3xl font-black uppercase tracking-tighter">
                Markets
              </h1>
            </div>
            <div className="flex items-center gap-3 w-full md:w-auto">
              <div className="relative flex-1 md:w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-black/30" />
                <input
                  type="text"
                  placeholder="Search markets..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full h-10 pl-10 pr-4 border-2 border-black bg-white font-mono text-sm font-semibold focus:outline-none focus:bg-lime-green/20 transition-colors"
                />
              </div>
              <Link href="/create">
                <Button variant="solana" size="sm" className="hidden md:flex">
                  + Create
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Category Filters */}
        <div className="py-4 border-brutal-b bg-white/50">
          <div className="mx-auto w-[95%] max-w-7xl flex items-center gap-2 overflow-x-auto">
            <Filter className="w-4 h-4 text-black/40 shrink-0" />
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setFilter(cat)}
                className={`px-4 py-2 border-2 border-black font-heading font-black text-xs uppercase tracking-wider transition-all whitespace-nowrap ${
                  filter === cat
                    ? "bg-black text-white shadow-brutal-sm"
                    : "bg-white text-black hover:bg-black hover:text-white"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Market Grid */}
        <div className="py-8">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-black/50">
              <RefreshCw className="w-8 h-8 animate-spin mb-4" />
              <p className="font-heading text-lg font-black uppercase">Loading Markets...</p>
            </div>
          ) : (
            <div className="mx-auto w-[95%] max-w-7xl grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map((market) => {
              const style = STATUS_STYLES[market.status] || STATUS_STYLES.active;
              return (
                <Link
                  key={market.id}
                  href={`/market/${market.id}`}
                  className="block group"
                >
                  <div className="bg-white border-brutal shadow-brutal p-6 flex flex-col gap-4 hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] transition-all h-full">
                    {/* Status + Category */}
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-black/40">
                        {market.category}
                      </span>
                      <span
                        className={`${style.bg} ${style.text} px-2 py-1 border-2 border-black font-heading font-black text-[10px] uppercase`}
                      >
                        {market.status}
                      </span>
                    </div>

                    {/* Question */}
                    <h2 className="font-heading text-lg font-black uppercase tracking-tight leading-tight group-hover:text-solana-purple transition-colors">
                      {market.question}
                    </h2>

                    {/* YES/NO Prices */}
                    <div className="grid grid-cols-2 gap-3 mt-auto">
                      <div className="border-4 border-lime-green p-3 text-center bg-lime-green/10">
                        <p className="font-mono text-[10px] font-bold uppercase text-black/50 mb-1">YES</p>
                        <p className="font-heading font-black text-2xl text-lime-green tabular-nums">
                          {(market.yesPrice * 100).toFixed(0)}¢
                        </p>
                      </div>
                      <div className="border-4 border-hot-coral p-3 text-center bg-hot-coral/10">
                        <p className="font-mono text-[10px] font-bold uppercase text-black/50 mb-1">NO</p>
                        <p className="font-heading font-black text-2xl text-hot-coral tabular-nums">
                          {(market.noPrice * 100).toFixed(0)}¢
                        </p>
                      </div>
                    </div>

                    {/* Volume + Deadline */}
                    <div className="flex items-center justify-between border-t-4 border-black pt-3">
                      <div className="flex items-center gap-1">
                        <TrendingUp className="w-3 h-3 text-black/40" />
                        <span className="font-mono text-[10px] font-bold text-black/50 uppercase">
                          Vol: ${(market.totalVolume / 1000).toFixed(0)}K
                        </span>
                      </div>
                      <span className="font-mono text-[10px] font-bold text-black/50 uppercase">
                        Ends {new Date(market.deadline).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
          )}

          {(!loading && filtered.length === 0) && (
            <div className="text-center py-20">
              <p className="font-heading text-2xl font-black uppercase text-black/30">
                No markets found
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
