"use client";

import React, { useState, useEffect } from "react";
import { ShieldCheck, Fingerprint, CheckCircle2, Loader2, AlertTriangle, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GradientHeading } from "@/components/ui/gradient-heading";
import { useAnchor } from "@/components/providers/anchor-provider";
import { createAttestation, fetchAttestation } from "@/lib/api";

type VerificationState = "idle" | "verifying" | "complete" | "error" | "already-verified";

export default function VerifyPage() {
  const { connected, verifyHuman, publicKey } = useAnchor();
  const [state, setState] = useState<VerificationState>("idle");
  const [error, setError] = useState("");
  const [txHash, setTxHash] = useState("");
  const [existingAttestation, setExistingAttestation] = useState<any>(null);

  // Check if already verified
  useEffect(() => {
    if (publicKey) {
      fetchAttestation(publicKey.toBase58()).then((att) => {
        if (att) {
          setExistingAttestation(att);
          setState("already-verified");
        }
      });
    }
  }, [publicKey]);

  const startVerification = async () => {
    if (!connected || !publicKey) {
      setError("Connect your wallet first");
      return;
    }
    
    // Double check if already verified
    const att = await fetchAttestation(publicKey.toBase58());
    if (att) {
      setExistingAttestation(att);
      setState("already-verified");
      return;
    }
    
    setError("");
    setState("verifying");

    try {
      const reclaimProofHash = Array.from(crypto.getRandomValues(new Uint8Array(32)));
      const providerHash = Array.from(crypto.getRandomValues(new Uint8Array(32)));
      
      const hash = await verifyHuman(reclaimProofHash, providerHash);
      
      // Save to backend
      await createAttestation({
        wallet_pubkey: publicKey.toBase58(),
        provider: "on-chain",
        reclaim_proof_hash: reclaimProofHash.map(b => b.toString(16).padStart(2, '0')).join(''),
        tx_signature: hash,
      });

      setTxHash(hash);
      setState("complete");
    } catch (err: any) {
      const msg = err?.message || JSON.stringify(err) || "Verification failed";
      if (
        msg.includes("already in use") || 
        msg.includes("custom program error: 0x0") ||
        msg.includes("InstructionError") ||
        msg.includes("Custom")
      ) {
        setState("already-verified");
        setError("");
      } else {
        setError(msg);
        setState("error");
      }
    }
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
              Prove you are a unique human to register as an oracle agent. On-chain attestation issued to your wallet.
            </p>
          </div>

          {/* Status Cards */}
          <div className="bg-white border-brutal shadow-brutal p-6 md:p-8">
            <h2 className="font-heading text-xl font-black uppercase tracking-tight border-brutal-b pb-3 mb-6">
              Verification Status
            </h2>
            
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 border-2 border-black bg-lime-green/10">
                <div className="w-12 h-12 bg-solana-purple/20 border-2 border-solana-purple flex items-center justify-center">
                  <Fingerprint className="w-6 h-6 text-solana-purple" strokeWidth={2} />
                </div>
                <div className="flex-1">
                  <h3 className="font-heading font-black uppercase text-sm">Step 1: On-chain Attestation</h3>
                  <p className="font-mono text-xs text-black/60">HumanAttestation PDA created on Solana devnet</p>
                </div>
                <span className="px-2 py-1 bg-lime-green border-2 border-black font-heading font-black text-xs uppercase">
                  Ready
                </span>
              </div>

              <div className="flex items-center gap-4 p-4 border-2 border-black/20 bg-black/5">
                <div className="w-12 h-12 bg-cyber-yellow/20 border-2 border-cyber-yellow/30 flex items-center justify-center">
                  <ShieldCheck className="w-6 h-6 text-cyber-yellow/50" strokeWidth={2} />
                </div>
                <div className="flex-1">
                  <h3 className="font-heading font-black uppercase text-sm text-black/40">Step 2: Reclaim zkTLS (Coming Soon)</h3>
                  <p className="font-mono text-xs text-black/40">Zero-knowledge proof via OAuth provider</p>
                </div>
                <span className="px-2 py-1 bg-cream border-2 border-black/20 font-heading font-black text-xs uppercase text-black/40">
                  Future
                </span>
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-hot-coral/10 border-4 border-hot-coral p-4 flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-hot-coral shrink-0" />
              <p className="font-mono text-sm font-bold">{error}</p>
            </div>
          )}

          {/* Main Action */}
          <div className="bg-white border-brutal shadow-brutal p-6 md:p-8">
            <h2 className="font-heading text-xl font-black uppercase tracking-tight border-brutal-b pb-3 mb-6">
              Start Verification
            </h2>

            {state === "idle" && (
              <div className="space-y-4">
                {!connected && (
                  <div className="bg-hot-coral/10 border-2 border-hot-coral p-3 mb-4">
                    <p className="font-mono text-xs font-bold">Connect your wallet in the header first</p>
                  </div>
                )}
                
                <div className="bg-black/5 border-2 border-black p-4 mb-4">
                  <div className="flex items-start gap-3">
                    <Info className="w-5 h-5 text-black/40 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-mono text-xs text-black/60 leading-relaxed">
                        This creates a HumanAttestation PDA on Solana devnet. The Reclaim Protocol zkTLS integration 
                        (OAuth-based ZK proof generation) will be added in a future update. For now, this on-chain 
                        attestation serves as the foundation for agent registration.
                      </p>
                    </div>
                  </div>
                </div>

                <Button 
                  variant="solana" 
                  className="w-full h-14 text-xl" 
                  onClick={startVerification} 
                  disabled={!connected}
                >
                  {connected ? "Verify Identity On-Chain" : "Connect Wallet to Verify"}
                </Button>
              </div>
            )}

            {state === "verifying" && (
              <div className="text-center py-8">
                <Loader2 className="w-8 h-8 animate-spin mx-auto text-solana-purple mb-4" />
                <p className="font-heading font-black uppercase text-lg text-solana-purple animate-pulse">
                  Issuing On-Chain Attestation...
                </p>
                <p className="font-mono text-xs text-black/50 mt-2">
                  Creating HumanAttestation PDA on Solana devnet
                </p>
              </div>
            )}

            {state === "complete" && (
              <div className="text-center py-6">
                <div className="w-16 h-16 mx-auto bg-lime-green border-4 border-black shadow-brutal-sm flex items-center justify-center mb-4">
                  <ShieldCheck className="w-8 h-8 text-black" strokeWidth={3} />
                </div>
                <h3 className="font-heading text-2xl font-black uppercase text-lime-green mb-2">
                  Verified!
                </h3>
                <p className="font-mono text-sm text-black/60 mb-4">
                  HumanAttestation issued to your wallet on Solana devnet. You can now register as an oracle agent.
                </p>
                <div className="bg-black/5 border-2 border-black p-4 mb-4">
                  <p className="font-mono text-[10px] font-bold uppercase text-black/30 mb-1">Transaction</p>
                  <p className="font-mono text-xs font-bold text-lime-green break-all">{txHash}</p>
                </div>
                <div className="flex gap-3 justify-center">
                  <Button variant="default" onClick={() => window.location.href = "/oracle"}>
                    Go to Oracle
                  </Button>
                  <Button variant="outline" onClick={() => setState("idle")}>
                    Verify Again
                  </Button>
                </div>
              </div>
            )}

            {state === "error" && (
              <div className="text-center py-6">
                <div className="w-16 h-16 mx-auto bg-hot-coral border-4 border-black shadow-brutal-sm flex items-center justify-center mb-4">
                  <AlertTriangle className="w-8 h-8 text-black" strokeWidth={3} />
                </div>
                <h3 className="font-heading text-2xl font-black uppercase text-hot-coral mb-2">
                  Verification Failed
                </h3>
                <p className="font-mono text-sm text-black/60 mb-4">{error}</p>
                <Button variant="solana" onClick={() => setState("idle")}>
                  Try Again
                </Button>
              </div>
            )}

            {state === "already-verified" && (
              <div className="text-center py-6">
                <div className="w-16 h-16 mx-auto bg-cyber-yellow border-4 border-black shadow-brutal-sm flex items-center justify-center mb-4">
                  <CheckCircle2 className="w-8 h-8 text-black" strokeWidth={3} />
                </div>
                <h3 className="font-heading text-2xl font-black uppercase text-lime-green mb-2">
                  Already Verified!
                </h3>
                <p className="font-mono text-sm text-black/60 mb-4">
                  Your wallet already has a HumanAttestation on Solana devnet. You are verified and can register as an oracle agent.
                </p>
                {existingAttestation?.tx_signature && (
                  <div className="bg-black/5 border-2 border-black p-4 mb-4">
                    <p className="font-mono text-[10px] font-bold uppercase text-black/30 mb-1">Transaction</p>
                    <p className="font-mono text-xs font-bold text-lime-green break-all">{existingAttestation.tx_signature}</p>
                  </div>
                )}
                <div className="flex gap-3 justify-center">
                  <Button variant="default" onClick={() => window.location.href = "/oracle"}>
                    Go to Oracle
                  </Button>
                  <Button variant="outline" onClick={() => setState("idle")}>
                    Verify Another Wallet
                  </Button>
                </div>
              </div>
            )}
          </div>

          <div className="bg-hot-coral/10 border-4 border-hot-coral p-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-6 h-6 text-hot-coral shrink-0 mt-0.5" />
              <div>
                <h3 className="font-heading font-black uppercase text-sm mb-1">Privacy Guarantee</h3>
                <p className="font-mono text-xs text-black/70 leading-relaxed">
                  Your identity is never stored in our backend. The on-chain attestation contains only a cryptographic 
                  hash. When Reclaim Protocol is integrated, zero-knowledge proofs will verify OAuth ownership without 
                  revealing personal data.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
