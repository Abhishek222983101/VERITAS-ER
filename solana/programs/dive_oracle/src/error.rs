use anchor_lang::prelude::*;

#[error_code]
pub enum ErrorCode {
    #[msg("Agent name is invalid")]
    InvalidAgentName,
    #[msg("Session deadlines are invalid")]
    InvalidDeadlines,
    #[msg("Session is not ready for committee selection")]
    InvalidSessionStatus,
    #[msg("No candidate agents were supplied for committee selection")]
    MissingCandidateAgents,
    #[msg("The supplied agent is not in the active committee")]
    AgentNotInCommittee,
    #[msg("Round does not match the current session round")]
    InvalidRound,
    #[msg("Attestation expired")]
    AttestationExpired,
    #[msg("Attestation revoked")]
    AttestationRevoked,
    #[msg("Invalid market")]
    InvalidMarket,
    #[msg("Commit hash does not match the reveal payload")]
    InvalidReveal,
    #[msg("Commit phase is not active")]
    CommitPhaseClosed,
    #[msg("Reveal phase is not active")]
    RevealPhaseClosed,
    #[msg("Confidence must be between 0 and 100")]
    InvalidConfidence,
    #[msg("No vote reveals were supplied for tallying")]
    MissingRevealAccounts,
    #[msg("Only the session authority may adjust agent reputation")]
    InvalidSessionAuthority,
    #[msg("Math overflow while tallying votes")]
    MathOverflow,
    #[msg("Confidence must be between 0 and 100 for insights")]
    InvalidInsightConfidence,
    #[msg("Insight reasoning is too long")]
    InsightReasoningTooLong,
    #[msg("Only the agent authority can submit insights")]
    InvalidAgentAuthority,
    #[msg("Agent is not active and cannot submit insights")]
    AgentNotActive,
    #[msg("This insight has already been resolved")]
    InsightAlreadyResolved,
    #[msg("The actual outcome is not resolved yet")]
    InsightOutcomeUnresolved,
}
