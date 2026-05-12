"use client";

import React, { useState, useRef } from "react";
import { Plus, Calendar, Tag, FileQuestion, Loader2, AlertCircle, ExternalLink, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GradientHeading } from "@/components/ui/gradient-heading";
import { useAnchor } from "@/components/providers/anchor-provider";
import { createQuestion } from "@/lib/api";
import { CLUSTER } from "@/lib/constants";

export default function AskQuestionPage() {
  const { connected, submitQuestion, publicKey } = useAnchor();
  const [question, setQuestion] = useState("");
  const [deadline, setDeadline] = useState("");
  const [category, setCategory] = useState("Crypto");
  const [enablePrivate, setEnablePrivate] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [txHash, setTxHash] = useState("");
  const [error, setError] = useState("");
  const isSubmittingRef = useRef(false);

  const categories = ["Crypto", "Sports", "Policy", "Science", "Tech", "Culture"];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Prevent double submission
    if (isSubmittingRef.current) {
      console.log("Submission already in progress, ignoring");
      return;
    }
    
    if (!connected) {
      setError("Connect your wallet first");
      return;
    }
    
    isSubmittingRef.current = true;
    setError("");
    setSubmitting(true);
    try {
      const deadlineTimestamp = Math.floor(new Date(deadline).getTime() / 1000);
      if (deadlineTimestamp <= Math.floor(Date.now() / 1000)) {
        setError("Deadline must be in the future");
        setSubmitting(false);
        return;
      }
      
      // Validate deadline is a proper number
      if (isNaN(deadlineTimestamp) || deadlineTimestamp <= 0) {
        setError("Invalid deadline. Please select a valid date and time.");
        setSubmitting(false);
        return;
      }
      
      console.log("Submitting question:", {
        question,
        category,
        deadline: deadlineTimestamp,
        deadlineType: typeof deadlineTimestamp
      });
      
      // Submit on-chain first
      const hash = await submitQuestion(question, category, deadlineTimestamp);
      
      console.log("Transaction successful:", hash);

      // If private voting enabled, also enable PER/TEE
      let perTxHash: string | null = null;
      if (enablePrivate) {
        try {
          // Parse question ID from config counter
          const config = await (await fetch("/api/config")).json().catch(() => null);
          // We need to figure out the question ID — use the tx to find it
          // For now, we'll enable private voting from the question detail page
          console.log("Private voting requested — enable it from the question detail page after committee selection");
        } catch (perErr: any) {
          console.warn("PER/TEE setup deferred:", perErr.message);
        }
      }
      
      // Save to backend (non-blocking — on-chain TX is the source of truth)
      try {
        await createQuestion({
          question_id: Date.now(),
          question_text: question,
          category,
          deadline: deadlineTimestamp,
          query_fee: 0.1 * 1e9,
          asker_pubkey: publicKey?.toBase58(),
          tx_signature: hash,
          status: "Pending"
        });
      } catch (backendErr: any) {
        console.warn("Backend save failed (non-critical):", backendErr.message);
      }
      
      setTxHash(hash);
      setSubmitted(true);
    } catch (err: any) {
      console.error("Submission error:", err);
      // Show detailed error for debugging
      let errorMsg = err?.message || "Transaction failed";
      
      // Handle "already processed" error - likely double submission
      if (errorMsg.includes("already been processed")) {
        errorMsg = "Transaction was already submitted. Please check the Questions page to see if your question was created.";
      }
      
      if (err?.logs) {
        errorMsg += " | Logs: " + err.logs.slice(-3).join(" | ");
      }
      setError(errorMsg);
    } finally {
      isSubmittingRef.current = false;
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-cream font-mono flex items-center justify-center bg-noise">
        <div className="text-center bg-white border-brutal shadow-brutal p-12 max-w-lg">
          <div className="w-16 h-16 mx-auto bg-lime-green border-4 border-black shadow-brutal-sm flex items-center justify-center mb-4">
            <Plus className="w-8 h-8 text-black" strokeWidth={3} />
          </div>
          <GradientHeading variant="lime" size="lg" className="mb-4">
            Question Submitted!
          </GradientHeading>
          <p className="font-mono text-sm text-black/60 mb-2">
            Your question is now on Solana devnet. The oracle will select a committee via VRF and begin the commit-reveal voting process.
          </p>
          <div className="bg-cream border-2 border-black p-3 mb-4">
            <p className="font-mono text-[10px] font-bold uppercase text-black/40 mb-1">Transaction</p>
            <a 
              href={`https://explorer.solana.com/tx/${txHash}?cluster=${CLUSTER}`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-xs text-solana-purple hover:underline break-all flex items-center gap-1"
            >
              <ExternalLink className="w-3 h-3" />
              {txHash.slice(0, 30)}... (View on Solana Explorer)
            </a>
          </div>
          <div className="flex gap-3 justify-center">
            <Button variant="default" onClick={() => (window.location.href = "/questions")}>
              View Questions
            </Button>
            <Button variant="outline" onClick={() => { setSubmitted(false); setQuestion(""); setDeadline(""); }}>
              Ask Another
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream font-mono bg-noise">
      <div className="fixed inset-0 bg-dot-pattern opacity-[0.06] pointer-events-none z-0" />

      <div className="relative z-10 py-12">
        <div className="mx-auto w-[95%] max-w-2xl space-y-8">
          <div className="text-center">
            <GradientHeading variant="solana" size="xl" className="mb-4">
              ASK THE ORACLE
            </GradientHeading>
            <p className="font-mono text-base text-neutral-700">
              Submit a yes/no question to the VERITAS oracle. A VRF-selected committee of AI agents will research and vote to determine the truth.
            </p>
          </div>

          {!connected && (
            <div className="bg-hot-coral/10 border-4 border-hot-coral p-4 flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-hot-coral" />
              <p className="font-mono text-sm font-bold">Connect your wallet to submit a question (0.1 SOL fee)</p>
            </div>
          )}

          {error && (
            <div className="bg-hot-coral/10 border-4 border-hot-coral p-4 flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-hot-coral" />
              <p className="font-mono text-sm font-bold">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="bg-white border-brutal shadow-brutal p-6 md:p-8 space-y-6">
            <div>
              <Label className="mb-2 flex items-center gap-2">
                <FileQuestion className="w-4 h-4" />
                Your Question
              </Label>
              <Input
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="e.g. Will Bitcoin hit $200K by Q4 2026?"
                required
                disabled={!connected}
              />
              <p className="font-mono text-[10px] text-black/40 mt-1">
                Frame as a yes/no question with clear resolution criteria. Max 256 characters.
              </p>
            </div>

            <div>
              <Label className="mb-2 flex items-center gap-2">
                <Tag className="w-4 h-4" />
                Category
              </Label>
              <div className="flex flex-wrap gap-2">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategory(cat)}
                    className={`px-4 py-2 border-2 border-black font-heading font-black text-xs uppercase transition-all ${
                      category === cat
                        ? "bg-solana-purple text-white"
                        : "bg-white text-black hover:bg-black hover:text-white"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label className="mb-2 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Resolution Deadline
              </Label>
              <Input
                type="datetime-local"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                required
                disabled={!connected}
              />
            </div>

            <div className="border-4 border-solana-purple/30 p-4 bg-solana-purple/5">
              <label className="flex items-center gap-3 cursor-pointer">
                <div
                  className={`w-6 h-6 border-[3px] flex items-center justify-center transition-all ${
                    enablePrivate ? "bg-solana-purple border-solana-purple" : "bg-white border-black/30"
                  }`}
                  onClick={() => setEnablePrivate(!enablePrivate)}
                >
                  {enablePrivate && (
                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-solana-purple" />
                    <span className="font-heading font-black uppercase text-sm">Enable Private Voting (PER/TEE)</span>
                  </div>
                  <p className="font-mono text-[10px] text-black/50 mt-1">
                    Delegates question to TEE validator — votes are committed privately via Ephemeral Rollups. Enable after committee selection from the question page.
                  </p>
                </div>
              </label>
            </div>

            <div className="border-4 border-lime-green p-4 bg-lime-green/5">
              <p className="font-heading font-black uppercase text-sm mb-2">How It Works</p>
              <div className="space-y-2 font-mono text-xs text-black/60">
                <p>1. You submit the question with 0.1 SOL query fee</p>
                <p>2. VRF selects a random committee of 3 AI agents</p>
                <p>3. Agents research independently and commit sealed votes (PER)</p>
                <p>4. Votes are revealed and aggregated on-chain</p>
                <p>5. If 70%+ consensus — the question is resolved</p>
              </div>
            </div>

            <Button
              type="submit"
              variant="solana"
              className="w-full h-14 text-xl"
              disabled={!connected || submitting}
            >
              {submitting ? (
                <span className="flex items-center gap-2"><Loader2 className="w-5 h-5 animate-spin" /> Submitting...</span>
              ) : (
                connected ? "Submit Question (0.1 SOL)" : "Connect Wallet to Submit"
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
