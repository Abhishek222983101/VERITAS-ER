"use client";

import React, { createContext, useContext, useMemo, useCallback } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { Program, AnchorProvider, BN } from "@coral-xyz/anchor";
import { Connection, PublicKey, SystemProgram, Transaction, TransactionInstruction } from "@solana/web3.js";
import IDL_JSON from "@/lib/idl.json";
import type { VeritasOracle } from "@/lib/veritas-oracle-types";
import { PROGRAM_ID, TEE_VALIDATOR, PERMISSION_PROGRAM_ID, DELEGATION_PROGRAM_ID, ADMIN_WALLET } from "@/lib/constants";

const IDL = IDL_JSON as VeritasOracle;

function bnToU64LE(bn: any): Buffer {
  const num = BigInt(bn.toString?.() || bn);
  const buf = Buffer.alloc(8);
  let n = num;
  for (let i = 0; i < 8; i++) {
    buf[i] = Number(n & BigInt(0xFF));
    n = n >> BigInt(8);
  }
  return buf;
}

interface AnchorContextType {
  program: Program<VeritasOracle> | null;
  provider: AnchorProvider | null;
  connected: boolean;
  publicKey: PublicKey | null;
  submitQuestion: (questionText: string, category: string, deadline: number) => Promise<string>;
  registerAgent: (name: string) => Promise<string>;
  verifyHuman: (reclaimProofHash: number[], providerHash: number[]) => Promise<string>;
  selectCommittee: (questionId: number) => Promise<string>;
  isAdmin: () => Promise<boolean>;
  fetchConfig: () => Promise<any>;
  fetchAgentRegistry: () => Promise<any>;
  fetchQuestion: (questionId: number) => Promise<any>;
  fetchAgent: (wallet: PublicKey) => Promise<any>;
  fetchAllQuestions: (count: number) => Promise<any[]>;
  fetchHumanAttestation: (wallet: PublicKey) => Promise<any>;
  enablePrivateVoting: (questionId: number) => Promise<string>;
  adminSetCommittee: (questionId: number, committee: PublicKey[]) => Promise<string>;
  updateQuestionStatus: (questionId: number, newStatus: any) => Promise<string>;
  resolveQuestion: (questionId: number) => Promise<string>;
}

const AnchorContext = createContext<AnchorContextType>({
  program: null,
  provider: null,
  connected: false,
  publicKey: null,
  submitQuestion: async () => "",
  registerAgent: async () => "",
  verifyHuman: async () => "",
  selectCommittee: async () => "",
  isAdmin: async () => false,
  fetchConfig: async () => null,
  fetchAgentRegistry: async () => null,
  fetchQuestion: async () => null,
  fetchAgent: async () => null,
  fetchAllQuestions: async () => [],
  fetchHumanAttestation: async () => null,
  enablePrivateVoting: async () => "",
  adminSetCommittee: async () => "",
  updateQuestionStatus: async () => "",
  resolveQuestion: async () => "",
});

export function useAnchor() {
  return useContext(AnchorContext);
}

