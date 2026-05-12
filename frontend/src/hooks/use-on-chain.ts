"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { PublicKey } from "@solana/web3.js";
import { useConnection } from "@solana/wallet-adapter-react";
import { useAnchor } from "@/components/providers/anchor-provider";
import { AGENT_COLORS, getStatusLabel, getVoteLabel, QuestionStatus, KNOWN_AGENTS, PROGRAM_ID, DELEGATION_PROGRAM_ID } from "@/lib/constants";

// Simple cache to prevent RPC rate limiting (429 errors)
const accountCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 15000; // 15 seconds

async function getCachedAccount(connection: any, pda: PublicKey): Promise<any> {
  const key = pda.toBase58();
  const cached = accountCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  const acc = await connection.getAccountInfo(pda);
  accountCache.set(key, { data: acc, timestamp: Date.now() });
  return acc;
}

function parseStatus(s: any): number {
  if (s.pending !== undefined) return 0;
  if (s.committeeSelected !== undefined) return 1;
  if (s.commitPhase !== undefined) return 2;
  if (s.revealPhase !== undefined) return 3;
  if (s.discussionPhase !== undefined) return 4;
  if (s.resolved !== undefined) return 5;
  if (s.privateVoting !== undefined) return 6;
  return 0;
}

function parseVote(v: any): number {
  if (v.yes !== undefined) return 0;
  if (v.no !== undefined) return 1;
  return 2;
}

export interface OnChainQuestion {
  questionId: number;
  pda: PublicKey;
  authority: PublicKey;
  questionText: string;
  category: string;
  deadline: number;
  queryFee: number;
  status: number;
  statusLabel: string;
  committee: PublicKey[];
  yesVotes: number;
  noVotes: number;
  unsureVotes: number;
  result: number | null;
  resultLabel: string;
  confidence: number;
  createdAt: number;
  resolvedAt: number | null;
  consensusThreshold: number;
  isPrivate: boolean;
  teeValidator: PublicKey | null;
  isLegacy: boolean;
  isImproperlyDelegated: boolean;
}

export interface OnChainAgent {
  pda: PublicKey;
  wallet: PublicKey;
  name: string;
  reputation: number;
  isActive: boolean;
  bondAmount: number;
  totalVotes: number;
  correctVotes: number;
  accuracy: number;
  color: string;
  createdAt: number;
}

export interface OnChainConfig {
  admin: PublicKey;
  treasury: PublicKey;
  defaultQueryFee: number;
  committeeSize: number;
  consensusThreshold: number;
  agentBondAmount: number;
  correctReward: number;
  wrongPenalty: number;
  questionCounter: number;
}

export interface OnChainAgentRegistry {
  agents: PublicKey[];
  reputations: number[];
  count: number;
}

export function useConfig() {
  const { fetchConfig } = useAnchor();
  const [config, setConfig] = useState<OnChainConfig | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const raw = await fetchConfig();
      if (raw) {
        setConfig({
          admin: raw.admin as PublicKey,
          treasury: raw.treasury as PublicKey,
          defaultQueryFee: Number(raw.defaultQueryFee),
          committeeSize: Number(raw.committeeSize),
          consensusThreshold: Number(raw.consensusThreshold),
          agentBondAmount: Number(raw.agentBondAmount),
          correctReward: Number(raw.correctReward),
          wrongPenalty: Number(raw.wrongPenalty),
          questionCounter: Number(raw.questionCounter),
        });
      }
    } catch (e) {
      console.error("Failed to fetch config:", e);
    }
    setLoading(false);
  }, [fetchConfig]);

  useEffect(() => { load(); }, [load]);

  return { config, loading, refetch: load };
}

export function useAgentRegistry() {
  const { fetchAgentRegistry } = useAnchor();
  const [registry, setRegistry] = useState<OnChainAgentRegistry | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const raw = await fetchAgentRegistry();
      if (raw) {
        setRegistry({
          agents: (raw.agents as PublicKey[]).filter((a: PublicKey) => !a.equals(PublicKey.default)),
          reputations: Array.from(raw.reputations as bigint[]).map(Number).slice(0, raw.count),
          count: Number(raw.count),
        });
      }
    } catch (e) {
      console.error("Failed to fetch agent registry:", e);
    }
    setLoading(false);
  }, [fetchAgentRegistry]);

  useEffect(() => { load(); }, [load]);

  return { registry, loading, refetch: load };
}

