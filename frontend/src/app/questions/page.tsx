"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Search, TrendingUp, BarChart3, Filter, Loader2 } from "lucide-react";
import { useQuestions } from "@/hooks/use-on-chain";
import { Button } from "@/components/ui/button";
import { LiveTerminal } from "@/components/ui/live-terminal";

const STATUS_STYLES: Record<string, { bg: string; text: string }> = {
  Pending: { bg: "bg-lime-green", text: "text-black" },
  "Committee Selected": { bg: "bg-solana-purple", text: "text-white" },
  "Commit Phase": { bg: "bg-solana-purple", text: "text-white" },
  "Reveal Phase": { bg: "bg-cyber-yellow", text: "text-black" },
  Discussion: { bg: "bg-hot-coral", text: "text-black" },
  Resolved: { bg: "bg-lime-green", text: "text-black" },
};

export default function QuestionsPage() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<string>("all");
  const { questions, loading, refetch } = useQuestions();

  const categories = ["all", ...Array.from(new Set(questions.map((q) => q.category).filter(Boolean)))];

  const filtered = questions.filter((q) => {
    const matchSearch = q.questionText.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === "all" || q.category === filter;
    return matchSearch && matchFilter;
  });

  return (
    <div className="min-h-screen bg-cream font-mono bg-noise">
      <div className="fixed inset-0 bg-dot-pattern opacity-[0.06] pointer-events-none z-0" />

      <div className="relative z-10">
        <div className="bg-black text-white py-4 border-brutal-b">
          <div className="mx-auto w-[95%] max-w-7xl flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <BarChart3 className="w-6 h-6 text-solana-green" strokeWidth={3} />
              <h1 className="font-heading text-2xl md:text-3xl font-black uppercase tracking-tighter">
                Questions
              </h1>
            </div>
            <div className="flex items-center gap-3 w-full md:w-auto">
              <div className="relative flex-1 md:w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-black/30" />
                <input
                  type="text"
                  placeholder="Search questions..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full h-10 pl-10 pr-4 border-2 border-black bg-white font-mono text-sm font-semibold focus:outline-none focus:bg-lime-green/20 transition-colors"
                />
              </div>
              <Link href="/ask">
                <Button variant="solana" size="sm" className="hidden md:flex">
                  + Ask
                </Button>
              </Link>
              <Button variant="outline" size="sm" onClick={refetch}>
                <TrendingUp className="w-4 h-4" strokeWidth={3} />
              </Button>
            </div>
          </div>
        </div>

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

        <div className="py-8">
          {loading ? (
            <div className="text-center py-20">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-black/40" />
              <p className="font-heading text-lg font-black uppercase text-black/30 mt-4">
                Loading from chain...
              </p>
            </div>
          ) : (
            <div className="mx-auto w-[95%] max-w-7xl grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map((question) => {
                const style = STATUS_STYLES[question.statusLabel] || STATUS_STYLES.Pending;
                const totalVotes = question.yesVotes + question.noVotes + question.unsureVotes;
                return (
                  <Link
                    key={question.questionId}
                    href={`/question/${question.questionId}`}
                    className="block group"
                  >
                    <div className="bg-white border-brutal shadow-brutal p-6 flex flex-col gap-4 hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] transition-all h-full">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-black/40">
                          {question.category}
                        </span>
                        <span
                          className={`${style.bg} ${style.text} px-2 py-1 border-2 border-black font-heading font-black text-[10px] uppercase`}
                        >
                          {question.statusLabel}
                        </span>
                      </div>

                      <h2 className="font-heading text-lg font-black uppercase tracking-tight leading-tight group-hover:text-solana-purple transition-colors">
                        {question.questionText}
                      </h2>

                      <div className="grid grid-cols-3 gap-2 mt-auto">
                        <div className="border-2 border-lime-green p-2 text-center bg-lime-green/10">
                          <p className="font-mono text-[9px] font-bold uppercase text-black/40">YES</p>
                          <p className="font-heading font-black text-xl text-lime-green tabular-nums">
                            {question.yesVotes}
                          </p>
                        </div>
                        <div className="border-2 border-hot-coral p-2 text-center bg-hot-coral/10">
                          <p className="font-mono text-[9px] font-bold uppercase text-black/40">NO</p>
                          <p className="font-heading font-black text-xl text-hot-coral tabular-nums">
                            {question.noVotes}
                          </p>
                        </div>
                        <div className="border-2 border-cyber-yellow p-2 text-center bg-cyber-yellow/10">
                          <p className="font-mono text-[9px] font-bold uppercase text-black/40">UNSURE</p>
                          <p className="font-heading font-black text-xl text-cyber-yellow tabular-nums">
                            {question.unsureVotes}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between border-t-4 border-black pt-3">
                        <div className="flex items-center gap-1">
                          <TrendingUp className="w-3 h-3 text-black/40" />
                          <span className="font-mono text-[10px] font-bold text-black/50 uppercase">
                            ID: {question.questionId}
                          </span>
                        </div>
                        <span className="font-mono text-[10px] font-bold text-black/50 uppercase">
                          {question.committee.length} agents
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}

          {!loading && filtered.length === 0 && (
            <div className="text-center py-20">
              <p className="font-heading text-2xl font-black uppercase text-black/30">
                No questions found
              </p>
              <Link href="/ask">
                <Button variant="solana" className="mt-4">Ask the Oracle</Button>
              </Link>
            </div>
          )}

          <div className="mt-8">
            <LiveTerminal />
          </div>
        </div>
      </div>
    </div>
  );
}
