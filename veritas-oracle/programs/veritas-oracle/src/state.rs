use anchor_lang::prelude::*;
use ephemeral_rollups_sdk::anchor::{commit, delegate};
use ephemeral_rollups_sdk::consts::PERMISSION_PROGRAM_ID;

use crate::*;

// === ENUMS ===

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Debug)]
pub enum QuestionStatus {
    Pending,
    CommitteeSelected,
    CommitPhase,
    RevealPhase,
    DiscussionPhase,
    Resolved,
    PrivateVoting,
}

impl QuestionStatus {
    pub fn can_transition_to(&self, next: &QuestionStatus) -> bool {
        matches!(
            (self, next),
            (QuestionStatus::Pending, QuestionStatus::CommitteeSelected)
                | (
                    QuestionStatus::CommitteeSelected,
                    QuestionStatus::CommitPhase
                )
                | (
                    QuestionStatus::CommitteeSelected,
                    QuestionStatus::PrivateVoting
                )
                | (QuestionStatus::CommitPhase, QuestionStatus::RevealPhase)
                | (QuestionStatus::CommitPhase, QuestionStatus::PrivateVoting)
                | (QuestionStatus::PrivateVoting, QuestionStatus::RevealPhase)
                | (QuestionStatus::RevealPhase, QuestionStatus::DiscussionPhase)
                | (QuestionStatus::RevealPhase, QuestionStatus::Resolved)
                | (QuestionStatus::DiscussionPhase, QuestionStatus::CommitPhase)
                | (QuestionStatus::DiscussionPhase, QuestionStatus::Resolved)
        )
    }
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Debug)]
pub enum Vote {
    Yes,
    No,
    Unsure,
}

// === ACCOUNT STRUCTS ===

#[account]
pub struct Config {
    pub admin: Pubkey,
    pub treasury: Pubkey,
    pub default_query_fee: u64,
    pub committee_size: u8,
    pub consensus_threshold: u8,
    pub agent_bond_amount: u64,
    pub correct_reward: u64,
    pub wrong_penalty: u64,
    pub vrf_queue: Pubkey,
    pub question_counter: u64,
    pub bump: u8,
}

impl Config {
    pub const SPACE: usize = 8 + 32 + 32 + 8 + 1 + 1 + 8 + 8 + 8 + 32 + 8 + 1;
}

#[account]
pub struct Question {
    pub authority: Pubkey,
    pub question_text: String,
    pub category: String,
    pub deadline: i64,
    pub query_fee: u64,
    pub status: QuestionStatus,
    pub committee: [Pubkey; 3],
    pub yes_votes: u64,
    pub no_votes: u64,
    pub unsure_votes: u64,
    pub result: Option<Vote>,
    pub confidence: u8,
    pub encrypted_result: [u8; 64],
    pub created_at: i64,
    pub resolved_at: i64,
    pub question_id: u64,
    pub consensus_threshold: u8,
    pub tee_validator: Pubkey,
    pub is_private: bool,
    pub bump: u8,
}

impl Question {
    pub const SPACE: usize = 8
        + 32
        + (4 + 256)
        + (4 + 32)
        + 8
        + 8
        + 2
        + 96
        + 8
        + 8
        + 8
        + 2
        + 1
        + 64
        + 8
        + 8
        + 8
        + 1
        + 32
        + 1
        + 1;
}

#[account]
pub struct Agent {
    pub wallet: Pubkey,
    pub name: String,
    pub personality_hash: [u8; 32],
    pub reputation: u64,
    pub is_active: bool,
    pub bond_amount: u64,
    pub total_votes: u64,
    pub correct_votes: u64,
    pub metaplex_nft: Pubkey,
    pub sas_attestation: Pubkey,
    pub created_at: i64,
    pub bump: u8,
}

impl Agent {
    pub const SPACE: usize = 8 + 32 + (4 + 32) + 32 + 8 + 1 + 8 + 8 + 8 + 32 + 32 + 8 + 1;
}

