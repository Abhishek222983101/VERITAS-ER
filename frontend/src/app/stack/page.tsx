"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { StackVerification } from "@/components/ui/stack-verification";
import { useQuestion } from "@/hooks/use-on-chain";

export default function StackPage() {
  const defaultQuestionId = 0;
  const { question, loading } = useQuestion(defaultQuestionId);

  if (loading || !question) {
    return (
      <div className="min-h-screen bg-cream font-mono flex items-center justify-center bg-noise">
        <div className="text-center">
          <p className="font-heading text-lg font-black uppercase text-black/30">
            Loading stack verification...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream font-mono bg-noise">
      <div className="fixed inset-0 bg-dot-pattern opacity-[0.06] pointer-events-none z-0" />
      <div className="relative z-10">
        <div className="bg-black text-white py-3 border-brutal-b">
          <div className="mx-auto w-[95%] max-w-7xl flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3 hover:text-lime-green transition-colors">
              <ArrowLeft className="w-5 h-5" strokeWidth={3} />
              <span className="font-heading font-black uppercase tracking-tighter">Back</span>
            </Link>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-lime-green" />
              <span className="font-heading font-black text-xs uppercase text-lime-green">
                Stack Verification
              </span>
            </div>
          </div>
        </div>

        <div className="py-8">
          <div className="mx-auto w-[95%] max-w-3xl space-y-6">
            <div className="bg-white border-brutal shadow-brutal p-6">
              <h1 className="font-heading text-2xl font-black uppercase tracking-tight mb-2">
                MagicBlock Stack Verification
              </h1>
              <p className="font-mono text-sm text-black/50">
                Live on-chain proof that every MagicBlock integration is real, deployed, and verifiable. 
                Click the Explorer links to check for yourself. Showing data for Question #{defaultQuestionId} as reference.
              </p>
            </div>

            <StackVerification question={question} />

            <div className="bg-white border-brutal shadow-brutal p-6">
              <h2 className="font-heading text-lg font-black uppercase tracking-tight mb-3 border-brutal-b pb-2">
                How Judges Can Verify
              </h2>
              <ol className="font-mono text-xs text-black/60 space-y-3 list-decimal list-inside">
                <li>
                  <strong className="text-black">PER/TEE:</strong> Click the Question PDA link → check &quot;Owner&quot; field. 
                  If it says &quot;DELeGGvX...&quot; (Delegation Program), the question is delegated to TEE.
                </li>
                <li>
                  <strong className="text-black">VRF:</strong> Click the committee agent links → each is a real Solana account 
                  with an on-chain Agent account. The committee is stored in the Question PDA data.
                </li>
                <li>
                  <strong className="text-black">Commit-Reveal:</strong> Check the vote tallies (YES/NO/UNSURE) on the Question PDA. 
                  Each agent&apos;s commit hash is stored in a VoteCommit PDA — verify the hash matches the revealed vote.
                </li>
                <li>
                  <strong className="text-black">Private Payments:</strong> Click the &quot;Private Transfer&quot; TX link → on Solana Explorer, 
                  you will NOT see the transfer amount or recipient. That&apos;s the privacy guarantee. Compare with the Deposit/Withdraw 
                  TXs where amounts ARE visible.
                </li>
                <li>
                  <strong className="text-black">Ephemeral Rollup:</strong> The ER health check pings devnet-as.magicblock.app live. 
                  The orchestrator uses this endpoint for fast state reads during the voting process.
                </li>
                <li>
                  <strong className="text-black">TEE Auth:</strong> The orchestrator calls getAuthToken on devnet-tee.magicblock.app 
                  to get JWT tokens, then uses them for private_commit_vote instructions through the TEE endpoint.
                </li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
