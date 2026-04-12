"use client";

import React, { useState } from "react";
import { Plus, Calendar, DollarSign, Tag, FileQuestion, Brain } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GradientHeading } from "@/components/ui/gradient-heading";
import { useDivePrograms } from "@/lib/anchor";
import { useWallet } from "@solana/wallet-adapter-react";
import { BN } from "@coral-xyz/anchor";

import { PublicKey } from "@solana/web3.js";

const TOKEN_2022_PROGRAM_ID = new PublicKey("TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb");

export default function CreateMarketPage() {
  const { diveMarket } = useDivePrograms();
  const { publicKey } = useWallet();

  const [question, setQuestion] = useState("");
  const [deadline, setDeadline] = useState("");
  const [bondAmount, setBondAmount] = useState("1");
  const [category, setCategory] = useState("Crypto");
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const categories = ["Crypto", "Sports", "Policy", "Science", "Tech", "Culture"];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!publicKey) {
      alert("Please connect your wallet first.");
      return;
    }
    if (!diveMarket) return;

    try {
      setIsSubmitting(true);

      // Create a deterministic hash for the question
      const encoder = new TextEncoder();
      const questionBytes = encoder.encode(question);
      const hashBuffer = await crypto.subtle.digest('SHA-256', questionBytes);
      const questionHash = Array.from(new Uint8Array(hashBuffer));
      
      const deadlineTs = new BN(new Date(deadline).getTime() / 1000);
      const bond = new BN(parseFloat(bondAmount) * 1e9);
      
      const oracleAuthority = publicKey; // For demo, deployer acts as oracle auth

      const tx = await diveMarket.methods.initializeMarket(
        questionHash,
        question,
        ["YES", "NO"],
        deadlineTs,
        bond,
        oracleAuthority
      ).accounts({
        authority: publicKey,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
      }).rpc();

      console.log("Market created with tx:", tx);
      setSubmitted(true);
    } catch (err: any) {
      console.error(err);
      alert("Failed to create market: " + err.message);
    } finally {
      setIsSubmitting(false);
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
            Market Created!
          </GradientHeading>
          <p className="font-mono text-sm text-black/60 mb-2">
            Your market is now live on Solana. YES/NO SPL tokens have been minted and the PDA is delegated to ER for zero-fee trading.
          </p>
          <p className="font-mono text-xs text-black/40 mb-6">
            Market ID: {question.slice(0, 20).toLowerCase().replace(/\s+/g, "-")}
          </p>
          <div className="flex gap-3 justify-center">
            <Button variant="default" onClick={() => (window.location.href = "/markets")}>
              View Markets
            </Button>
            <Button variant="outline" onClick={() => setSubmitted(false)}>
              Create Another
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
              CREATE A MARKET
            </GradientHeading>
            <p className="font-mono text-base text-neutral-700">
              Deploy a prediction market on Solana. YES/NO tokens minted via SPL. Market PDA delegated to MagicBlock ER.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="bg-white border-brutal shadow-brutal p-6 md:p-8 space-y-6">
            {/* Question */}
            <div>
              <Label className="mb-2 flex items-center gap-2">
                <FileQuestion className="w-4 h-4" />
                Market Question
              </Label>
              <Input
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="e.g. Will Bitcoin hit $200K by Q4 2026?"
                required
              />
              <p className="font-mono text-[10px] text-black/40 mt-1">
                Frame as a yes/no question with a clear resolution criteria.
              </p>
            </div>

            {/* Category */}
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

            {/* Deadline */}
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
              />
            </div>

            {/* Bond Amount */}
            <div>
              <Label className="mb-2 flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                Dispute Bond (SOL)
              </Label>
              <Input
                type="number"
                step="0.1"
                min="0.1"
                value={bondAmount}
                onChange={(e) => setBondAmount(e.target.value)}
                placeholder="1.0"
                required
              />
              <p className="font-mono text-[10px] text-black/40 mt-1">
                Bond required to dispute a resolution. Discourages spam challenges.
              </p>
            </div>

            {/* Outcomes Info */}
            <div className="border-4 border-lime-green p-4 bg-lime-green/5">
              <p className="font-heading font-black uppercase text-sm mb-2">Binary Outcomes</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="border-2 border-lime-green p-2 text-center">
                  <span className="font-heading font-black text-lime-green">YES</span>
                </div>
                <div className="border-2 border-hot-coral p-2 text-center">
                  <span className="font-heading font-black text-hot-coral">NO</span>
                </div>
              </div>
              <p className="font-mono text-[10px] text-black/40 mt-2">
                SPL Token-2022 YES/NO tokens are minted automatically upon market creation.
              </p>
            </div>

            <Button type="submit" disabled={isSubmitting} variant="solana" className="w-full h-14 text-xl">
              {isSubmitting ? <Brain className="animate-spin mr-2" /> : null}
              Deploy Market on Solana
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
