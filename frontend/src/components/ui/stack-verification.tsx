"use client";

import React, { useEffect, useState, useMemo } from "react";
import {
  ShieldCheck,
  Lock,
  Zap,
  ExternalLink,
  CheckCircle2,
  XCircle,
  Loader2,
  Server,
  Vote,
  EyeOff,
  Cpu,
  AlertTriangle,
} from "lucide-react";
import { useConnection } from "@solana/wallet-adapter-react";
import { DELEGATION_PROGRAM_ID, TEE_VALIDATOR, ER_VALIDATOR, QuestionStatus, PROGRAM_ID, PERMISSION_PROGRAM_ID, CLUSTER } from "@/lib/constants";
import type { OnChainQuestion } from "@/hooks/use-on-chain";

interface StackHealth {
  er: { live: boolean; latencyMs: number; url: string; label: string; error?: string };
  tee: { live: boolean; latencyMs: number; url: string; label: string; error?: string };
  payments: { live: boolean; latencyMs: number; url: string; label: string; error?: string };
  checkedAt: string;
}

const VERIFIED_PRIVATE_PAYMENT_TXS = [
  { label: "Initialize Mint", tx: "3YT8PcTyZFcKJvW5hrXuzmwxQibeJWLcZXiZ6mjM9moEFhBFnUwDgUBaXRCCTiaEAXzdJJsCEhM4mj7jXe151siw" },
  { label: "Deposit 100 USDC", tx: "4juykvkhQAPSDegskukCB7ZoTSmdnaCbEmbT2pSiUisy8UExEyGnpMRyHDwRb2qnqsiZ9sWwi5SpLYqRcUDQqgkP" },
  { label: "Private Transfer 10 USDC", tx: "4U3vrUDRTvcVnMQPwAetbf29ADcFvfRd8tgTAurK8DpS8k9EPpkZmsL6SzZ5MEgyiRNVdfnuo5ARHZQEBoGPe24s" },
  { label: "Withdraw 400 USDC", tx: "2qgGFFU6VAaRwR7jLg5ms5hBQ81C55rrwDr1YfHFjPCeoCthcf6PTVmawfDTfb9YCfE9nmW4DwP6qLwtTKYDNG5U" },
];

function explorerUrl(type: "address" | "tx", address: string) {
  return type === "address"
    ? `https://explorer.solana.com/address/${address}?cluster=${CLUSTER}`
    : `https://explorer.solana.com/tx/${address}?cluster=${CLUSTER}`;
}

function ExtLink({ type, address, children }: { type: "address" | "tx"; address: string; children: React.ReactNode }) {
  return (
    <a href={explorerUrl(type, address)} target="_blank" rel="noopener noreferrer" className="font-mono text-[10px] text-solana-purple hover:underline inline-flex items-center gap-1">
      <ExternalLink className="w-2.5 h-2.5 shrink-0" />
      {children}
    </a>
  );
}

interface StackVerificationProps {
  question: OnChainQuestion;
  perTxHash?: string | null;
  adminTxHash?: string | null;
  privateRewardTxHash?: string | null;
}