export function AnchorProviderWrapper({ children }: { children: React.ReactNode }) {
  const { connection } = useConnection();
  const walletAdapter = useWallet();

  const provider = useMemo(() => {
    if (!walletAdapter.connected || !walletAdapter.publicKey) return null;
    const anchorProvider = new AnchorProvider(connection, walletAdapter as any, {
      commitment: "confirmed",
    });
    return anchorProvider;
  }, [connection, walletAdapter.connected, walletAdapter.publicKey]);

  const program = useMemo(() => {
    if (!provider) return null;
    return new Program<VeritasOracle>(IDL, provider as any);
  }, [provider]);

  const readOnlyProgram = useMemo(() => {
    return new Program(IDL, { connection } as any) as any;
  }, [connection]);

  const fetchConfig = useCallback(async () => {
    const configPda = PublicKey.findProgramAddressSync([Buffer.from("config")], PROGRAM_ID)[0];
    try {
      return await readOnlyProgram.account.config.fetch(configPda);
    } catch {
      return null;
    }
  }, [readOnlyProgram]);

  const fetchAgentRegistry = useCallback(async () => {
    const registryPda = PublicKey.findProgramAddressSync([Buffer.from("agent_registry")], PROGRAM_ID)[0];
    try {
      return await readOnlyProgram.account.agentRegistry.fetch(registryPda);
    } catch {
      return null;
    }
  }, [readOnlyProgram]);

  const fetchQuestion = useCallback(async (questionId: number) => {
    try {
      const questionIdBuf = bnToU64LE(BigInt(questionId));
      const questionPda = PublicKey.findProgramAddressSync(
        [Buffer.from("question"), questionIdBuf],
        PROGRAM_ID
      )[0];
      return await readOnlyProgram.account.question.fetch(questionPda);
    } catch {
      return null;
    }
  }, [readOnlyProgram]);

  const fetchAgent = useCallback(async (agentWallet: PublicKey) => {
    try {
      const agentPda = PublicKey.findProgramAddressSync(
        [Buffer.from("agent"), agentWallet.toBuffer()],
        PROGRAM_ID
      )[0];
      return await readOnlyProgram.account.agent.fetch(agentPda);
    } catch {
      return null;
    }
  }, [readOnlyProgram]);

  const fetchAllQuestions = useCallback(async (count: number) => {
    const questions = [];
    for (let i = 0; i < count; i++) {
      try {
        const questionIdBuf = bnToU64LE(BigInt(i));
        const questionPda = PublicKey.findProgramAddressSync(
          [Buffer.from("question"), questionIdBuf],
          PROGRAM_ID
        )[0];
        const q = await readOnlyProgram.account.question.fetch(questionPda);
        questions.push({ ...q, questionId: i, pda: questionPda });
      } catch {
        break;
      }
    }
    return questions;
  }, [readOnlyProgram]);

  const fetchHumanAttestation = useCallback(async (walletPk: PublicKey) => {
    try {
      const pda = PublicKey.findProgramAddressSync(
        [Buffer.from("human"), walletPk.toBuffer()],
        PROGRAM_ID
      )[0];
      return await readOnlyProgram.account.humanAttestation.fetch(pda);
    } catch {
      return null;
    }
  }, [readOnlyProgram]);

  const sendTransaction = useCallback(async (
    ix: TransactionInstruction,
    opts?: { maxRetries?: number; label?: string }
  ): Promise<string> => {
    if (!walletAdapter.publicKey || !walletAdapter.sendTransaction) {
      throw new Error("Wallet not connected");
    }

    const maxRetries = opts?.maxRetries ?? 2;
    const label = opts?.label ?? "TX";
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");

        const tx = new Transaction();
        tx.recentBlockhash = blockhash;
        tx.feePayer = walletAdapter.publicKey!;
        tx.add(ix);

        const signature = await walletAdapter.sendTransaction(tx, connection, {
          skipPreflight: true,
        });

        const confirmation = await connection.confirmTransaction(
          { signature, blockhash, lastValidBlockHeight },
          "confirmed"
        );

        if (confirmation.value.err) {
          throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
        }

        return signature;
      } catch (err: any) {
        lastError = err;
        console.error(`[${label}] Attempt ${attempt} failed:`, err.message || err);
        
        if (attempt < maxRetries) {
          const delay = 1000 * attempt;
          console.log(`[${label}] Retrying in ${delay}ms...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    throw new Error(
      `[${label}] Failed after ${maxRetries} attempts. Last error: ${lastError?.message || "Unknown"}`
    );
  }, [walletAdapter, connection]);

  const submitQuestion = useCallback(async (questionText: string, category: string, deadline: number) => {
    if (!program) throw new Error("Program not initialized");

    // Force a fresh config fetch with no cache
    const configPda = PublicKey.findProgramAddressSync([Buffer.from("config")], PROGRAM_ID)[0];
    const config = await readOnlyProgram.account.config.fetch(configPda);
    const treasury = config.treasury as PublicKey;

    const questionPda = PublicKey.findProgramAddressSync(
      [Buffer.from("question"), bnToU64LE(config.questionCounter)],
      PROGRAM_ID
    )[0];

    const ix = await program.methods
      .submitQuestion(questionText, category, new BN(deadline))
      .accounts({
        question: questionPda,
        asker: walletAdapter.publicKey!,
        config: configPda,
        treasury: treasury,
        systemProgram: SystemProgram.programId,
      } as any)
      .instruction();

    return sendTransaction(ix, { maxRetries: 2, label: "SubmitQuestion" });
  }, [program, walletAdapter.publicKey, sendTransaction, connection]);

  const registerAgent = useCallback(async (_name: string): Promise<string> => {
    // TODO: Implement registerAgent with proper bonding and name validation
    throw new Error("registerAgent not yet implemented");
  }, [program, walletAdapter.publicKey, sendTransaction]);

  const verifyHuman = useCallback(async (reclaimProofHash: number[], providerHash: number[]) => {
    if (!program || !walletAdapter.publicKey) throw new Error("Wallet not connected");

    const attestationPda = PublicKey.findProgramAddressSync(
      [Buffer.from("human"), walletAdapter.publicKey.toBuffer()],
      PROGRAM_ID
    )[0];

    const ix = await program.methods
      .verifyHuman(reclaimProofHash, providerHash)
      .accounts({
        attestation: attestationPda,
        wallet: walletAdapter.publicKey,
        systemProgram: SystemProgram.programId,
      } as any)
      .instruction();

    return sendTransaction(ix);
  }, [program, walletAdapter.publicKey, sendTransaction]);

  const isAdmin = useCallback(async (): Promise<boolean> => {
    if (!walletAdapter.publicKey) {
      console.log("Admin check: no wallet connected");
      return false;
    }
    
    // Hardcoded admin check for hackathon demo
    const hardcodedMatch = walletAdapter.publicKey.equals(ADMIN_WALLET);
    console.log("Admin check (hardcoded):", {
      connected: walletAdapter.publicKey.toBase58(),
      hardcodedAdmin: ADMIN_WALLET.toBase58(),
      hardcodedMatch
    });
    
    if (hardcodedMatch) return true;
    
    // Fallback: check on-chain config
    try {
      console.log("Admin check: fetching config for verification...");
      const config = await fetchConfig();
      if (!config || !config.admin) {
        console.log("Admin check: config missing or no admin field");
        return false;
      }
      const adminKey = new PublicKey(config.admin);
      const isMatch = adminKey.equals(walletAdapter.publicKey);
      console.log("Admin check (on-chain):", {
        connected: walletAdapter.publicKey.toBase58(),
        configAdmin: adminKey.toBase58(),
        isMatch
      });
      return isMatch;
    } catch (err: any) {
      console.error("Admin check error:", err.message);
      return false;
    }
  }, [walletAdapter.publicKey, fetchConfig]);

  const selectCommittee = useCallback(async (questionId: number): Promise<string> => {
    if (!program || !walletAdapter.publicKey) throw new Error("Wallet not connected");

    const questionIdBuf = bnToU64LE(BigInt(questionId));
    const questionPda = PublicKey.findProgramAddressSync(
      [Buffer.from("question"), questionIdBuf],
      PROGRAM_ID
    )[0];

    const agentRegistryPda = PublicKey.findProgramAddressSync([Buffer.from("agent_registry")], PROGRAM_ID)[0];

    console.log("Selecting committee using on-chain entropy (slot hashes)...");
    
    // Use select_committee_simple which uses slot hashes for verifiable randomness
    const ix = await program.methods
      .selectCommitteeSimple()
      .accounts({
        payer: walletAdapter.publicKey,
        question: questionPda,
        agentRegistry: agentRegistryPda,
        slotHashes: new PublicKey("SysvarS1otHashes111111111111111111111111111"),
      } as any)
      .instruction();
    
    const signature = await sendTransaction(ix, { maxRetries: 2, label: "SelectCommittee" });
    
    console.log("Committee selected:", signature);
    console.log("Using on-chain slot hash entropy - verifiable and transparent");
    
    return signature;
  }, [program, walletAdapter.publicKey, sendTransaction]);

  const enablePrivateVoting = useCallback(async (questionId: number) => {
    if (!program || !walletAdapter.publicKey) throw new Error("Wallet not connected");

    const questionIdBuf = bnToU64LE(BigInt(questionId));
    const questionPda = PublicKey.findProgramAddressSync(
      [Buffer.from("question"), questionIdBuf],
      PROGRAM_ID
    )[0];

    // Pre-flight validation
    try {
      const acc = await connection.getAccountInfo(questionPda);
      if (!acc) {
        throw new Error(`Question account ${questionPda.toBase58()} not found`);
      }

      if (!acc.owner.equals(PROGRAM_ID)) {
        if (acc.owner.equals(DELEGATION_PROGRAM_ID)) {
          throw new Error("This question is already delegated to the TEE validator");
        } else {
          throw new Error(`Unexpected account owner: ${acc.owner.toBase58()}`);
        }
      }

      const questionAccount = await readOnlyProgram.account.question.fetch(questionPda);
      if (!questionAccount) {
        throw new Error("Failed to fetch question account via Anchor");
      }

      const s: any = questionAccount.status;
      const statusNum = s.pending !== undefined ? 0
        : s.committeeSelected !== undefined ? 1
        : s.commitPhase !== undefined ? 2
        : s.revealPhase !== undefined ? 3
        : s.discussionPhase !== undefined ? 4
        : s.resolved !== undefined ? 5
        : s.privateVoting !== undefined ? 6
        : 0;

      const validStatuses = [1, 2];
      if (!validStatuses.includes(statusNum)) {
        const statusLabels = ["Pending", "CommitteeSelected", "CommitPhase", "RevealPhase", "Discussion", "Resolved", "PrivateVoting"];
        throw new Error(
          `Invalid question status for PER/TEE: ${statusLabels[statusNum] || "Unknown"} (code ${statusNum}). Required: CommitteeSelected or CommitPhase`
        );
      }
    } catch (err: any) {
      if (err.message?.includes("already delegated") || err.message?.includes("Invalid question status")) {
        throw err;
      }
      throw new Error(`Pre-flight validation failed: ${err.message || "Unknown error"}`);
    }

    // Let Anchor auto-resolve all PDA accounts from the IDL spec
    // The IDL defines all PDA seeds for buffer_question, record_question,
    // metadata_question, permission, buffer_permission, record_permission,
    // metadata_permission — Anchor will derive them correctly
    const ix = await program.methods
      .enablePrivateVoting()
      .accounts({
        payer: walletAdapter.publicKey,
        question: questionPda,
        validator: TEE_VALIDATOR,
      } as any)
      .instruction();

    return sendTransaction(ix);
  }, [program, walletAdapter.publicKey, sendTransaction, readOnlyProgram, connection]);

  const adminSetCommittee = useCallback(async (questionId: number, committee: PublicKey[]) => {
    if (!program || !walletAdapter.publicKey) throw new Error("Wallet not connected");
    const isAdminUser = await isAdmin();
    if (!isAdminUser) throw new Error("Only admin can set committee");

    const questionIdBuf = bnToU64LE(BigInt(questionId));
    const [questionPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("question"), questionIdBuf],
      PROGRAM_ID
    );

    const ix = await program.methods
      .adminSetCommittee(committee)
      .accounts({
        question: questionPda,
        admin: walletAdapter.publicKey,
      } as any)
      .instruction();

    return sendTransaction(ix);
  }, [program, walletAdapter.publicKey, sendTransaction, isAdmin]);

  const updateQuestionStatus = useCallback(async (questionId: number, newStatus: any) => {
    if (!program || !walletAdapter.publicKey) throw new Error("Wallet not connected");

    const questionIdBuf = bnToU64LE(BigInt(questionId));
    const [questionPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("question"), questionIdBuf],
      PROGRAM_ID
    );

    const ix = await program.methods
      .updateQuestionStatus(newStatus)
      .accounts({
        question: questionPda,
        admin: walletAdapter.publicKey,
      } as any)
      .instruction();

    return sendTransaction(ix, { maxRetries: 2, label: "UpdateStatus" });
  }, [program, walletAdapter.publicKey, sendTransaction]);

  const resolveQuestion = useCallback(async (questionId: number) => {
    if (!program || !walletAdapter.publicKey) throw new Error("Wallet not connected");

    const questionIdBuf = bnToU64LE(BigInt(questionId));
    const [questionPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("question"), questionIdBuf],
      PROGRAM_ID
    );

    const ix = await program.methods
      .resolveQuestion()
      .accounts({
        question: questionPda,
      } as any)
      .instruction();

    return sendTransaction(ix, { maxRetries: 2, label: "ResolveQuestion" });
  }, [program, walletAdapter.publicKey, sendTransaction]);

  const value = useMemo(
    () => ({
      program,
      provider,
      connected: walletAdapter.connected && !!walletAdapter.publicKey,
      publicKey: walletAdapter.publicKey,
      submitQuestion,
      registerAgent,
      verifyHuman,
      selectCommittee,
      isAdmin,
      fetchConfig,
      fetchAgentRegistry,
      fetchQuestion,
      fetchAgent,
      fetchAllQuestions,
      fetchHumanAttestation,
      enablePrivateVoting,
      adminSetCommittee,
      updateQuestionStatus,
      resolveQuestion,
    }),
    [program, provider, walletAdapter.connected, walletAdapter.publicKey, submitQuestion, registerAgent, verifyHuman, selectCommittee, isAdmin, fetchConfig, fetchAgentRegistry, fetchQuestion, fetchAgent, fetchAllQuestions, fetchHumanAttestation, enablePrivateVoting, adminSetCommittee, updateQuestionStatus, resolveQuestion]
  );

  return <AnchorContext.Provider value={value}>{children}</AnchorContext.Provider>;
}
