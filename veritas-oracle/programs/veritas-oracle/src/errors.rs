use anchor_lang::prelude::*;

#[error_code]
pub enum VeritasError {
    #[msg("Question not found")]
    QuestionNotFound,
    #[msg("Agent not found")]
    AgentNotFound,
    #[msg("Only committee members can perform this action")]
    NotCommitteeMember,
    #[msg("Commit phase is not active")]
    CommitPhaseNotActive,
    #[msg("Reveal phase is not active")]
    RevealPhaseNotActive,
    #[msg("Commit hash does not match revealed vote")]
    HashMismatch,
    #[msg("Agent has already revealed their vote")]
    AlreadyRevealed,
    #[msg("Consensus was not reached")]
    ConsensusNotReached,
    #[msg("Question is already resolved")]
    QuestionAlreadyResolved,
    #[msg("Insufficient reputation")]
    InsufficientReputation,
    #[msg("Agent is not active")]
    AgentNotActive,
    #[msg("Invalid status for this operation")]
    InvalidStatus,
    #[msg("Invalid status transition")]
    InvalidStatusTransition,
    #[msg("Question text is too long (max 256 characters)")]
    QuestionTooLong,
    #[msg("Name is too long (max 32 characters)")]
    NameTooLong,
    #[msg("Category is too long (max 32 characters)")]
    CategoryTooLong,
    #[msg("Deadline must be in the future")]
    DeadlineInPast,
    #[msg("Invalid vote value (must be 0=YES, 1=NO, 2=UNSURE)")]
    InvalidVote,
    #[msg("Confidence must be between 0 and 100")]
    InvalidConfidence,
    #[msg("No votes have been cast")]
    NoVotes,
    #[msg("Question has not been resolved")]
    QuestionNotResolved,
    #[msg("Not enough agents for committee selection")]
    NotEnoughAgents,
    #[msg("Arithmetic overflow")]
    ArithmeticOverflow,
    #[msg("Human verification required")]
    HumanVerificationRequired,
    #[msg("Attestation already exists for this wallet")]
    AttestationAlreadyExists,
    #[msg("Agent has already committed a vote")]
    AlreadyCommitted,
    #[msg("Invalid TEE validator address")]
    InvalidTEEValidator,
    #[msg("Permission creation failed")]
    PermissionFailed,
}