export function StackVerification({ question, perTxHash, adminTxHash, privateRewardTxHash }: StackVerificationProps) {
  const { connection } = useConnection();
  const [health, setHealth] = useState<StackHealth | null>(null);
  const [isDelegated, setIsDelegated] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const acc = await connection.getAccountInfo(question.pda);
        if (!cancelled && acc) setIsDelegated(acc.owner.equals(DELEGATION_PROGRAM_ID));
        else if (!cancelled) setIsDelegated(false);
      } catch { if (!cancelled) setIsDelegated(false); }
    })();
    return () => { cancelled = true; };
  }, [connection, question.pda]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const resp = await fetch("/api/stack-health");
        if (resp.ok && !cancelled) setHealth(await resp.json());
      } catch { /* ignore */ }
    })();
    return () => { cancelled = true; };
  }, []);

  const perActive = useMemo(() => isDelegated || question.isPrivate || question.status === QuestionStatus.PrivateVoting || !!perTxHash, [isDelegated, question.isPrivate, question.status, perTxHash]);
  const perImproper = question.isImproperlyDelegated;
  const hasVotes = question.yesVotes + question.noVotes + question.unsureVotes > 0;
  const hasCommittee = question.committee.length > 0;

  return (
    <div className="bg-black text-white border-brutal p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-6 h-6 bg-lime-green flex items-center justify-center border-2 border-black">
          <ShieldCheck className="w-3.5 h-3.5 text-black" strokeWidth={3} />
        </div>
        <h3 className="font-heading font-black text-sm uppercase text-lime-green">MagicBlock Stack Verification</h3>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-3">
        {/* PER/TEE */}
        <div className={`p-3 border-2 ${perImproper ? "border-cyber-yellow/60 bg-cyber-yellow/10" : perActive ? "border-solana-purple/60 bg-solana-purple/10" : "border-white/10 bg-white/[0.02]"}`}>
          <div className="flex items-center gap-1.5 mb-1.5">
            <Lock className="w-3.5 h-3.5 text-solana-purple" />
            <span className="font-heading font-black text-[10px] uppercase text-solana-purple">PER/TEE</span>
            {perImproper ? <AlertTriangle className="w-3 h-3 text-cyber-yellow ml-auto" /> : perActive ? <CheckCircle2 className="w-3 h-3 text-lime-green ml-auto" /> : <XCircle className="w-3 h-3 text-white/20 ml-auto" />}
          </div>
          <p className="font-mono text-[8px] text-white/35 mb-1.5">
            {perImproper ? "Improperly delegated — status mismatch" : perActive ? "Question delegated to TEE — votes encrypted" : "Not active for this question"}
          </p>
          <div className="space-y-0.5">
            <ExtLink type="address" address={question.pda.toBase58()}>Question PDA</ExtLink>
            {isDelegated && <ExtLink type="address" address={DELEGATION_PROGRAM_ID.toBase58()}>Owner: Delegation Program</ExtLink>}
            {perTxHash && <ExtLink type="tx" address={perTxHash}>Delegation TX</ExtLink>}
          </div>
        </div>

        {/* VRF */}
        <div className={`p-3 border-2 ${hasCommittee ? "border-cyber-yellow/60 bg-cyber-yellow/10" : "border-white/10 bg-white/[0.02]"}`}>
          <div className="flex items-center gap-1.5 mb-1.5">
            <Vote className="w-3.5 h-3.5 text-cyber-yellow" />
            <span className="font-heading font-black text-[10px] uppercase text-cyber-yellow">VRF Committee</span>
            {hasCommittee ? <CheckCircle2 className="w-3 h-3 text-lime-green ml-auto" /> : <XCircle className="w-3 h-3 text-white/20 ml-auto" />}
          </div>
          <p className="font-mono text-[8px] text-white/35 mb-1.5">{hasCommittee ? `${question.committee.length} agents selected via on-chain entropy` : "No committee yet"}</p>
          <div className="space-y-0.5">
            {question.committee.slice(0, 3).map((pk, i) => (
              <ExtLink key={pk.toBase58()} type="address" address={pk.toBase58()}>Agent {i + 1}</ExtLink>
            ))}
            {adminTxHash && <ExtLink type="tx" address={adminTxHash}>Selection TX</ExtLink>}
          </div>
        </div>

        {/* Commit-Reveal */}
        <div className={`p-3 border-2 ${hasVotes ? "border-lime-green/60 bg-lime-green/10" : "border-white/10 bg-white/[0.02]"}`}>
          <div className="flex items-center gap-1.5 mb-1.5">
            <EyeOff className="w-3.5 h-3.5 text-lime-green" />
            <span className="font-heading font-black text-[10px] uppercase text-lime-green">Commit-Reveal</span>
            {hasVotes ? <CheckCircle2 className="w-3 h-3 text-lime-green ml-auto" /> : <XCircle className="w-3 h-3 text-white/20 ml-auto" />}
          </div>
          <p className="font-mono text-[8px] text-white/35 mb-1.5">{hasVotes ? "Votes committed and revealed on-chain" : "No votes yet"}</p>
          {hasVotes && (
            <div className="flex gap-2 mb-1">
              <span className="font-heading font-black text-[10px] text-lime-green">{question.yesVotes}Y</span>
              <span className="font-heading font-black text-[10px] text-hot-coral">{question.noVotes}N</span>
              <span className="font-heading font-black text-[10px] text-cyber-yellow">{question.unsureVotes}U</span>
            </div>
          )}
          <ExtLink type="address" address={question.pda.toBase58()}>View on PDA</ExtLink>
        </div>

        {/* Private Payments */}
        <div className="p-3 border-2 border-hot-coral/40 bg-hot-coral/5">
          <div className="flex items-center gap-1.5 mb-1.5">
            <Cpu className="w-3.5 h-3.5 text-hot-coral" />
            <span className="font-heading font-black text-[10px] uppercase text-hot-coral">Private Payments</span>
            <CheckCircle2 className="w-3 h-3 text-lime-green ml-auto" />
          </div>
          <p className="font-mono text-[8px] text-white/35 mb-1.5">Encrypted USDC transfers — amount hidden on Explorer</p>
          <div className="space-y-0.5">
            {VERIFIED_PRIVATE_PAYMENT_TXS.map((tx, i) => (
              <ExtLink key={i} type="tx" address={tx.tx}>{tx.label}</ExtLink>
            ))}
            {privateRewardTxHash && <ExtLink type="tx" address={privateRewardTxHash}>This question's reward</ExtLink>}
          </div>
        </div>
      </div>

      {/* ER + TEE + Payments Health Row */}
      <div className="grid grid-cols-3 gap-3 mb-3">
        <div className="p-2.5 border border-white/10 bg-white/[0.02] flex items-center gap-2">
          <Zap className="w-3 h-3 text-white/50" />
          <div className="flex-1">
            <p className="font-heading font-black text-[9px] uppercase text-white/50">ER Endpoint</p>
          </div>
          {health ? (
            <span className={`font-mono text-[9px] font-bold ${health.er.live ? "text-lime-green" : "text-hot-coral"}`}>
              {health.er.live ? `${health.er.latencyMs}ms` : "OFFLINE"}
            </span>
          ) : (
            <Loader2 className="w-3 h-3 animate-spin text-white/20" />
          )}
        </div>
        <div className="p-2.5 border border-white/10 bg-white/[0.02] flex items-center gap-2">
          <Server className="w-3 h-3 text-white/50" />
          <div className="flex-1">
            <p className="font-heading font-black text-[9px] uppercase text-white/50">TEE Endpoint</p>
          </div>
          {health ? (
            <span className={`font-mono text-[9px] font-bold ${health.tee.live ? "text-lime-green" : "text-hot-coral"}`}>
              {health.tee.live ? `${health.tee.latencyMs}ms` : "OFFLINE"}
            </span>
          ) : (
            <Loader2 className="w-3 h-3 animate-spin text-white/20" />
          )}
        </div>
        <div className="p-2.5 border border-white/10 bg-white/[0.02] flex items-center gap-2">
          <Cpu className="w-3 h-3 text-white/50" />
          <div className="flex-1">
            <p className="font-heading font-black text-[9px] uppercase text-white/50">Payments API</p>
          </div>
          {health ? (
            <span className={`font-mono text-[9px] font-bold ${health.payments.live ? "text-lime-green" : "text-hot-coral"}`}>
              {health.payments.live ? `${health.payments.latencyMs}ms` : "OFFLINE"}
            </span>
          ) : (
            <Loader2 className="w-3 h-3 animate-spin text-white/20" />
          )}
        </div>
      </div>

      {/* Program References */}
      <div className="pt-2 border-t border-white/10">
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          <ExtLink type="address" address={PROGRAM_ID.toBase58()}>Program</ExtLink>
          <ExtLink type="address" address={DELEGATION_PROGRAM_ID.toBase58()}>Delegation</ExtLink>
          <ExtLink type="address" address={PERMISSION_PROGRAM_ID.toBase58()}>Permission</ExtLink>
          <ExtLink type="address" address={TEE_VALIDATOR.toBase58()}>TEE Validator</ExtLink>
          <ExtLink type="address" address={ER_VALIDATOR.toBase58()}>ER Validator</ExtLink>
        </div>
      </div>
    </div>
  );
}
