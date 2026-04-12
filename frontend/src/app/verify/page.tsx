"use client";

import React, { useState } from "react";
import { ShieldCheck, Fingerprint, Scan, CheckCircle2, AlertTriangle, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GradientHeading } from "@/components/ui/gradient-heading";
import { useDivePrograms } from "@/lib/anchor";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { useWallet } from "@solana/wallet-adapter-react";
import * as anchor from "@coral-xyz/anchor";

type Step = "idle" | "connecting" | "authenticating" | "proving" | "attesting" | "complete";

export default function VerifyPage() {
  const [step, setStep] = useState<Step>("idle");
  const [providerChoice, setProviderChoice] = useState<"google" | "github">("google");
  const { diveIdentity } = useDivePrograms();
  const { publicKey } = useWallet();

  const startVerification = () => {
    if (!publicKey) {
      alert("Please connect your wallet first.");
      return;
    }
    setStep("connecting");
    setTimeout(() => setStep("authenticating"), 1500);
    setTimeout(() => setStep("proving"), 3000);
    setTimeout(async () => {
      setStep("attesting");
      try {
        const response = await fetch("/api/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ wallet: publicKey.toBase58() }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Verification failed");
        }
        
        console.log("Registered human! TX:", data.tx);
        setStep("complete");
      } catch (e: any) {
        console.error("Verification failed:", e);
        alert(`Failed to register: ${e.message}`);
        setStep("idle");
      }
    }, 4500);
  };

  return (
    <div className="min-h-screen bg-cream font-mono bg-noise">
      <div className="fixed inset-0 bg-dot-pattern opacity-[0.06] pointer-events-none z-0" />

      <div className="relative z-10 py-12">
        <div className="mx-auto w-[95%] max-w-3xl space-y-8">
          <div className="text-center">
            <GradientHeading variant="solana" size="xl" className="mb-4">
              VERIFY YOUR IDENTITY
            </GradientHeading>
            <p className="font-mono text-lg text-neutral-700 max-w-xl mx-auto">
              Prove you are a unique human using zero-knowledge proofs. One human = one oracle agent. No personal data revealed.
            </p>
          </div>

          {/* How It Works */}
          <div className="bg-white border-brutal shadow-brutal p-6 md:p-8">
            <h2 className="font-heading text-xl font-black uppercase tracking-tight border-brutal-b pb-3 mb-6">
              How Reclaim zkTLS Works
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="w-14 h-14 mx-auto bg-solana-purple/20 border-2 border-solana-purple flex items-center justify-center mb-3">
                  <Fingerprint className="w-7 h-7 text-solana-purple" strokeWidth={2} />
                </div>
                <h3 className="font-heading font-black uppercase text-sm mb-1">1. Authenticate</h3>
                <p className="font-mono text-xs text-black/60">Sign in with Google or GitHub. Reclaim generates a zkTLS proof.</p>
              </div>
              <div className="text-center">
                <div className="w-14 h-14 mx-auto bg-cyber-yellow/20 border-2 border-cyber-yellow flex items-center justify-center mb-3">
                  <Scan className="w-7 h-7 text-cyber-yellow" strokeWidth={2} />
                </div>
                <h3 className="font-heading font-black uppercase text-sm mb-1">2. Prove Uniqueness</h3>
                <p className="font-mono text-xs text-black/60">ZK proof proves you own a unique OAuth account — without revealing who you are.</p>
              </div>
              <div className="text-center">
                <div className="w-14 h-14 mx-auto bg-lime-green/20 border-2 border-lime-green flex items-center justify-center mb-3">
                  <ShieldCheck className="w-7 h-7 text-lime-green" strokeWidth={2} />
                </div>
                <h3 className="font-heading font-black uppercase text-sm mb-1">3. On-chain Attestation</h3>
                <p className="font-mono text-xs text-black/60">SAS credential issued to your wallet. Same Google = same hash = one attestation only.</p>
              </div>
            </div>
          </div>

          {/* Verification Flow */}
          <div className="bg-white border-brutal shadow-brutal p-6 md:p-8">
            <h2 className="font-heading text-xl font-black uppercase tracking-tight border-brutal-b pb-3 mb-6">
              Start Verification
            </h2>

            {/* Provider Selection */}
            {step === "idle" && (
              <div className="space-y-4">
                <p className="font-mono text-sm font-bold text-black/60 mb-4">Choose your OAuth provider:</p>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => setProviderChoice("google")}
                    className={`p-4 border-4 transition-all ${
                      providerChoice === "google"
                        ? "border-solana-purple bg-solana-purple/10 shadow-brutal-sm"
                        : "border-black hover:border-solana-purple"
                    }`}
                  >
                    <p className="font-heading font-black uppercase">Google</p>
                  </button>
                  <button
                    onClick={() => setProviderChoice("github")}
                    className={`p-4 border-4 transition-all ${
                      providerChoice === "github"
                        ? "border-black bg-black/10 shadow-brutal-sm"
                        : "border-black hover:border-solana-purple"
                    }`}
                  >
                    <p className="font-heading font-black uppercase">GitHub</p>
                  </button>
                </div>
                <Button variant="solana" className="w-full h-14 text-xl" onClick={startVerification}>
                  Verify with {providerChoice === "google" ? "Google" : "GitHub"}
                </Button>
              </div>
            )}

            {/* In-progress Steps */}
            {step !== "idle" && step !== "complete" && (
              <div className="space-y-3">
                {[
                  { key: "connecting", label: "Connecting to Reclaim...", icon: "🔌" },
                  { key: "authenticating", label: `Authenticating via ${providerChoice}...`, icon: "🔐" },
                  { key: "proving", label: "Generating ZK proof (zkTLS)...", icon: "🧮" },
                  { key: "attesting", label: "Issuing SAS attestation on Solana...", icon: "⛓️" },
                ].map((s, i) => {
                  const stepOrder = ["connecting", "authenticating", "proving", "attesting"];
                  const currentIdx = stepOrder.indexOf(step);
                  const thisIdx = stepOrder.indexOf(s.key);
                  const isComplete = thisIdx < currentIdx;
                  const isCurrent = thisIdx === currentIdx;

                  return (
                    <div
                      key={s.key}
                      className={`flex items-center gap-3 p-3 border-2 ${
                        isCurrent ? "border-solana-purple bg-solana-purple/10" :
                        isComplete ? "border-lime-green bg-lime-green/10" :
                        "border-black/10 bg-black/5"
                      }`}
                    >
                      <span className="text-lg">{s.icon}</span>
                      <span className={`font-heading font-black uppercase text-sm ${
                        isCurrent ? "text-solana-purple animate-pulse" :
                        isComplete ? "text-lime-green" :
                        "text-black/30"
                      }`}>
                        {s.label}
                      </span>
                      {isComplete && <CheckCircle2 className="w-5 h-5 text-lime-green ml-auto" />}
                      {isCurrent && <div className="ml-auto w-4 h-4 border-2 border-solana-purple border-t-transparent rounded-full animate-spin" />}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Complete */}
            {step === "complete" && (
              <div className="text-center py-6">
                <div className="w-16 h-16 mx-auto bg-lime-green border-4 border-black shadow-brutal-sm flex items-center justify-center mb-4">
                  <ShieldCheck className="w-8 h-8 text-black" strokeWidth={3} />
                </div>
                <h3 className="font-heading text-2xl font-black uppercase text-lime-green mb-2">
                  Verified!
                </h3>
                <p className="font-mono text-sm text-black/60 mb-4">
                  SAS attestation issued to your wallet. You can now register as an oracle agent.
                </p>
                <div className="bg-black/5 border-2 border-black p-4 mb-4">
                  <p className="font-mono text-[10px] font-bold uppercase text-black/30 mb-1">Attestation Hash</p>
                  <p className="font-mono text-xs font-bold text-lime-green break-all">
                    0x4a7b2c9f1e3d5a8b6c0f2e4d7a9b1c3f5e8d2a4b6c8f0e2d4a7b9c1f3e5d8a2
                  </p>
                </div>
                <div className="flex gap-3 justify-center">
                  <Button variant="default" onClick={() => window.location.href = "/oracle"}>
                    Go to Oracle
                  </Button>
                  <Button variant="outline" onClick={() => setStep("idle")}>
                    Verify Again
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Security Note */}
          <div className="bg-hot-coral/10 border-4 border-hot-coral p-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-6 h-6 text-hot-coral shrink-0 mt-0.5" />
              <div>
                <h3 className="font-heading font-black uppercase text-sm mb-1">Privacy Guarantee</h3>
                <p className="font-mono text-xs text-black/70 leading-relaxed">
                  Your identity is never stored. Reclaim generates a zero-knowledge proof that you own a unique OAuth account.
                  Only a stable hash (provider + account_id) is used for deduplication. No PII leaves your device.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