export function useQuestions() {
  const { fetchAllQuestions, fetchConfig } = useAnchor();
  const { connection } = useConnection();
  const [questions, setQuestions] = useState<OnChainQuestion[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const config = await fetchConfig();
      if (!config) { setLoading(false); return; }
      const count = Number(config.questionCounter);
      const raw = await fetchAllQuestions(count);
      
      // Check account sizes to detect old accounts (567 bytes) vs new (600 bytes)
      // Use cache to prevent 429 rate limiting
      const sizes = await Promise.all(
        raw.map(async (q: any) => {
          try {
            const acc = await getCachedAccount(connection, q.pda as PublicKey);
            return acc?.data?.length || 0;
          } catch { return 0; }
        })
      );
      
      const mapped: OnChainQuestion[] = await Promise.all(
        raw.map(async (q: any, idx: number) => {
          const statusNum = parseStatus(q.status);
          const dataSize = sizes[idx];
          const isOldAccount = dataSize > 0 && dataSize < 590; // Old accounts are ~567 bytes
          
          // For old accounts, teeValidator and isPrivate read garbage — force safe defaults
          const teeValidator = isOldAccount 
            ? null 
            : (q.teeValidator && !q.teeValidator.equals(PublicKey.default) ? q.teeValidator as PublicKey : null);
          const isPrivate = isOldAccount ? false : (q.isPrivate as boolean);
          
          // Detect improperly delegated questions (owner = delegation program but status != PrivateVoting)
          let isImproperlyDelegated = false;
          try {
            const acc = await connection.getAccountInfo(q.pda as PublicKey);
            if (acc && !isOldAccount) {
              if (acc.owner.equals(DELEGATION_PROGRAM_ID) && statusNum !== QuestionStatus.PrivateVoting) {
                isImproperlyDelegated = true;
              }
            }
          } catch { /* ignore */ }
          
          return {
            questionId: q.questionId,
            pda: q.pda,
            authority: q.authority as PublicKey,
            questionText: q.questionText as string,
            category: q.category as string,
            deadline: Number(q.deadline),
            queryFee: Number(q.queryFee),
            status: statusNum,
            statusLabel: getStatusLabel(statusNum),
            committee: (q.committee as PublicKey[]).filter((c: PublicKey) => !c.equals(PublicKey.default)),
            yesVotes: Number(q.yesVotes),
            noVotes: Number(q.noVotes),
            unsureVotes: Number(q.unsureVotes),
            result: q.result ? parseVote(q.result) : null,
            resultLabel: q.result ? getVoteLabel(parseVote(q.result)) : "Pending",
            confidence: Number(q.confidence),
            createdAt: Number(q.createdAt),
            resolvedAt: q.resolvedAt ? Number(q.resolvedAt) : null,
            consensusThreshold: Number(q.consensusThreshold),
            isPrivate,
            teeValidator,
            isLegacy: isOldAccount,
            isImproperlyDelegated,
          };
        })
      );
      setQuestions(mapped);
    } catch (e) {
      console.error("Failed to fetch questions:", e);
    }
    setLoading(false);
  }, [fetchAllQuestions, fetchConfig, connection]);

  useEffect(() => { load(); }, [load]);

  return { questions, loading, refetch: load };
}

