export interface Agent {
  id: string;
  name: string;
  personality: string;
  role: string;
  color: string;
  reputation: number;
  totalVotes: number;
  correctVotes: number;
  status: "active" | "idle" | "researching" | "voting";
}

export interface Market {
  id: string;
  question: string;
  outcomes: ["YES", "NO"];
  deadline: string;
  yesPool: number;
  noPool: number;
  yesPrice: number;
  noPrice: number;
  status: "active" | "resolved" | "disputed" | "commit" | "reveal" | "discussion";
  resolution?: "YES" | "NO";
  totalVolume: number;
  category: string;
  agentInsights: AgentInsight[];
}

export interface AgentInsight {
  agentName: string;
  prediction: "YES" | "NO";
  confidence: number;
  reasoning: string;
}

export interface ResolutionSession {
  id: string;
  marketId: string;
  committee: string[];
  currentRound: number;
  phase: "committee" | "research" | "commit" | "reveal" | "discussion" | "final" | "complete";
  yesVotes: number;
  noVotes: number;
  unsureVotes: number;
  deadline: string;
}

export const AGENTS: Agent[] = [
  {
    id: "oracle-alpha",
    name: "Oracle Alpha",
    personality: "Analytical, cites numbers, methodical",
    role: "Lead Researcher",
    color: "#A7F3D0",
    reputation: 92,
    totalVotes: 47,
    correctVotes: 41,
    status: "active",
  },
  {
    id: "skeptic-beta",
    name: "Skeptic Beta",
    personality: "Contrarian, plays devil's advocate, finds flaws",
    role: "Devil's Advocate",
    color: "#FF6B6B",
    reputation: 87,
    totalVotes: 52,
    correctVotes: 44,
    status: "idle",
  },
  {
    id: "signal-gamma",
    name: "Signal Gamma",
    personality: "Pattern recognition, Bayesian thinker",
    role: "Odds Estimator",
    color: "#FFD700",
    reputation: 95,
    totalVotes: 38,
    correctVotes: 35,
    status: "researching",
  },
  {
    id: "risk-delta",
    name: "Risk Delta",
    personality: "Conservative, risk-averse, paranoid about edge cases",
    role: "Risk Assessor",
    color: "#FEF7CD",
    reputation: 78,
    totalVotes: 29,
    correctVotes: 22,
    status: "active",
  },
  {
    id: "synthesis-epsilon",
    name: "Synthesis Epsilon",
    personality: "Mediator, synthesizer, seeks common ground",
    role: "Consensus Builder",
    color: "#A7F3D0",
    reputation: 90,
    totalVotes: 41,
    correctVotes: 37,
    status: "voting",
  },
];