#[account]
pub struct VoteCommit {
    pub question: Pubkey,
    pub agent: Pubkey,
    pub round: u8,
    pub commit_hash: [u8; 32],
    pub committed_at: i64,
    pub revealed: bool,
    pub bump: u8,
}

impl VoteCommit {
    pub const SPACE: usize = 8 + 32 + 32 + 1 + 32 + 8 + 1 + 1;
}

#[account]
pub struct VoteReveal {
    pub question: Pubkey,
    pub agent: Pubkey,
    pub round: u8,
    pub vote: u8,
    pub salt: [u8; 16],
    pub confidence: u8,
    pub evidence_hash: [u8; 32],
    pub reasoning_hash: [u8; 32],
    pub revealed_at: i64,
    pub bump: u8,
}

impl VoteReveal {
    pub const SPACE: usize = 8 + 32 + 32 + 1 + 1 + 16 + 1 + 32 + 32 + 8 + 1;
}

#[account]
pub struct HumanAttestation {
    pub wallet: Pubkey,
    pub reclaim_proof_hash: [u8; 32],
    pub provider_hash: [u8; 32],
    pub verified_at: i64,
    pub expires_at: i64,
    pub bump: u8,
}

impl HumanAttestation {
    pub const SPACE: usize = 8 + 32 + 32 + 32 + 8 + 8 + 1;
}

#[account]
pub struct AgentRegistry {
    pub agents: [Pubkey; 20],
    pub reputations: [u64; 20],
    pub count: u8,
    pub bump: u8,
}

impl AgentRegistry {
    pub const SPACE: usize = 8 + (20 * 32) + (20 * 8) + 1 + 1;
}

// === CONTEXT STRUCTS (non-macro) ===

#[derive(Accounts)]
pub struct InitConfig<'info> {
    #[account(
        init,
        payer = admin,
        space = Config::SPACE,
        seeds = [CONFIG_SEED],
        bump,
    )]
    pub config: Account<'info, Config>,
    #[account(mut)]
    pub admin: Signer<'info>,
    /// CHECK: treasury receives fees
    #[account(mut)]
    pub treasury: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct InitAgentRegistry<'info> {
    #[account(
        init,
        payer = admin,
        space = AgentRegistry::SPACE,
        seeds = [AGENT_REGISTRY_SEED],
        bump,
    )]
    pub agent_registry: Account<'info, AgentRegistry>,
    #[account(mut)]
    pub admin: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RegisterAgent<'info> {
    #[account(
        init,
        payer = wallet,
        space = Agent::SPACE,
        seeds = [AGENT_SEED, wallet.key().as_ref()],
        bump,
    )]
    pub agent: Account<'info, Agent>,
    #[account(mut)]
    pub wallet: Signer<'info>,
    #[account(mut)]
    pub config: Account<'info, Config>,
    #[account(mut, seeds = [AGENT_REGISTRY_SEED], bump)]
    pub agent_registry: Account<'info, AgentRegistry>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SubmitQuestion<'info> {
    #[account(
        init,
        payer = asker,
        space = Question::SPACE,
        seeds = [QUESTION_SEED, config.question_counter.to_le_bytes().as_ref()],
        bump,
    )]
    pub question: Account<'info, Question>,
    #[account(mut)]
    pub asker: Signer<'info>,
    #[account(mut)]
    pub config: Account<'info, Config>,
    /// CHECK: treasury receives query fee
    #[account(mut)]
    pub treasury: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdateQuestionStatus<'info> {
    #[account(mut)]
    pub question: Account<'info, Question>,
    #[account(mut)]
    pub admin: Signer<'info>,
}

#[delegate]
#[derive(Accounts)]
pub struct DelegateQuestion<'info> {
    pub payer: Signer<'info>,
    /// CHECK: question PDA to delegate
    #[account(mut, del)]
    pub pda: AccountInfo<'info>,
}

