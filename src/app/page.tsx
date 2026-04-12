import { ArrowRight, Activity, Database, Server, Brain, Target, Shield, MapPin } from "lucide-react";
import Link from "next/link";
import HeroText from "@/components/ui/hero-shutter-text";
import { MetricsScoreCards } from "@/components/ui/metrics-score-cards";
import { GradientHeading } from "@/components/ui/gradient-heading";
import { FloatingHeader } from "@/components/ui/floating-header";
import { GridAnimation } from "@/components/ui/mouse-following-line";

export default function Home() {
  const metricsData = [
    {
      title: "Rule Engine",
      description: "Deterministic evaluation of hard criteria like age, gender, staging, and ECOG performance status against exact trial parameters.",
      initialScore: 100,
      icon: <Server className="w-8 h-8 stroke-black" strokeWidth={3} />,
      color: "#A7F3D0" // lime-green
    },
    {
      title: "ML Matcher",
      description: "Fine-tuned language models process unstructured patient histories and complex biomarker profiles against inclusion/exclusion criteria.",
      initialScore: 94,
      icon: <Brain className="w-8 h-8 stroke-black" strokeWidth={3} />,
      color: "#FFD700" // cyber-yellow
    },
    {
      title: "Geo-Filter",
      description: "Real-time mapping integration verifies patient-to-site travel viability, instantly flagging geographic disqualifications.",
      initialScore: 88,
      icon: <MapPin className="w-8 h-8 stroke-black" strokeWidth={3} />,
      color: "#FF6B6B" // hot-coral
    }
  ];

  return (
    <div className="min-h-screen bg-cream font-mono relative bg-noise overflow-x-hidden">
      {/* Absolute full-screen dot pattern wrapper behind everything (including navbar) */}
      <div className="fixed inset-0 bg-dot-pattern opacity-[0.06] pointer-events-none z-0" />
      
      {/* Brutalist Navbar Component - Floating with margin */}
      <div className="relative z-50 pt-4">
        <FloatingHeader />
      </div>

      <main className="flex flex-col relative z-10">
        {/* Hero Section */}
        <section className="relative px-6 py-12 md:px-12 md:py-20 border-brutal-b bg-transparent overflow-hidden mt-6">
          <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 relative z-10">
            {/* Decorative Background Elements */}
            <div className="absolute top-[-50px] right-[-100px] w-96 h-96 bg-cyber-yellow rounded-full blur-3xl opacity-50 pointer-events-none" />

            <div className="flex flex-col justify-center z-10 w-full overflow-hidden">
              <div className="mb-0 w-fit relative mt-8 md:mt-0">
                <HeroText text="COGNISTREAM" className="items-start" />
              </div>
              
              <GradientHeading 
                variant="default" 
                size="md" 
                weight="black"
                className="mb-8 font-heading mt-2"
              >
                AI-POWERED TRIAL MATCHING
              </GradientHeading>

              <p className="font-mono text-xl md:text-2xl max-w-xl mb-10 leading-snug font-semibold text-neutral-800 bg-white/50 backdrop-blur-sm p-4 border-l-4 border-black">
                Accelerating clinical research by autonomously matching patients to life-saving trials using multi-agent intelligence. Fast, privacy-first, and highly accurate.
              </p>

              <div className="flex flex-wrap gap-4">
                <Link
                  href="/dashboard"
                  className="inline-flex w-max items-center justify-center gap-3 bg-lime-green brutal-btn px-8 py-5 text-xl md:text-2xl uppercase whitespace-nowrap"
                >
                  Dashboard <ArrowRight className="w-6 h-6 md:w-7 md:h-7" strokeWidth={3} />
                </Link>
                <Link
                  href="/pipeline"
                  className="inline-flex w-max items-center justify-center gap-3 bg-black text-white brutal-btn px-8 py-5 text-xl md:text-2xl uppercase whitespace-nowrap hover:bg-white hover:text-black"
                >
                  Run Pipeline
                </Link>
              </div>
            </div>

            <div className="relative z-10 flex items-center justify-center lg:justify-end mt-16 lg:mt-0">
              {/* The "Hero Graphic" - A Brutalist overlap composition */}
              <div className="relative w-full min-w-[320px] max-w-[800px] h-auto scale-110 lg:scale-125 lg:translate-x-4 lg:translate-y-8">
                {/* Back Image Map (The diagram) */}
                <div className="w-full bg-cream border-brutal shadow-brutal flex items-center justify-center overflow-hidden rotate-2 hover:rotate-0 transition-transform duration-300">
                  {/* NOTE: You need to place your diagram image in the public/ folder as "hero-diagram.png" */}
                  <img 
                    src="/architecture.jpg" 
                    alt="Cognitive Monitoring Dashboard Diagram" 
                    className="w-full h-auto object-contain scale-[1.02]"
                  />
                </div>
                
                {/* Front Alert Card */}
                <div className="absolute -bottom-10 -left-6 md:-bottom-12 md:-left-16 w-[80%] max-w-[350px] bg-white border-brutal shadow-brutal p-4 md:p-6 animate-pulse -rotate-3 hover:rotate-0 transition-transform duration-300 z-20">
                  <div className="flex items-center gap-3 mb-2 md:mb-3 border-b-4 border-black pb-2">
                    <div className="relative w-3 h-3 md:w-4 md:h-4 shrink-0">
                      <span className="w-3 h-3 md:w-4 md:h-4 rounded-full bg-lime-green border-[1.5px] md:border-2 border-black animate-ping absolute inset-0" />
                      <span className="w-3 h-3 md:w-4 md:h-4 rounded-full bg-lime-green border-[1.5px] md:border-2 border-black absolute inset-0" />
                    </div>
                    <span className="font-heading font-black uppercase text-base md:text-xl tracking-tight leading-none">Match Found</span>
                  </div>
                  <p className="font-mono text-[10px] md:text-sm leading-snug font-bold">
                    Patient ANON_MH_001 matched to trial NCT05278920 with <span className="font-black bg-lime-green px-1 border-2 border-black text-black">94%</span> confidence via ML ensemble.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Modules Section */}
        <section id="modules" className="px-6 py-16 md:px-12 md:py-24 bg-white border-brutal-b relative">
          <div className="max-w-7xl mx-auto">
            <GradientHeading variant="default" size="xl" className="mb-12 text-center uppercase tracking-tighter">
              System Modules
            </GradientHeading>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { title: "Dashboard", desc: "Central hub for monitoring patient pipeline and active clinical trials.", link: "/dashboard", color: "bg-cyber-yellow", icon: <Database className="w-8 h-8 mb-4" strokeWidth={3} /> },
                { title: "Pipeline", desc: "End-to-end ingestion, anonymization, and matching engine for new records.", link: "/pipeline", color: "bg-lime-green", icon: <Activity className="w-8 h-8 mb-4" strokeWidth={3} /> },
                { title: "Results", desc: "Deep-dive view into criteria breakdowns, geo-mapping, and AI reasoning.", link: "/results", color: "bg-hot-coral", icon: <Target className="w-8 h-8 mb-4" strokeWidth={3} /> },
                { title: "Trial Chat", desc: "RAG-powered conversational assistant to query the trial database naturally.", link: "/chat", color: "bg-white", icon: <Brain className="w-8 h-8 mb-4" strokeWidth={3} /> }
              ].map((mod, i) => (
                <Link key={i} href={mod.link} className={`block border-brutal shadow-brutal p-6 transition-transform hover:-translate-y-2 hover:shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] ${mod.color}`}>
                  {mod.icon}
                  <h3 className="font-heading text-2xl font-black uppercase mb-3 border-b-2 border-black pb-2">{mod.title}</h3>
                  <p className="font-mono text-sm font-bold mb-6">{mod.desc}</p>
                  <span className="inline-flex items-center gap-2 bg-black text-white px-3 py-1 font-mono text-xs font-bold uppercase">
                    Launch Module <ArrowRight className="w-3 h-3" />
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section id="features" className="px-6 py-20 md:px-12 md:py-28 bg-[#111] text-white border-brutal-b relative bg-grid-pattern-dark">
          <div className="max-w-4xl mx-auto">
            <GradientHeading 
              variant="lime" 
              size="xl" 
              className="text-center mb-16 uppercase tracking-tighter"
            >
              The Intelligent Engine
            </GradientHeading>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-16">
              <div>
                <h3 className="font-heading text-3xl font-black text-cyber-yellow mb-4 border-b-4 border-white pb-2 uppercase tracking-tight">01. Zero Friction</h3>
                <p className="font-mono text-lg text-gray-300">
                  Manual trial matching takes weeks. We automated the entire pipeline. CogniStream ingests raw patient PDFs/JSONs, redacts PII on the fly, and runs them against active trials in seconds.
                </p>
              </div>
              <div>
                <h3 className="font-heading text-3xl font-black text-lime-green mb-4 border-b-4 border-white pb-2 uppercase tracking-tight">02. Total Privacy</h3>
                <p className="font-mono text-lg text-gray-300">
                  Strict adherence to HIPAA/GDPR. Local NER models strip all Personal Identifiable Information before records ever touch the ML inference engine, ensuring total data security.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* The Metrics / Features Section */}
        <section id="technology" className="px-6 py-20 md:px-12 md:py-32 bg-transparent border-brutal-b relative">
          <div className="text-center mb-20 relative z-10">
            <GradientHeading 
              variant="default" 
              size="xl" 
              className="mb-4 uppercase tracking-tighter"
            >
              Multi-Agent Evaluation
            </GradientHeading>
            <p className="font-mono text-xl text-center max-w-2xl mx-auto font-bold text-neutral-800">
              Three distinct evaluation engines working in tandem to calculate composite compatibility scores with full explainability.
            </p>
          </div>

          <MetricsScoreCards data={metricsData} />
        </section>

        {/* Bottom CTA */}
        <section id="about" className="px-6 py-24 md:px-12 md:py-32 bg-cyber-yellow border-brutal-b border-t-4 border-black flex flex-col items-center justify-center text-center relative overflow-hidden mt-0">
          <GridAnimation 
            cols={50} 
            rows={20} 
            spacing={40} 
            strokeLength={18} 
            strokeWidth={3} 
            lineColor="rgba(0,0,0,0.15)"
            className="absolute inset-0 w-full h-full"
          />
          
          <div className="relative z-10 flex flex-col items-center">
            <GradientHeading 
               variant="default"
               size="xxl"
               className="mb-8 max-w-4xl drop-shadow-[4px_4px_0px_rgba(255,255,255,1)] text-black"
            >
              START MATCHING PATIENTS.
            </GradientHeading>
            <div className="flex gap-4 flex-col sm:flex-row">
              <Link
                href="/pipeline"
                className="inline-flex items-center justify-center gap-4 bg-black text-white brutal-btn hover:bg-white hover:text-black border-white hover:border-black px-10 py-6 text-xl md:text-2xl uppercase"
              >
                Run the Pipeline <ArrowRight className="w-8 h-8" strokeWidth={3} />
              </Link>
            </div>
          </div>
        </section>

        {/* Floating Brutalist Footer */}
        <div className="bg-transparent px-4 py-8 pb-12 w-full flex justify-center mt-8">
          <footer className="w-full max-w-7xl bg-[#111] text-white border-brutal shadow-brutal p-8 md:p-12 flex flex-col md:flex-row justify-between items-center gap-8 relative overflow-hidden bg-grid-pattern-dark">
            <div className="flex flex-col md:flex-row items-center gap-6 md:gap-12 z-10">
              <div className="flex items-center gap-3">
                <Activity className="size-8 stroke-[3px] text-lime-green" />
                <div className="font-heading text-3xl font-black uppercase tracking-tighter text-white">CogniStream</div>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-6 font-mono text-sm font-bold uppercase tracking-widest text-white/70">
                <Link href="/dashboard" className="hover:text-cyber-yellow transition-colors">Dashboard</Link>
                <Link href="/pipeline" className="hover:text-lime-green transition-colors">Pipeline</Link>
                <Link href="/results" className="hover:text-hot-coral transition-colors">Results</Link>
                <Link href="/chat" className="hover:text-white transition-colors">AI Chat</Link>
              </div>
            </div>
            
            <div className="flex flex-col items-center md:items-end gap-2 z-10">
              <div className="text-xs font-mono font-bold uppercase tracking-widest text-white/40">Connect</div>
              <div className="flex gap-2">
                <a href="https://github.com/SnehaThakur19/COHERENCE-26_PARADIGM" target="_blank" rel="noopener noreferrer" className="bg-white/10 px-3 py-1 text-xs font-mono font-bold uppercase border border-white/20 hover:bg-white hover:text-black hover:border-black transition-colors">GitHub</a>
              </div>
            </div>

            {/* Copyright text at the absolute bottom center of the floating box */}
            <div className="absolute bottom-4 left-0 right-0 text-center text-[10px] font-mono font-bold uppercase tracking-widest text-white/30 z-10">
              Copyright © {new Date().getFullYear()} Team Paradigm. All rights reserved.
            </div>
          </footer>
        </div>
      </main>
    </div>
  );
}
