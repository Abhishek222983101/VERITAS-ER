"use client";

import React, { useEffect, useRef, useState, useMemo } from "react";
import {
  Activity,
  Cpu,
  Lock,
  Eye,
  CheckCircle2,
  XCircle,
  Loader2,
  Search,
  Vote,
  ShieldCheck,
  Zap,
  Brain,
  Fingerprint,
  TrendingUp,
  Clock,
} from "lucide-react";

interface LogEntry {
  text: string;
  ts: number;
}

interface AgentActivity {
  name: string;
  status: "idle" | "researching" | "voting" | "committed" | "revealing" | "revealed" | "error";
  vote: string | null;
  confidence: number | null;
  lastAction: string;
  timestamp: number;
  color: string;
}

interface PhaseStatus {
  phase: string;
  active: boolean;
  complete: boolean;
}

const AGENT_COLORS: Record<string, string> = {
  "Oracle Alpha": "#A7F3D0",
  "Skeptic Beta": "#FF6B6B",
  "Signal Gamma": "#FFD700",
  "Risk Delta": "#FEF7CD",
  "Synthesis Epsilon": "#9945FF",
};

const PHASE_META = [
  { phase: "Research", icon: Search, color: "text-solana-purple", bg: "bg-solana-purple" },
  { phase: "LLM Vote", icon: Brain, color: "text-cyber-yellow", bg: "bg-cyber-yellow" },
  { phase: "Commit", icon: Lock, color: "text-solana-purple", bg: "bg-solana-purple" },
  { phase: "Reveal", icon: Eye, color: "text-lime-green", bg: "bg-lime-green" },
  { phase: "Resolve", icon: CheckCircle2, color: "text-lime-green", bg: "bg-lime-green" },
];

function parseAgentName(text: string): string | null {
  const names = ["Oracle Alpha", "Skeptic Beta", "Signal Gamma", "Risk Delta", "Synthesis Epsilon"];
  for (const n of names) {
    if (text.includes(n)) return n;
  }
  if (text.includes("[Oracle Alpha]")) return "Oracle Alpha";
  return null;
}

function parseAgentActivity(logs: LogEntry[]): AgentActivity[] {
  const agents: Map<string, AgentActivity> = new Map();
  const defaultAgents = ["Oracle Alpha", "Skeptic Beta", "Signal Gamma"];

  for (const name of defaultAgents) {
    agents.set(name, {
      name,
      status: "idle",
      vote: null,
      confidence: null,
      lastAction: "Waiting for orchestrator...",
      timestamp: 0,
      color: AGENT_COLORS[name] || "#A7F3D0",
    });
  }

  for (const log of logs) {
    const t = log.text;
    const name = parseAgentName(t);
    if (!name) continue;

    const agent = agents.get(name) || {
      name,
      status: "idle" as const,
      vote: null,
      confidence: null,
      lastAction: "",
      timestamp: 0,
      color: AGENT_COLORS[name] || "#A7F3D0",
    };

    if (t.includes("researching")) {
      agent.status = "researching";
      agent.lastAction = "Analyzing data sources...";
      agent.timestamp = log.ts;
    } else if (t.includes("Vote:")) {
      const voteMatch = t.match(/Vote:\s*(YES|NO|UNSURE)\s*\((\d+)%\)/i);
      if (voteMatch) {
        agent.vote = voteMatch[1].toUpperCase();
        agent.confidence = parseInt(voteMatch[2]);
        agent.status = "voting";
        agent.lastAction = `Voted ${agent.vote} (${agent.confidence}% confidence)`;
        agent.timestamp = log.ts;
      }
    } else if (t.includes("committed!")) {
      agent.status = "committed";
      agent.lastAction = "Hash committed to chain";
      agent.timestamp = log.ts;
    } else if (t.includes("revealed!")) {
      agent.status = "revealed";
      agent.lastAction = agent.vote ? `Revealed: ${agent.vote}` : "Vote revealed on-chain";
      agent.timestamp = log.ts;
    } else if (t.includes("commit failed") || t.includes("reveal failed")) {
      agent.status = "error";
      agent.lastAction = "Transaction failed — will retry";
      agent.timestamp = log.ts;
    } else if (t.includes("ALREADY_COMMITTED")) {
      agent.status = "committed";
      agent.lastAction = "Already committed (persisted)";
      agent.timestamp = log.ts;
    }

    agents.set(name, agent);
  }

  return Array.from(agents.values());
}