export function useQuestion(questionId: number) {
  const { fetchQuestion } = useAnchor();
  const { connection } = useConnection();
  const [question, setQuestion] = useState<OnChainQuestion | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRefetching, setIsRefetching] = useState(false);
  const hasLoadedRef = useRef(false);

  const load = useCallback(async () => {
    if (hasLoadedRef.current) {
      setIsRefetching(true);
    } else {
      setLoading(true);
    }
    
    try {
      const q = await fetchQuestion(questionId);
      if (q) {
        const pda = PublicKey.findProgramAddressSync(
          [Buffer.from("question"), Buffer.from(new BigUint64Array([BigInt(questionId)]).buffer)],
          PROGRAM_ID
        )[0];
        
        let isOldAccount = false;
        let isImproperlyDelegated = false;
        let accountOwner: PublicKey | null = null;
        try {
          const acc = await getCachedAccount(connection, pda);
          if (acc) {
            const dataSize = acc.data.length;
            isOldAccount = dataSize > 0 && dataSize < 590;
            accountOwner = acc.owner;
            if (!isOldAccount && acc.owner.equals(DELEGATION_PROGRAM_ID)) {
              const statusNum = parseStatus(q.status);
              if (statusNum !== QuestionStatus.PrivateVoting) {
                isImproperlyDelegated = true;
              }
            }
          }
        } catch { /* ignore */ }
        
        const statusNum = parseStatus(q.status);
        const resultNum = q.result ? parseVote(q.result) : null;
        
        const teeValidator = isOldAccount 
          ? null 
          : (q.teeValidator && !q.teeValidator.equals(PublicKey.default) ? q.teeValidator as PublicKey : null);
        const isPrivate = isOldAccount ? false : (q.isPrivate as boolean);
        
        setQuestion({
          questionId,
          pda,
          authority: q.authority as PublicKey,
          questionText: q.questionText as string,
          category: q.category as string,
          deadline: Number(q.deadline),
          queryFee: Number(q.queryFee),
          status: statusNum,
          statusLabel: getStatusLabel(statusNum),
          committee: (q.committee as PublicKey[]).filter((c: PublicKey) => !c.equals(PublicKey.default)),
          yesVotes: Number(q.yesVotes),
          noVotes: Number(q.noVotes),
          unsureVotes: Number(q.unsureVotes),
          result: resultNum,
          resultLabel: resultNum !== null ? getVoteLabel(resultNum) : "Pending",
          confidence: Number(q.confidence),
          createdAt: Number(q.createdAt),
          resolvedAt: q.resolvedAt ? Number(q.resolvedAt) : null,
          consensusThreshold: Number(q.consensusThreshold),
          isPrivate,
          teeValidator,
          isLegacy: isOldAccount,
          isImproperlyDelegated,
        });
      }
    } catch (e) {
      console.error("Failed to fetch question:", e);
    }
    
    setLoading(false);
    setIsRefetching(false);
    hasLoadedRef.current = true;
  }, [fetchQuestion, questionId, connection]);

  useEffect(() => { load(); }, [load]);

  return { question, loading, isRefetching, refetch: load };
}

export function useAgents() {
  const { fetchAgentRegistry, fetchAgent } = useAnchor();
  const [agents, setAgents] = useState<OnChainAgent[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const registry = await fetchAgentRegistry();
      if (!registry) { setLoading(false); return; }
      const count = Number(registry.count);
      const agentPubs = (registry.agents as PublicKey[]).slice(0, count);
      const loaded: OnChainAgent[] = [];
      for (const wallet of agentPubs) {
        try {
          const a = await fetchAgent(wallet);
          if (a) {
            const name = a.name as string;
            const totalVotes = Number(a.totalVotes);
            const correctVotes = Number(a.correctVotes);
            loaded.push({
              pda: PublicKey.findProgramAddressSync(
                [Buffer.from("agent"), wallet.toBuffer()],
                PROGRAM_ID
              )[0],
              wallet,
              name,
              reputation: Number(a.reputation),
              isActive: a.isActive as boolean,
              bondAmount: Number(a.bondAmount),
              totalVotes,
              correctVotes,
              accuracy: totalVotes > 0 ? Math.round((correctVotes / totalVotes) * 100) : 0,
              color: AGENT_COLORS[name] || "#A7F3D0",
              createdAt: Number(a.createdAt),
            });
          }
        } catch {
          // skip failed agent
        }
      }
      setAgents(loaded);
    } catch (e) {
      console.error("Failed to fetch agents:", e);
    }
    setLoading(false);
  }, [fetchAgentRegistry, fetchAgent]);

  useEffect(() => { load(); }, [load]);

  return { agents, loading, refetch: load };
}

export function useHumanAttestation(walletPk: PublicKey | null) {
  const { fetchHumanAttestation } = useAnchor();
  const [attestation, setAttestation] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!walletPk) { setLoading(false); return; }
    setLoading(true);
    try {
      const att = await fetchHumanAttestation(walletPk);
      setAttestation(att);
    } catch {
      setAttestation(null);
    }
    setLoading(false);
  }, [fetchHumanAttestation, walletPk]);

  useEffect(() => { load(); }, [load]);

  return { attestation, loading, refetch: load };
}
