import { useMemo, useEffect, useState, useCallback } from "react";
import { useDivePrograms } from "@/lib/anchor";
import { PublicKey } from "@solana/web3.js";
import { Market, Agent, AgentInsight, ResolutionSession } from "@/lib/data";

export function useDive() {
  const { diveMarket, diveOracle, diveIdentity, provider } = useDivePrograms();
  const [markets, setMarkets] = useState<Market[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      // Fetch Markets
      const marketAccounts = await (diveMarket.account as any).market.all();
      const parsedMarkets = marketAccounts.map((account: any) => {
        const m = account.account as any;
        return {
          id: account.publicKey.toBase58(),
          question: m.question,
          outcomes: ["YES", "NO"], // simplified
          deadline: new Date(m.deadlineTs.toNumber() * 1000).toISOString(),
          yesPool: m.yesPool.toNumber() / 1e9,
          noPool: m.noPool.toNumber() / 1e9,
          yesPrice: m.yesPool.toNumber() === 0 && m.noPool.toNumber() === 0 ? 0.5 : m.yesPool.toNumber() / (m.yesPool.toNumber() + m.noPool.toNumber()),
          noPrice: m.yesPool.toNumber() === 0 && m.noPool.toNumber() === 0 ? 0.5 : m.noPool.toNumber() / (m.yesPool.toNumber() + m.noPool.toNumber()),
          status: Object.keys(m.status)[0].toLowerCase() as any,
          resolution: m.resolvedOutcome !== null ? (m.resolvedOutcome === 0 ? "YES" : "NO") : undefined,
          totalVolume: (m.yesPool.toNumber() + m.noPool.toNumber()) / 1e9,
          category: "General",
          agentInsights: [] // We can fetch from AgentInsight PDA if needed
        } as Market;
      });
      setMarkets(parsedMarkets);

      // Fetch Agents
      const agentAccounts = await (diveOracle.account as any).agent.all();
      const parsedAgents = agentAccounts.map((account: any) => {
        const a = account.account as any;
        return {
          id: account.publicKey.toBase58(),
          name: a.name,
          personality: "AI Agent",
          role: "Oracle",
          color: "#A7F3D0",
          reputation: a.reputation.toNumber(),
          totalVotes: a.totalVotes.toNumber(),
          correctVotes: a.correctVotes.toNumber(),
          status: a.isActive ? "active" : "idle"
        } as Agent;
      });
      setAgents(parsedAgents);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [diveMarket, diveOracle]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  return { markets, agents, loading, refresh: fetchAll };
}