function parsePhases(logs: LogEntry[]): PhaseStatus[] {
  const phases = [
    { phase: "Research", key: "researching", active: false, complete: false },
    { phase: "LLM Vote", key: "Vote:", active: false, complete: false },
    { phase: "Commit", key: "committed!", active: false, complete: false },
    { phase: "Reveal", key: "revealed!", active: false, complete: false },
    { phase: "Resolve", key: "Resolved!", active: false, complete: false },
  ];

  let foundActive = false;
  for (let i = phases.length - 1; i >= 0; i--) {
    const hasAny = logs.some((l) => l.text.includes(phases[i].key));
    const hasAll = (() => {
      const commitLogs = logs.filter((l) => l.text.includes("committed!"));
      const revealLogs = logs.filter((l) => l.text.includes("revealed!"));
      if (phases[i].key === "committed!") return commitLogs.length >= 3;
      if (phases[i].key === "revealed!") return revealLogs.length >= 3;
      if (phases[i].key === "Resolved!") return hasAny;
      return hasAny;
    })();

    if (hasAll) {
      phases[i].complete = true;
    } else if (hasAny && !foundActive) {
      phases[i].active = true;
      foundActive = true;
    }
  }

  return phases;
}

function StatusPill({ status, color }: { status: string; color: string }) {
  const config: Record<string, { text: string; animate: string; icon: React.ReactNode }> = {
    idle: { text: "WAITING", animate: "", icon: <div className="w-1.5 h-1.5 rounded-full bg-white/20" /> },
    researching: { text: "RESEARCHING", animate: "animate-pulse", icon: <Search className="w-3 h-3 text-solana-purple" /> },
    voting: { text: "VOTING", animate: "", icon: <Brain className="w-3 h-3 text-cyber-yellow" /> },
    committed: { text: "COMMITTED", animate: "", icon: <Lock className="w-3 h-3 text-solana-purple" /> },
    revealing: { text: "REVEALING", animate: "animate-pulse", icon: <Eye className="w-3 h-3 text-cyber-yellow" /> },
    revealed: { text: "REVEALED", animate: "", icon: <CheckCircle2 className="w-3 h-3 text-lime-green" /> },
    error: { text: "ERROR", animate: "", icon: <XCircle className="w-3 h-3 text-hot-coral" /> },
  };
  const c = config[status] || config.idle;
  return (
    <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 border ${c.animate} ${status === "idle" ? "border-white/10 bg-white/[0.03]" : "border-white/20 bg-white/[0.05]"}`}>
      {c.icon}
      <span className={`font-mono text-[8px] font-bold uppercase ${status === "idle" ? "text-white/30" : "text-white/60"}`}>
        {c.text}
      </span>
    </div>
  );
}

function VoteBadge({ vote }: { vote: string | null }) {
  if (!vote) return null;
  const colors: Record<string, string> = {
    YES: "bg-lime-green/20 text-lime-green border-lime-green/40",
    NO: "bg-hot-coral/20 text-hot-coral border-hot-coral/40",
    UNSURE: "bg-cyber-yellow/20 text-cyber-yellow border-cyber-yellow/40",
  };
  return (
    <span className={`px-1.5 py-0.5 font-heading font-black text-[9px] uppercase border ${colors[vote] || "bg-white/10 text-white border-white/20"}`}>
      {vote}
    </span>
  );
}

function ConfidenceRing({ value }: { value: number }) {
  const circumference = 2 * Math.PI * 14;
  const strokeDashoffset = circumference - (value / 100) * circumference;
  return (
    <div className="relative w-8 h-8 flex items-center justify-center">
      <svg className="w-8 h-8 -rotate-90" viewBox="0 0 32 32">
        <circle cx="16" cy="16" r="14" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="3" />
        <circle
          cx="16"
          cy="16"
          r="14"
          fill="none"
          stroke="#A7F3D0"
          strokeWidth="3"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-700"
        />
      </svg>
      <span className="absolute font-mono text-[8px] font-bold text-white/80">{value}</span>
    </div>
  );
}

export function LiveTerminal({ questionId }: { questionId?: number }) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [connected, setConnected] = useState(false);
  const [showRaw, setShowRaw] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const maxLogs = 120;

  useEffect(() => {
    let es: EventSource | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout>;

    function connect() {
      try {
        es = new EventSource("http://localhost:3002/");
        es.onopen = () => setConnected(true);
        es.onmessage = (e) => {
          try {
            const data = JSON.parse(e.data);
            setLogs((prev) => [...prev, { text: data.text, ts: data.ts || Date.now() }].slice(-maxLogs));
          } catch {
            setLogs((prev) => [...prev, { text: e.data, ts: Date.now() }].slice(-maxLogs));
          }
        };
        es.onerror = () => {
          setConnected(false);
          es?.close();
          reconnectTimer = setTimeout(connect, 5000);
        };
      } catch {
        reconnectTimer = setTimeout(connect, 5000);
      }
    }

    connect();
    return () => { es?.close(); clearTimeout(reconnectTimer); };
  }, []);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [logs]);

  const filtered = useMemo(() =>
    questionId != null
      ? logs.filter((l) => [`Q${questionId}`, `Question #${questionId}`].some((p) => l.text.includes(p)))
      : logs.slice(-60),
    [logs, questionId]
  );

  const agentActivities = useMemo(() => parseAgentActivity(filtered), [filtered]);
  const phases = useMemo(() => parsePhases(filtered), [filtered]);

  const activePhaseIdx = phases.findIndex((p) => p.active);
  const completePhaseIdx = phases.filter((p) => p.complete).length;

  return (
    <div className="bg-black text-white border-4 border-black font-mono rounded-none">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-neutral-900 border-b-2 border-lime-green/40">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 bg-lime-green flex items-center justify-center border-2 border-black">
            <Zap className="w-3.5 h-3.5 text-black" strokeWidth={3} />
          </div>
          <div>
            <span className="font-heading font-black text-sm uppercase text-lime-green tracking-wider">
              Oracle Activity
            </span>
            {questionId != null && (
              <span className="ml-2 px-2 py-0.5 bg-solana-purple/20 border border-solana-purple/40 text-solana-purple font-mono text-[10px] font-bold">
                Q{questionId}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowRaw(!showRaw)}
            className={`px-2 py-0.5 font-mono text-[9px] font-bold uppercase border transition-colors ${
              showRaw ? "bg-lime-green text-black border-lime-green" : "bg-transparent text-white/40 border-white/20 hover:text-white/60"
            }`}
          >
            {showRaw ? "Visual" : "Raw Logs"}
          </button>
          <div className="flex items-center gap-1.5">
            <div className={`w-2 h-2 rounded-full ${connected ? "bg-lime-green animate-pulse" : "bg-hot-coral"}`} />
            <span className="font-mono text-[9px] text-white/40">{connected ? "LIVE" : "OFFLINE"}</span>
          </div>
        </div>
      </div>

      {showRaw ? (
        <div
          ref={scrollRef}
          className="h-64 overflow-y-auto p-3 space-y-0.5"
          style={{ scrollbarWidth: "thin", scrollbarColor: "#333 #000" }}
        >
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-white/20" />
              <p className="font-mono text-[10px] text-white/25">
                {connected ? "Waiting for activity..." : "Connecting..."}
              </p>
            </div>
          ) : (
            filtered.map((log, i) => (
              <p key={i} className="font-mono text-[10px] leading-relaxed text-lime-green/60">
                <span className="text-white/15 mr-2">
                  {new Date(log.ts).toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                </span>
                {log.text}
              </p>
            ))
          )}
        </div>
      ) : (
        <div className="p-5 space-y-6">
          {/* Phase Timeline */}
          <div>
            <p className="font-heading font-black text-[10px] uppercase text-white/40 mb-3 tracking-wider flex items-center gap-2">
              <Clock className="w-3 h-3" />
              Resolution Pipeline
            </p>
            <div className="flex items-center gap-1">
              {phases.map((p, i) => {
                const meta = PHASE_META[i];
                const Icon = meta.icon;
                return (
                  <div key={p.phase} className="flex-1 flex flex-col items-center">
                    <div className={`w-8 h-8 border-2 flex items-center justify-center mb-1.5 transition-all duration-500 ${
                      p.complete ? "bg-lime-green border-lime-green" :
                      p.active ? "bg-solana-purple border-solana-purple animate-pulse" :
                      "bg-white/5 border-white/10"
                    }`}>
                      <Icon className={`w-4 h-4 ${
                        p.complete ? "text-black" :
                        p.active ? "text-white" :
                        "text-white/20"
                      }`} strokeWidth={2.5} />
                    </div>
                    <div className={`h-1 w-full border-2 border-black ${
                      p.complete ? "bg-lime-green" :
                      p.active ? "bg-solana-purple" :
                      "bg-white/5"
                    }`} />
                    <p className={`font-mono text-[7px] mt-1 text-center uppercase font-bold ${
                      p.complete ? "text-lime-green" :
                      p.active ? "text-solana-purple" :
                      "text-white/15"
                    }`}>
                      {p.phase}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Agent Activity Cards */}
          <div>
            <p className="font-heading font-black text-[10px] uppercase text-white/40 mb-3 tracking-wider flex items-center gap-2">
              <Cpu className="w-3 h-3" />
              Agent Activity
            </p>
            <div className="space-y-3">
              {agentActivities.map((agent) => (
                <div
                  key={agent.name}
                  className="flex items-center gap-3 p-3 bg-white/[0.03] border border-white/10 hover:border-white/25 transition-all hover:bg-white/[0.05]"
                >
                  {/* Avatar */}
                  <div className="relative">
                    <div
                      className="w-8 h-8 border-2 border-black shrink-0 flex items-center justify-center"
                      style={{ backgroundColor: agent.color }}
                    >
                      <span className="font-heading font-black text-[10px] text-black">
                        {agent.name.split(" ")[1]?.[0] || "?"}
                      </span>
                    </div>
                    {agent.status !== "idle" && agent.status !== "error" && (
                      <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-lime-green border border-black animate-pulse" />
                    )}
                    {agent.status === "error" && (
                      <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-hot-coral border border-black" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-heading font-black text-xs uppercase text-white/90">
                        {agent.name}
                      </span>
                      <StatusPill status={agent.status} color={agent.color} />
                      <VoteBadge vote={agent.vote} />
                    </div>
                    <p className="font-mono text-[9px] text-white/35 truncate">
                      {agent.lastAction}
                    </p>
                  </div>

                  {/* Confidence */}
                  {agent.confidence !== null && (
                    <div className="shrink-0 flex items-center gap-2">
                      <ConfidenceRing value={agent.confidence} />
                      <div className="text-right">
                        <p className="font-mono text-[7px] text-white/25 uppercase">Confidence</p>
                      </div>
                    </div>
                  )}

                  {agent.status !== "idle" && agent.timestamp > 0 && (
                    <span className="font-mono text-[8px] text-white/15 shrink-0">
                      {new Date(agent.timestamp).toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* What Makes This Different */}
          <div className="border-t border-white/10 pt-4">
            <p className="font-heading font-black text-[10px] uppercase text-white/40 mb-3 tracking-wider flex items-center gap-2">
              <ShieldCheck className="w-3 h-3" />
              What Makes This Different
            </p>
            <div className="grid grid-cols-3 gap-3">
              {[
                { icon: ShieldCheck, title: "VRF Selected", desc: "Unbiasable committee", color: "#9945FF" },
                { icon: Lock, title: "Commit-Reveal", desc: "Anti-collusion voting", color: "#A7F3D0" },
                { icon: Cpu, title: "TEE Encrypted", desc: "Hidden until reveal", color: "#FFD700" },
              ].map((item) => (
                <div key={item.title} className="p-3 text-center border hover:opacity-80 transition-colors" style={{ backgroundColor: `${item.color}15`, borderColor: `${item.color}30` }}>
                  <item.icon className="w-5 h-5 mx-auto mb-2" style={{ color: item.color }} />
                  <p className="font-heading font-black text-[9px] uppercase" style={{ color: item.color }}>{item.title}</p>
                  <p className="font-mono text-[7px] text-white/25 mt-0.5">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Events */}
          <div>
            <p className="font-heading font-black text-[10px] uppercase text-white/40 mb-2 tracking-wider flex items-center gap-2">
              <Activity className="w-3 h-3" />
              Recent Events
            </p>
            <div className="space-y-1 max-h-24 overflow-y-auto" style={{ scrollbarWidth: "thin", scrollbarColor: "#333 transparent" }}>
              {filtered.length === 0 ? (
                <div className="flex items-center gap-2 py-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-white/10 animate-pulse" />
                  <span className="font-mono text-[9px] text-white/20">Waiting for events...</span>
                </div>
              ) : (
                filtered.slice(-8).map((log, i) => {
                  let icon = <Activity className="w-3 h-3 text-white/20" />;
                  let textColor = "text-white/30";
                  if (log.text.includes("committed!")) { icon = <Lock className="w-3 h-3 text-solana-purple" />; textColor = "text-solana-purple/80"; }
                  else if (log.text.includes("revealed!")) { icon = <Eye className="w-3 h-3 text-lime-green" />; textColor = "text-lime-green/80"; }
                  else if (log.text.includes("Resolved!")) { icon = <CheckCircle2 className="w-3 h-3 text-lime-green" />; textColor = "text-lime-green"; }
                  else if (log.text.includes("Vote:")) { icon = <Vote className="w-3 h-3 text-cyber-yellow" />; textColor = "text-cyber-yellow/80"; }
                  else if (log.text.includes("researching")) { icon = <Search className="w-3 h-3 text-solana-purple" />; textColor = "text-solana-purple/60"; }
                  else if (log.text.includes("failed")) { icon = <XCircle className="w-3 h-3 text-hot-coral" />; textColor = "text-hot-coral/80"; }

                  return (
                    <div key={i} className="flex items-center gap-2 py-1">
                      {icon}
                      <span className={`font-mono text-[9px] ${textColor} truncate`}>{log.text}</span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