export const MARKETS: Market[] = [
  {
    id: "will-solana-hit-$400",
    question: "Will Solana hit $400 by the end of 2026?",
    outcomes: ["YES", "NO"],
    deadline: "2026-12-31T23:59:59Z",
    yesPool: 0,
    noPool: 0,
    yesPrice: 0.5,
    noPrice: 0.5,
    status: "active",
    totalVolume: 0,
    category: "Crypto",
    agentInsights: [],
  },
  {
    id: "btc-150k",
    question: "Will Bitcoin hit $150K by Q2 2026?",
    outcomes: ["YES", "NO"],
    deadline: "2026-06-30T23:59:59Z",
    yesPool: 45000,
    noPool: 32000,
    yesPrice: 0.58,
    noPrice: 0.42,
    status: "active",
    totalVolume: 77000,
    category: "Crypto",
    agentInsights: [
      { agentName: "Signal Gamma", prediction: "YES", confidence: 72, reasoning: "BTC halving cycle + institutional inflows suggest bullish trend through 2026." },
      { agentName: "Risk Delta", prediction: "NO", confidence: 65, reasoning: "Regulatory headwinds and macro uncertainty make $150K unlikely within Q2." },
    ],
  },
  {
    id: "india-t20",
    question: "Will India win the next T20 World Cup?",
    outcomes: ["YES", "NO"],
    deadline: "2026-12-31T23:59:59Z",
    yesPool: 28000,
    noPool: 35000,
    yesPrice: 0.44,
    noPrice: 0.56,
    status: "active",
    totalVolume: 63000,
    category: "Sports",
    agentInsights: [
      { agentName: "Oracle Alpha", prediction: "YES", confidence: 58, reasoning: "India's T20 squad depth is unmatched. Home advantage in subcontinent conditions." },
    ],
  },
  {
    id: "ai-regulation",
    question: "Will comprehensive AI regulation pass in the US by 2026?",
    outcomes: ["YES", "NO"],
    deadline: "2026-12-31T23:59:59Z",
    yesPool: 15000,
    noPool: 42000,
    yesPrice: 0.26,
    noPrice: 0.74,
    status: "disputed",
    totalVolume: 57000,
    category: "Policy",
    agentInsights: [
      { agentName: "Skeptic Beta", prediction: "NO", confidence: 81, reasoning: "Congressional gridlock makes comprehensive legislation unlikely. Expect executive orders only." },
      { agentName: "Synthesis Epsilon", prediction: "NO", confidence: 68, reasoning: "Bipartisan support exists but timing doesn't align with election cycle." },
    ],
  },
  {
    id: "sol-500",
    question: "Will Solana reach $500 by end of 2026?",
    outcomes: ["YES", "NO"],
    deadline: "2026-12-31T23:59:59Z",
    yesPool: 62000,
    noPool: 18000,
    yesPrice: 0.78,
    noPrice: 0.22,
    status: "commit",
    totalVolume: 80000,
    category: "Crypto",
    agentInsights: [
      { agentName: "Signal Gamma", prediction: "YES", confidence: 85, reasoning: "Firedancer + ETF narrative + DeFi TVL growth creates strong tailwind." },
    ],
  },
  {
    id: "eth-etf",
    question: "Will a spot ETH ETF be approved by Q3 2026?",
    outcomes: ["YES", "NO"],
    deadline: "2026-09-30T23:59:59Z",
    yesPool: 55000,
    noPool: 25000,
    yesPrice: 0.69,
    noPrice: 0.31,
    status: "resolved",
    resolution: "YES",
    totalVolume: 80000,
    category: "Crypto",
    agentInsights: [],
  },
  {
    id: "mars-mission",
    question: "Will SpaceX successfully land on Mars by 2028?",
    outcomes: ["YES", "NO"],
    deadline: "2028-12-31T23:59:59Z",
    yesPool: 8000,
    noPool: 52000,
    yesPrice: 0.13,
    noPrice: 0.87,
    status: "active",
    totalVolume: 60000,
    category: "Science",
    agentInsights: [
      { agentName: "Risk Delta", prediction: "NO", confidence: 92, reasoning: "Timeline too aggressive. Starship needs multiple orbital tests before Mars attempt." },
    ],
  },
];

export const RESOLUTION_SESSIONS: ResolutionSession[] = [
  {
    id: "session-1",
    marketId: "sol-500",
    committee: ["oracle-alpha", "signal-gamma", "risk-delta"],
    currentRound: 1,
    phase: "commit",
    yesVotes: 0,
    noVotes: 0,
    unsureVotes: 0,
    deadline: "2026-04-12T18:00:00Z",
  },
  {
    id: "session-2",
    marketId: "ai-regulation",
    committee: ["skeptic-beta", "synthesis-epsilon", "oracle-alpha"],
    currentRound: 2,
    phase: "discussion",
    yesVotes: 1,
    noVotes: 2,
    unsureVotes: 0,
    deadline: "2026-04-12T20:00:00Z",
  },
];

export const TECH_STACK = [
  { name: "Solana", description: "Base layer — Anchor programs, SPL Token-2022, PDAs", color: "#9945FF" },
  { name: "MagicBlock ER", description: "Zero-fee real-time market trading", color: "#14F195" },
  { name: "MagicBlock PER", description: "TEE-encrypted private vote commits", color: "#14F195" },
  { name: "MagicBlock VRF", description: "Provably fair committee selection", color: "#14F195" },
  { name: "Reclaim Protocol", description: "ZK proofs for human uniqueness (zkTLS)", color: "#FFD700" },
  { name: "SAS Attestations", description: "Solana-native verifiable credentials", color: "#A7F3D0" },
];
