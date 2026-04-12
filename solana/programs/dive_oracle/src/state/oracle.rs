use anchor_lang::prelude::*;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace)]
pub enum SessionStatus {
    PendingSelection,
    CommitteeSelected,
    CommitPhase,
    RevealPhase,
    Discussion,
    Finalized,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum VoteChoice {
    Yes,
    No,
    Unsure,
}

impl VoteChoice {
    pub fn as_u8(self) -> u8 {
        match self {
            Self::Yes => 0,
            Self::No => 1,
            Self::Unsure => 2,
        }
    }
}

#[account]
#[derive(InitSpace)]
pub struct Agent {
    pub authority: Pubkey,
    pub sas_attestation: Pubkey,
    #[max_len(32)]
    pub name: String,
    pub personality_hash: [u8; 32],
    pub reputation: u64,
    pub total_votes: u64,
    pub correct_votes: u64,
    pub is_active: bool,
    pub created_at: i64,
    pub updated_at: i64,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct ResolutionSession {
    pub authority: Pubkey,
    pub market: Pubkey,
    #[max_len(7)]
    pub committee: Vec<Pubkey>,
    pub committee_size: u8,
    pub current_round: u8,
    pub commit_deadline: i64,
    pub reveal_deadline: i64,
    pub status: SessionStatus,
    pub final_outcome: u8,
    pub yes_votes: u64,
    pub no_votes: u64,
    pub unsure_votes: u64,
    pub last_randomness: [u8; 32],
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct VoteCommit {
    pub session: Pubkey,
    pub market: Pubkey,
    pub agent: Pubkey,
    pub round: u8,
    pub commit_hash: [u8; 32],
    pub committed_at: i64,
    pub revealed: bool,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct VoteReveal {
    pub session: Pubkey,
    pub market: Pubkey,
    pub agent: Pubkey,
    pub round: u8,
    pub vote: u8,
    pub salt: [u8; 16],
    pub confidence: u8,
    pub evidence_hash: [u8; 32],
    pub revealed_at: i64,
    pub bump: u8,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum PredictionOutcome {
    Yes,
    No,
}

impl PredictionOutcome {
    pub fn as_u8(self) -> u8 {
        match self {
            Self::Yes => 0,
            Self::No => 1,
        }
    }
}

#[account]
#[derive(InitSpace)]
pub struct AgentInsight {
    pub agent: Pubkey,
    pub market: Pubkey,
    pub predicted_outcome: u8,
    pub confidence: u8,
    #[max_len(256)]
    pub reasoning: String,
    pub model_hash: [u8; 32],
    pub submitted_at: i64,
    pub resolved: bool,
    pub correct: bool,
    pub bump: u8,
}