#[delegate]
#[derive(Accounts)]
pub struct DelegateAgent<'info> {
    pub payer: Signer<'info>,
    /// CHECK: agent PDA to delegate
    #[account(mut, del)]
    pub pda: AccountInfo<'info>,
}

#[commit]
#[derive(Accounts)]
pub struct CommitAndUndelegateQuestion<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(mut)]
    pub question: Account<'info, Question>,
    /// CHECK: magic context
    pub magic_context: AccountInfo<'info>,
    /// CHECK: magic program
    pub magic_program: AccountInfo<'info>,
}

#[commit]
#[derive(Accounts)]
pub struct CommitAndUndelegateAgent<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(mut)]
    pub agent: Account<'info, Agent>,
    /// CHECK: magic context
    pub magic_context: AccountInfo<'info>,
    /// CHECK: magic program
    pub magic_program: AccountInfo<'info>,
}

#[derive(Accounts)]
pub struct SelectCommitteeSimple<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(mut)]
    pub question: Account<'info, Question>,
    #[account(seeds = [AGENT_REGISTRY_SEED], bump)]
    pub agent_registry: Account<'info, AgentRegistry>,
    /// CHECK: Slot hashes sysvar for on-chain entropy
    pub slot_hashes: AccountInfo<'info>,
}

#[derive(Accounts)]
pub struct VrfCallback<'info> {
    #[account(address = ephemeral_vrf_sdk::consts::VRF_PROGRAM_IDENTITY)]
    pub vrf_program_identity: Signer<'info>,
    #[account(mut)]
    pub question: Account<'info, Question>,
    pub agent_registry: Account<'info, AgentRegistry>,
}

#[derive(Accounts)]
pub struct CommitVote<'info> {
    #[account(mut)]
    pub question: Account<'info, Question>,
    #[account(
        init,
        payer = agent_wallet,
        space = VoteCommit::SPACE,
        seeds = [VOTE_COMMIT_SEED, question.key().as_ref(), agent_wallet.key().as_ref()],
        bump,
    )]
    pub vote_commit: Account<'info, VoteCommit>,
    #[account(mut)]
    pub agent_wallet: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RevealVote<'info> {
    #[account(mut)]
    pub question: Account<'info, Question>,
    #[account(mut)]
    pub vote_commit: Account<'info, VoteCommit>,
    #[account(
        init,
        payer = agent_wallet,
        space = VoteReveal::SPACE,
        seeds = [VOTE_REVEAL_SEED, question.key().as_ref(), agent_wallet.key().as_ref()],
        bump,
    )]
    pub vote_reveal: Account<'info, VoteReveal>,
    #[account(mut)]
    pub agent_wallet: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ResolveQuestion<'info> {
    #[account(mut)]
    pub question: Account<'info, Question>,
}

#[derive(Accounts)]
pub struct UpdateReputation<'info> {
    #[account(mut)]
    pub agent: Account<'info, Agent>,
    #[account(mut)]
    pub admin: Signer<'info>,
    #[account(mut, seeds = [AGENT_REGISTRY_SEED], bump)]
    pub agent_registry: Account<'info, AgentRegistry>,
}

#[derive(Accounts)]
pub struct ClaimReward<'info> {
    #[account(mut)]
    pub question: Account<'info, Question>,
    #[account(mut)]
    pub agent: Account<'info, Agent>,
    /// CHECK: treasury pays reward
    #[account(mut)]
    pub treasury: AccountInfo<'info>,
    #[account(mut)]
    pub agent_wallet: Signer<'info>,
}

#[derive(Accounts)]
pub struct VerifyHuman<'info> {
    #[account(
        init,
        payer = wallet,
        space = HumanAttestation::SPACE,
        seeds = [HUMAN_SEED, wallet.key().as_ref()],
        bump,
    )]
    pub attestation: Account<'info, HumanAttestation>,
    #[account(mut)]
    pub wallet: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CreateQuestionPermission<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(mut)]
    pub question: Account<'info, Question>,
    /// CHECK: Permission PDA - validated by permission program
    #[account(mut)]
    pub permission: AccountInfo<'info>,
    /// CHECK: Permission program
    #[account(address = PERMISSION_PROGRAM_ID)]
    pub permission_program: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
}

