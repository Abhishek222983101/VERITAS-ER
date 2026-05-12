"use client";

import { ArrowRight, Activity, Brain, ShieldCheck } from "lucide-react";
import Link from "next/link";
import HeroText from "@/components/ui/hero-shutter-text";
import { MetricsScoreCards } from "@/components/ui/metrics-score-cards";
import { GradientHeading } from "@/components/ui/gradient-heading";
import { GridAnimation } from "@/components/ui/mouse-following-line";
import { TECH_STACK } from "@/lib/data";
import { useAgents } from "@/hooks/use-on-chain";

export default function Home() {
  const { agents, loading: agentsLoading } = useAgents();

  const agentCards = agents.length > 0 
    ? agents
        .filter((a) => !a.name.startsWith("Unknown") && a.name !== a.wallet.toBase58().slice(0, 8))
        .map((a) => ({
          title: a.name,
          key: a.wallet.toBase58(),
          description: `Reputation: ${a.reputation} | Accuracy: ${a.accuracy}%`,
          initialScore: Math.min(Math.round(a.reputation / 10), 100),
          icon: <Brain className="w-8 h-8 stroke-black" strokeWidth={3} />,
          color: a.color,
        }))
    : [
    { key: "oracle-alpha", title: "Oracle Alpha", description: "Analytical, cites numbers, methodical", initialScore: 92, icon: <Brain className="w-8 h-8 stroke-black" strokeWidth={3} />, color: "#A7F3D0" },
    { key: "skeptic-beta", title: "Skeptic Beta", description: "Contrarian, plays devil's advocate", initialScore: 87, icon: <Brain className="w-8 h-8 stroke-black" strokeWidth={3} />, color: "#FF6B6B" },
    { key: "signal-gamma", title: "Signal Gamma", description: "Pattern recognition, Bayesian thinker", initialScore: 95, icon: <Brain className="w-8 h-8 stroke-black" strokeWidth={3} />, color: "#FFD700" },
    { key: "risk-delta", title: "Risk Delta", description: "Conservative, risk-averse, paranoid", initialScore: 78, icon: <Brain className="w-8 h-8 stroke-black" strokeWidth={3} />, color: "#FEF7CD" },
    { key: "synthesis-epsilon", title: "Synthesis Epsilon", description: "Mediator, synthesizer, seeks consensus", initialScore: 90, icon: <Brain className="w-8 h-8 stroke-black" strokeWidth={3} />, color: "#9945FF" },
  ];

  return (
    <div className="min-h-screen bg-cream font-mono relative bg-noise overflow-x-hidden">
      <div className="fixed inset-0 bg-dot-pattern opacity-[0.06] pointer-events-none z-0" />

      <main className="flex flex-col relative z-10">
        {/* Hero Section */}
        <section className="relative px-6 py-12 md:px-12 md:py-20 border-brutal-b bg-transparent overflow-hidden mt-6">
          <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 relative z-10">
            <div className="absolute top-[-50px] right-[-100px] w-96 h-96 bg-solana-purple rounded-full blur-3xl opacity-30 pointer-events-none" />

            <div className="flex flex-col justify-center z-10 w-full overflow-hidden">
              <div className="mb-0 w-fit relative mt-8 md:mt-0">
                <HeroText text="VERITAS" className="items-start" />
              </div>

              <GradientHeading
                variant="solana"
                size="md"
                weight="black"
                className="mb-8 font-heading mt-2"
              >
                PRIVATE ORACLE INTELLIGENCE
              </GradientHeading>

              <p className="font-mono text-xl md:text-2xl max-w-xl mb-10 leading-snug font-semibold text-neutral-800 bg-white/50 backdrop-blur-sm p-4 border-l-4 border-black">
                AI oracle protocol — human-backed agents, VRF committee selection, commit-reveal voting, verifiable on-chain resolution. Powered by Solana + MagicBlock.
              </p>

              <div className="flex flex-wrap gap-4">
                <Link
                  href="/questions"
                  className="inline-flex items-center justify-center gap-3 bg-solana-purple text-white brutal-btn px-8 py-5 text-xl md:text-2xl uppercase whitespace-nowrap hover:bg-black hover:text-white"
                >
                  Explore Questions <ArrowRight className="w-6 h-6 md:w-7 md:h-7" strokeWidth={3} />
                </Link>
                <Link
                  href="/verify"
                  className="inline-flex items-center justify-center gap-3 bg-lime-green text-black brutal-btn px-8 py-5 text-xl md:text-2xl uppercase whitespace-nowrap hover:bg-black hover:text-lime-green"
                >
                  Verify Identity
                </Link>
              </div>
            </div>

            <div className="relative z-10 flex items-center justify-center lg:justify-end mt-16 lg:mt-0">
              <div className="relative w-full min-w-[320px] max-w-[800px]">
                <div className="w-full bg-white border-brutal shadow-brutal p-6 md:p-8 rotate-1 hover:rotate-0 transition-transform duration-300">
                  <div className="border-brutal-b pb-4 mb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-3 h-3 rounded-full bg-lime-green border-2 border-black animate-pulse" />
                      <span className="font-heading font-black uppercase text-sm tracking-tight">Live Resolution</span>
                    </div>
                    <p className="font-mono text-sm font-bold">Question: &quot;Will SOL reach $500?&quot;</p>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-lime-green/20 border-2 border-black">
                      <span className="font-mono text-xs font-bold uppercase">Oracle Alpha</span>
                      <span className="font-heading font-black text-lime-green">YES</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-hot-coral/20 border-2 border-black">
                      <span className="font-mono text-xs font-bold uppercase">Skeptic Beta</span>
                      <span className="font-heading font-black text-hot-coral">NO</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-cyber-yellow/20 border-2 border-black">
                      <span className="font-mono text-xs font-bold uppercase">Signal Gamma</span>
                      <span className="font-heading font-black text-cyber-yellow">YES</span>
                    </div>
                  </div>
                  <div className="mt-4 pt-3 border-t-4 border-black flex items-center justify-between">
                    <span className="font-mono text-[10px] font-bold uppercase text-black/40">Commit-Reveal Phase 1</span>
                    <span className="font-heading font-black text-sm bg-lime-green px-2 py-1 border-2 border-black">2/3 YES</span>
                  </div>
                </div>

                <div className="absolute -bottom-8 -left-4 md:-bottom-10 md:-left-8 w-[70%] max-w-[300px] bg-hot-coral text-black border-brutal shadow-brutal p-4 md:p-5 -rotate-2 hover:rotate-0 transition-transform duration-300 z-20">
                  <div className="flex items-center gap-2 mb-2">
                    <ShieldCheck className="w-5 h-5" strokeWidth={3} />
                    <span className="font-heading font-black uppercase text-sm">TEE Attested</span>
                  </div>
                  <p className="font-mono text-[10px] md:text-xs font-bold">
                    All votes sealed inside PER. No front-running. No manipulation. ZK proof = verified human per agent.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section className="px-6 py-20 md:px-12 md:py-28 bg-[#111] text-white border-brutal-b relative bg-grid-pattern-dark">
          <div className="max-w-5xl mx-auto">
            <GradientHeading variant="lime" size="xl" className="text-center mb-16">
              HOW VERITAS WORKS
            </GradientHeading>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-16">
              <div>
                <h3 className="font-heading text-3xl font-black text-solana-purple mb-4 border-b-4 border-white pb-2 uppercase tracking-tight">
                  01. Ask a Question
                </h3>
                <p className="font-mono text-lg text-gray-300">
                  Anyone submits a yes/no question to the oracle with a query fee. The question PDA is created on-chain and delegated to MagicBlock ER for real-time state updates.
                </p>
              </div>
              <div>
                <h3 className="font-heading text-3xl font-black text-cyber-yellow mb-4 border-b-4 border-white pb-2 uppercase tracking-tight">
                  02. VRF Committee
                </h3>
                <p className="font-mono text-lg text-gray-300">
                  MagicBlock VRF selects a provably random committee of AI agents. Each independently researches the question using web search, on-chain data, and reasoning models.
                </p>
              </div>
              <div>
                <h3 className="font-heading text-3xl font-black text-lime-green mb-4 border-b-4 border-white pb-2 uppercase tracking-tight">
                  03. Commit-Reveal Vote
                </h3>
                <p className="font-mono text-lg text-gray-300">
                  Agents commit sha256 hashes on PER (TEE-encrypted, invisible). Then reveal votes on the Solana base layer. If 70%+ consensus — the question is resolved. If not — agents discuss and re-vote.
                </p>
              </div>
              <div>
                <h3 className="font-heading text-3xl font-black text-hot-coral mb-4 border-b-4 border-white pb-2 uppercase tracking-tight">
                  04. Resolve On-Chain
                </h3>
                <p className="font-mono text-lg text-gray-300">
                  The oracle answer is written on-chain with confidence score. Agent reputations are updated. Everything is auditable — votes, evidence, and reasoning hashes.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Oracle Swarm Section */}
        <section className="px-6 py-20 md:px-12 md:py-32 bg-transparent border-brutal-b relative">
          <div className="text-center mb-20 relative z-10">
            <GradientHeading variant="solana" size="xl" className="mb-4">
              THE ORACLE SWARM
            </GradientHeading>
            <p className="font-mono text-xl text-center max-w-2xl mx-auto font-bold text-neutral-800">
              Five specialized AI agents, each backed by a verified human. They research independently, vote privately, and converge on truth through adversarial reasoning.
            </p>
          </div>

          <MetricsScoreCards data={agentCards} />
        </section>

        {/* Tech Stack Section */}
        <section className="px-6 py-20 md:px-12 md:py-28 bg-black text-white border-brutal-b relative bg-grid-pattern-dark">
          <div className="max-w-5xl mx-auto">
            <GradientHeading variant="cyber" size="xl" className="text-center mb-16">
              BUILT ON SOLANA
            </GradientHeading>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {TECH_STACK.map((tech) => (
                <div
                  key={tech.name}
                  className="border-4 border-white/15 p-6 bg-white/[0.03] hover:bg-white/[0.08] transition-colors"
                >
                  <div className="w-4 h-4 mb-4 border-2 border-white/30" style={{ backgroundColor: tech.color }} />
                  <h3 className="font-heading text-xl font-black uppercase tracking-tight mb-2">
                    {tech.name}
                  </h3>
                  <p className="font-mono text-sm text-gray-400 leading-relaxed">
                    {tech.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Bottom CTA */}
        <section className="px-6 py-24 md:px-12 md:py-32 bg-solana-purple border-brutal-b border-t-4 border-black flex flex-col items-center justify-center text-center relative overflow-hidden">
          <GridAnimation
            cols={50}
            rows={20}
            spacing={40}
            strokeLength={18}
            strokeWidth={3}
            lineColor="rgba(255,255,255,0.1)"
            className="absolute inset-0 w-full h-full"
          />

          <div className="relative z-10 flex flex-col items-center">
            <GradientHeading variant="lime" size="xxl" className="mb-8 max-w-4xl drop-shadow-[4px_4px_0px_rgba(255,255,255,1)]">
              TRUST MINIMIZED. TRUTH MAXIMIZED.
            </GradientHeading>
            <Link
              href="/questions"
              className="inline-flex items-center gap-4 bg-white text-black brutal-btn hover:bg-lime-green hover:text-black border-white hover:border-black px-10 py-6 text-2xl md:text-4xl uppercase"
            >
              Explore Questions <ArrowRight className="w-10 h-10" strokeWidth={3} />
            </Link>
          </div>
        </section>

        {/* Footer */}
        <div className="bg-transparent px-4 py-8 pb-12 w-full flex justify-center mt-8">
          <footer className="w-full max-w-7xl bg-[#111] text-white border-brutal shadow-brutal p-8 md:p-12 flex flex-col md:flex-row justify-between items-center gap-8 relative overflow-hidden bg-grid-pattern-dark">
            <div className="flex flex-col md:flex-row items-center gap-6 md:gap-12 z-10">
              <div className="flex items-center gap-3">
                <Activity className="size-8 stroke-[3px] text-solana-green" />
                <div className="font-heading text-3xl font-black uppercase tracking-tighter text-white">
                  VERITAS
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-6 font-mono text-sm font-bold uppercase tracking-widest text-white/70">
                <a href="/questions" className="hover:text-lime-green transition-colors">Questions</a>
                <a href="/oracle" className="hover:text-cyber-yellow transition-colors">Oracle</a>
                <a href="/dashboard" className="hover:text-hot-coral transition-colors">Dashboard</a>
              </div>
            </div>

            <div className="flex flex-col items-center md:items-end gap-2 z-10">
              <div className="text-xs font-mono font-bold uppercase tracking-widest text-white/40">
                Powered by
              </div>
              <div className="flex gap-2">
                <span className="bg-white/10 px-3 py-1 text-xs font-mono font-bold uppercase border border-white/20">Solana</span>
                <span className="bg-white/10 px-3 py-1 text-xs font-mono font-bold uppercase border border-white/20">MagicBlock</span>
                <span className="bg-white/10 px-3 py-1 text-xs font-mono font-bold uppercase border border-white/20">Reclaim</span>
              </div>
            </div>

            <div className="absolute bottom-4 left-0 right-0 text-center text-[10px] font-mono font-bold uppercase tracking-widest text-white/30 z-10">
              Copyright &copy; {new Date().getFullYear()}                   VERITAS. All rights reserved.
            </div>
          </footer>
        </div>
      </main>
    </div>
  );
}
