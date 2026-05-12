import { PublicKey } from "@solana/web3.js";

// === VERITAS Oracle Program ===
export const PROGRAM_ID = new PublicKey("6RE3cPuSF3XVEgLkULMpZi8vaPLdvfhQuB5esLFAQPbf");

// Hardcoded admin for hackathon demo (Bi5iSPW7iPbXKtxHp9DM4sZ6XD8HuAckJJdzDjxLnqwg)
export const ADMIN_WALLET = new PublicKey("Bi5iSPW7iPbXKtxHp9DM4sZ6XD8HuAckJJdzDjxLnqwg");

// === Production Notes: PER/TEE Edge Cases ===
// 1. Legacy questions (created before v2 account format) have 567 bytes instead of 600.
//    They lack teeValidator and isPrivate fields. PER/TEE delegation is disabled for them.
// 2. Improperly delegated questions occur when an account owner changes to the delegation
//    program but status != PrivateVoting. This requires manual undelegation to fix.
// 3. Permission seed MUST include colon: "permission:" (MagicBlock SDK requirement).
//    Using "permission" (without colon) will derive the wrong PDA and fail silently.
// 4. After delegation, standard commit_vote/reveal_vote instructions fail because
//    Anchor checks account owner == program_id. Use private_commit_vote/private_reveal_vote
//    which accept the delegation program as owner.
export const HELIUS_RPC = "https://devnet.helius-rpc.com/?api-key=ac70f146-b68a-48b3-8798-56718958f0a0";
export const CLUSTER = "devnet";

export const VRF_PROGRAM_ID = new PublicKey("Vrf1RNUjXmQGjmQrQLvJHs9SNkvDJEsRVFPkfSQUwGz");
export const DELEGATION_PROGRAM_ID = new PublicKey("DELeGGvXpWV2fqJUhqcF5ZSYMS4JTLjteaAMARRSaeSh");
export const PERMISSION_PROGRAM_ID = new PublicKey("ACLseoPoyC3cBqoUtkbjZ4aDrkurZW86v19pXz2XQnp1");
export const TEE_VALIDATOR = new PublicKey("MTEWGuqxUpYZGFJQcp8tLN7x5v9BSeoFHYWQQ3n3xzo");
export const ER_VALIDATOR = new PublicKey("MAS1Dt9qreoRMQ14YQuhg8UTZMMzDdKhmkZMECCzk57");

export const TEE_RPC_URL = "https://tee.magicblock.app";
export const TEE_WS_URL = "wss://tee.magicblock.app";

// MagicBlock Ephemeral Rollup endpoint for VRF operations
// VRF requests MUST go through this endpoint, not regular Solana devnet
export const MAGICBLOCK_ER_RPC = "https://devnet-as.magicblock.app";
export const MAGICBLOCK_ER_WS = "wss://devnet-as.magicblock.app";

export const CONFIG_SEED = Buffer.from("config");
export const QUESTION_SEED = Buffer.from("question");
export const AGENT_SEED = Buffer.from("agent");
export const VOTE_COMMIT_SEED = Buffer.from("vote_commit");
export const VOTE_REVEAL_SEED = Buffer.from("vote_reveal");
export const HUMAN_SEED = Buffer.from("human");
export const AGENT_REGISTRY_SEED = Buffer.from("agent_registry");
// IMPORTANT: MagicBlock SDK uses "permission:" (with colon) as the seed
export const PERMISSION_SEED = Buffer.from("permission:");

export async function findConfigPda(): Promise<PublicKey> {
  return PublicKey.findProgramAddressSync([CONFIG_SEED], PROGRAM_ID)[0];
}

export async function findAgentRegistryPda(): Promise<PublicKey> {
  return PublicKey.findProgramAddressSync([AGENT_REGISTRY_SEED], PROGRAM_ID)[0];
}

export async function findQuestionPda(questionId: number): Promise<PublicKey> {
  return PublicKey.findProgramAddressSync(
    [QUESTION_SEED, Buffer.from(new BigUint64Array([BigInt(questionId)]).buffer)],
    PROGRAM_ID
  )[0];
}

export async function findAgentPda(wallet: PublicKey): Promise<PublicKey> {
  return PublicKey.findProgramAddressSync([AGENT_SEED, wallet.toBuffer()], PROGRAM_ID)[0];
}

export async function findVoteCommitPda(question: PublicKey, agentWallet: PublicKey): Promise<PublicKey> {
  return PublicKey.findProgramAddressSync(
    [VOTE_COMMIT_SEED, question.toBuffer(), agentWallet.toBuffer()],
    PROGRAM_ID
  )[0];
}

export async function findVoteRevealPda(question: PublicKey, agentWallet: PublicKey): Promise<PublicKey> {
  return PublicKey.findProgramAddressSync(
    [VOTE_REVEAL_SEED, question.toBuffer(), agentWallet.toBuffer()],
    PROGRAM_ID
  )[0];
}

export async function findHumanAttestationPda(wallet: PublicKey): Promise<PublicKey> {
  return PublicKey.findProgramAddressSync([HUMAN_SEED, wallet.toBuffer()], PROGRAM_ID)[0];
}

export const QuestionStatus = {
  Pending: 0,
  CommitteeSelected: 1,
  CommitPhase: 2,
  RevealPhase: 3,
  DiscussionPhase: 4,
  Resolved: 5,
  PrivateVoting: 6,
} as const;

export const Vote = {
  Yes: 0,
  No: 1,
  Unsure: 2,
} as const;

// Known agent keypairs for demo/hackathon (fallback when on-chain registry doesn't have them)
export const KNOWN_AGENTS: Record<string, { name: string; color: string }> = {
  "45ZRaVaPtMTuQjZPUnVP3L9rHAV7g4ZgbzPDePYpoLXJ": { name: "Oracle Alpha", color: "#A7F3D0" },
  "EyLoSArbjG1dZgwtwK8X13x4YZw8LZ36KHM8cs13XdXR": { name: "Skeptic Beta", color: "#FF6B6B" },
  "2c6xz6Uk5zczG4QbgzB1cVjRvZjeFmemL4taQ82vrnvD": { name: "Signal Gamma", color: "#FFD700" },
  "ByanixcaRCn8UY2z2ZjVSaEjc6yREpfkdh3RU3yRkb3k": { name: "Risk Delta", color: "#FEF7CD" },
  "5C9KWNurRh6sVmqSfPcfTXaEs5kZdAkyAYRB4tYDbmiw": { name: "Synthesis Epsilon", color: "#9945FF" },
};

export const AGENT_COLORS: Record<string, string> = {
  "Oracle Alpha": "#A7F3D0",
  "Skeptic Beta": "#FF6B6B",
  "Signal Gamma": "#FFD700",
  "Risk Delta": "#FEF7CD",
  "Synthesis Epsilon": "#9945FF",
};

export function getStatusLabel(status: number): string {
  const labels = ["Pending", "Committee Selected", "Commit Phase", "Reveal Phase", "Discussion", "Resolved", "Private Voting"];
  return labels[status] || "Unknown";
}

export function getVoteLabel(vote: number): string {
  const labels = ["YES", "NO", "UNSURE"];
  return labels[vote] || "Unknown";
}

export function findPermissionPda(accountPda: PublicKey): PublicKey {
  const [permissionPda] = PublicKey.findProgramAddressSync(
    [PERMISSION_SEED, accountPda.toBuffer()],
    PERMISSION_PROGRAM_ID
  );
  return permissionPda;
}
