use anchor_lang::prelude::*;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace)]
pub enum MarketStatus {
    Active,
    Resolved,
    Disputed,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum OutcomeSide {
    Yes,
    No,
}

impl OutcomeSide {
    pub fn as_u8(self) -> u8 {
        match self {
            Self::Yes => crate::OUTCOME_YES,
            Self::No => crate::OUTCOME_NO,
        }
    }
}

#[account]
#[derive(InitSpace)]
pub struct Market {
    pub authority: Pubkey,
    pub oracle_authority: Pubkey,
    pub vault: Pubkey,
    pub yes_mint: Pubkey,
    pub no_mint: Pubkey,
    pub question_hash: [u8; 32],
    #[max_len(280)]
    pub question: String,
    #[max_len(2, 16)]
    pub outcomes: Vec<String>,
    pub deadline_ts: i64,
    pub created_at: i64,
    pub updated_at: i64,
    pub yes_pool: u64,
    pub no_pool: u64,
    pub bond_amount: u64,
    pub status: MarketStatus,
    pub resolved_outcome: u8,
    pub is_disputed: bool,
    pub resolve_nonce: u64,
    pub market_bump: u8,
    pub vault_bump: u8,
    pub yes_mint_bump: u8,
    pub no_mint_bump: u8,
    pub delegation_active: bool,
}

impl Market {
    pub fn total_pool(&self) -> Result<u64> {
        self.yes_pool
            .checked_add(self.no_pool)
            .ok_or(error!(crate::error::ErrorCode::MathOverflow))
    }

    pub fn winning_pool(&self) -> Result<u64> {
        match self.resolved_outcome {
            crate::OUTCOME_YES => Ok(self.yes_pool),
            crate::OUTCOME_NO => Ok(self.no_pool),
            _ => Err(error!(crate::error::ErrorCode::MarketUnresolved)),
        }
    }

    pub fn outcome_mint(&self, outcome: OutcomeSide) -> Pubkey {
        match outcome {
            OutcomeSide::Yes => self.yes_mint,
            OutcomeSide::No => self.no_mint,
        }
    }
}

#[account]
#[derive(InitSpace)]
pub struct Vault {
    pub market: Pubkey,
    pub bump: u8,
}
