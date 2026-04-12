use anchor_lang::prelude::*;

#[error_code]
pub enum ErrorCode {
    #[msg("Question hash cannot be empty")]
    EmptyQuestionHash,
    #[msg("Exactly two outcomes are required")]
    InvalidOutcomeCount,
    #[msg("Market question is too long")]
    QuestionTooLong,
    #[msg("Outcome label is too long")]
    OutcomeTooLong,
    #[msg("Market deadline must be in the future")]
    InvalidDeadline,
    #[msg("Amount must be greater than zero")]
    InvalidAmount,
    #[msg("Attestation expired")]
    AttestationExpired,
    #[msg("Attestation revoked")]
    AttestationRevoked,
    #[msg("Market is not delegated to Ephemeral Rollups")]
    MarketNotDelegated,
    #[msg("Market is not active")]
    MarketNotActive,
    #[msg("Market trading window has closed")]
    MarketClosed,
    #[msg("Market has not been resolved")]
    MarketUnresolved,
    #[msg("Market is already resolved")]
    MarketAlreadyResolved,
    #[msg("The supplied token account does not match the selected outcome mint")]
    InvalidOutcomeTokenAccount,
    #[msg("Only the configured oracle authority may resolve this market")]
    InvalidOracleAuthority,
    #[msg("The provided winning mint does not match the market resolution")]
    InvalidWinningMint,
    #[msg("The vault does not match the market vault")]
    InvalidVault,
    #[msg("Math overflow while processing market balances")]
    MathOverflow,
    #[msg("Only resolved markets can be disputed")]
    MarketMustBeResolvedToDispute,
    #[msg("Incorrect dispute bond supplied")]
    InvalidDisputeBond,
    #[msg("This market has already been disputed")]
    MarketAlreadyDisputed,
}