#[delegate]
#[derive(Accounts)]
pub struct DelegateQuestionToTee<'info> {
    pub payer: Signer<'info>,
    /// CHECK: Question PDA to delegate to TEE
    #[account(mut, del)]
    pub pda: AccountInfo<'info>,
    /// CHECK: TEE validator account
    pub validator: Option<AccountInfo<'info>>,
}

#[derive(Accounts)]
pub struct StartPrivateVoting<'info> {
    #[account(mut)]
    pub question: Account<'info, Question>,
    #[account(mut)]
    pub admin: Signer<'info>,
}

#[derive(Accounts)]
pub struct AdminSetCommittee<'info> {
    #[account(mut)]
    pub question: Account<'info, Question>,
    #[account(mut)]
    pub admin: Signer<'info>,
}

/// Full PER/TEE enablement context.
/// #[delegate] macro auto-generates:
/// - buffer_question, delegation_record_question, delegation_metadata_question
/// - owner_program, delegation_program
/// - delegate_question() method
#[derive(Accounts)]
pub struct EnablePrivateVoting<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    /// CHECK: Delegation program
    #[account(address = ephemeral_rollups_sdk::id())]
    pub delegation_program: AccountInfo<'info>,
    /// CHECK: Owner program
    #[account(address = crate::id())]
    pub owner_program: AccountInfo<'info>,
    /// The question PDA to delegate to TEE
    #[account(mut, seeds = [QUESTION_SEED, question.question_id.to_le_bytes().as_ref()], bump)]
    pub question: Account<'info, Question>,
    /// CHECK: Buffer for question delegation (auto-derived by delegation program)
    #[account(
        mut,
        seeds = [b"buffer", question.key().as_ref()],
        bump,
        seeds::program = crate::id()
    )]
    pub buffer_question: AccountInfo<'info>,
    /// CHECK: Delegation record for question (auto-derived by delegation program)
    #[account(
        mut,
        seeds = [b"delegation", question.key().as_ref()],
        bump,
        seeds::program = delegation_program.key()
    )]
    pub record_question: AccountInfo<'info>,
    /// CHECK: Delegation metadata for question (auto-derived by delegation program)
    #[account(
        mut,
        seeds = [b"delegation-metadata", question.key().as_ref()],
        bump,
        seeds::program = delegation_program.key()
    )]
    pub metadata_question: AccountInfo<'info>,
    /// CHECK: Permission account for the question PDA
    #[account(
        mut,
        seeds = [b"permission:", question.key().as_ref()],
        bump,
        seeds::program = permission_program.key()
    )]
    pub permission: AccountInfo<'info>,
    /// CHECK: Buffer for permission delegation
    #[account(
        mut,
        seeds = [b"buffer", permission.key().as_ref()],
        bump,
        seeds::program = permission_program.key()
    )]
    pub buffer_permission: AccountInfo<'info>,
    /// CHECK: Delegation record for permission
    #[account(
        mut,
        seeds = [b"delegation", permission.key().as_ref()],
        bump,
        seeds::program = delegation_program.key()
    )]
    pub record_permission: AccountInfo<'info>,
    /// CHECK: Delegation metadata for permission
    #[account(
        mut,
        seeds = [b"delegation-metadata", permission.key().as_ref()],
        bump,
        seeds::program = delegation_program.key()
    )]
    pub metadata_permission: AccountInfo<'info>,
    /// CHECK: Permission Program
    #[account(address = PERMISSION_PROGRAM_ID)]
    pub permission_program: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
    /// CHECK: TEE validator
    pub validator: AccountInfo<'info>,
}
