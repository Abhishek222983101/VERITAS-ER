import { useMemo, useEffect, useState, useCallback } from "react";
import { useDivePrograms } from "@/lib/anchor";
import { PublicKey } from "@solana/web3.js";
import { Market, Agent, AgentInsight, ResolutionSession, MARKETS, AGENTS } from "@/lib/data";

export function useDive() {
  const { diveMarket, diveOracle, diveIdentity, provider } = useDivePrograms();
  const [markets, setMarkets] = useState<Market[]>(MARKETS);
  const [agents, setAgents] = useState<Agent[]>(AGENTS);
  const [loading, setLoading] = useState(false);

  const fetchAll = useCallback(async () => {
    // For the hackathon demo, we are strictly using the rich mock data 
    // to prevent UI hangs and RPC issues. The newly "created" market
    // is manually injected into lib/data.ts
    setMarkets(MARKETS);
    setAgents(AGENTS);
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  return { markets, agents, loading, refresh: fetchAll };
}
