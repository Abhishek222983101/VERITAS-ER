"use client";

import React from "react";
import Link from "next/link";
import { Wallet, Vote, CheckCircle2, Loader2, ShieldCheck } from "lucide-react";
import { useAnchor } from "@/components/providers/anchor-provider";
import { useQuestions, useHumanAttestation, useAgents } from "@/hooks/use-on-chain";
import { QuestionStatus } from "@/lib/constants";
import { GradientHeading } from "@/components/ui/gradient-heading";
import { Button } from "@/components/ui/button";

export default function DashboardPage() {
  const { connected, publicKey } = useAnchor();
  const { questions, loading: qLoading } = useQuestions();
  const { agents, loading: aLoading } = useAgents();
  const { attestation, loading: attLoading } = useHumanAttestation(publicKey);

  const loading = qLoading || aLoading || attLoading;
  const myQuestions = connected ? questions.filter((q) => publicKey && q.authority.equals(publicKey)) : [];
  const myAgent = connected ? agents.find((a) => publicKey && a.wallet.equals(publicKey)) : null;
  const isVerified = !!attestation;

  return (
    <div className="min-h-screen bg-cream font-mono bg-noise">
      <div className="fixed inset-0 bg-dot-pattern opacity-[0.06] pointer-events-none z-0" />

      <div className="relative z-10">
        <div className="bg-black text-white py-4 border-brutal-b">
          <div className="mx-auto w-[95%] max-w-7xl flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Wallet className="w-6 h-6 text-solana-green" strokeWidth={3} />
              <h1 className="font-heading text-2xl md:text-3xl font-black uppercase tracking-tighter">
                Dashboard
              </h1>
            </div>
            <div className="font-mono text-xs font-bold text-white/40 uppercase">
              {connected ? (
                <span className="text-lime-green">{publicKey?.toBase58().slice(0, 8)}...{publicKey?.toBase58().slice(-4)}</span>
              ) : (
                "Connect Wallet"
              )}
            </div>
          </div>
        </div>

        {!connected ? (
          <div className="py-20 text-center">
            <Wallet className="w-16 h-16 text-black/20 mx-auto mb-4" />
            <p className="font-heading text-2xl font-black uppercase text-black/30">Connect Your Wallet</p>
            <p className="font-mono text-sm text-black/50 mt-2">Use the wallet button in the header to connect</p>
          </div>
        ) : loading ? (
          <div className="py-20 text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-black/40" />
          </div>
        ) : (
          <div className="py-8">
            <div className="mx-auto w-[95%] max-w-7xl space-y-8">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white border-brutal shadow-brutal-sm p-4 text-center">
                  <p className="font-mono text-[10px] font-bold uppercase text-black/40 mb-1">My Questions</p>
                  <p className="font-heading font-black text-3xl text-solana-purple">{myQuestions.length}</p>
                </div>
                <div className="bg-white border-brutal shadow-brutal-sm p-4 text-center">
                  <p className="font-mono text-[10px] font-bold uppercase text-black/40 mb-1">Human Verified</p>
                  <p className="font-heading font-black text-3xl text-lime-green">{isVerified ? "YES" : "NO"}</p>
                </div>
                <div className="bg-white border-brutal shadow-brutal-sm p-4 text-center">
                  <p className="font-mono text-[10px] font-bold uppercase text-black/40 mb-1">Agent Status</p>
                  <p className="font-heading font-black text-3xl">{myAgent ? (myAgent.isActive ? "Active" : "Idle") : "N/A"}</p>
                </div>
                <div className="bg-white border-brutal shadow-brutal-sm p-4 text-center">
                  <p className="font-mono text-[10px] font-bold uppercase text-black/40 mb-1">Reputation</p>
                  <p className="font-heading font-black text-3xl text-lime-green">{myAgent?.reputation || 0}</p>
                </div>
              </div>

              {!isVerified && (
                <div className="bg-hot-coral/10 border-4 border-hot-coral p-6 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <ShieldCheck className="w-6 h-6 text-hot-coral" />
                    <div>
                      <p className="font-heading font-black uppercase text-sm">Verify Your Identity</p>
                      <p className="font-mono text-xs text-black/60">Required to register as an oracle agent</p>
                    </div>
                  </div>
                  <Link href="/verify">
                    <Button variant="solana">Verify Now</Button>
                  </Link>
                </div>
              )}

              <div>
                <GradientHeading variant="default" size="lg" className="mb-4">
                  My Questions
                </GradientHeading>
                {myQuestions.length > 0 ? (
                  <div className="space-y-3">
                    {myQuestions.map((q) => (
                      <Link key={q.questionId} href={`/question/${q.questionId}`} className="block">
                        <div className="bg-white border-brutal shadow-brutal-sm p-5 hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-brutal transition-all">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <h3 className="font-heading text-lg font-black uppercase tracking-tight">
                                {q.questionText}
                              </h3>
                              <div className="flex items-center gap-4 mt-2 font-mono text-xs font-bold text-black/50">
                                <span>ID: {q.questionId}</span>
                                <span>Fee: {q.queryFee / 1e9} SOL</span>
                                <span>{q.committee.length} committee members</span>
                              </div>
                            </div>
                            <span className={`px-3 py-1 border-2 font-heading font-black text-sm uppercase ${
                              q.status === QuestionStatus.Resolved ? "bg-lime-green text-black border-black" :
                              q.status >= QuestionStatus.CommitteeSelected ? "bg-solana-purple text-white border-black" :
                              "bg-cyber-yellow text-black border-black"
                            }`}>
                              {q.statusLabel}
                            </span>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="bg-white border-brutal shadow-brutal p-12 text-center">
                    <Vote className="w-8 h-8 text-black/20 mx-auto mb-2" />
                    <p className="font-heading text-xl font-black uppercase text-black/30">No questions submitted</p>
                    <Link href="/ask">
                      <Button variant="solana" className="mt-4">Ask a Question</Button>
                    </Link>
                  </div>
                )}
              </div>

              {myAgent && (
                <div>
                  <GradientHeading variant="default" size="lg" className="mb-4">
                    My Agent Profile
                  </GradientHeading>
                  <Link href={`/agent/${myAgent.wallet.toBase58()}`}>
                    <div className="bg-white border-brutal shadow-brutal p-6 hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-brutal transition-all">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 border-2 border-black flex items-center justify-center" style={{ backgroundColor: myAgent.color }}>
                          <span className="font-heading font-black text-sm text-black">{myAgent.name.charAt(0)}</span>
                        </div>
                        <div className="flex-1">
                          <p className="font-heading font-black uppercase">{myAgent.name}</p>
                          <div className="flex gap-4 mt-1 font-mono text-xs text-black/50">
                            <span>Rep: {myAgent.reputation}</span>
                            <span>Accuracy: {myAgent.accuracy}%</span>
                            <span>Votes: {myAgent.totalVotes}</span>
                          </div>
                        </div>
                        <span className={`px-2 py-1 border font-heading font-black text-xs uppercase ${
                          myAgent.isActive ? "bg-lime-green text-black border-black" : "bg-cream text-black/50 border-black/20"
                        }`}>
                          {myAgent.isActive ? "active" : "idle"}
                        </span>
                      </div>
                    </div>
                  </Link>
                </div>
              )}

              {!myAgent && isVerified && (
                <div className="bg-lime-green/10 border-4 border-lime-green p-6 text-center">
                  <p className="font-heading font-black uppercase text-sm mb-2">You are verified! Register as an oracle agent:</p>
                  <p className="font-mono text-xs text-black/60 mb-4">Connect with your verified wallet and register to participate in committees</p>
                  <Link href="/oracle">
                    <Button variant="solana">Go to Oracle</Button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
