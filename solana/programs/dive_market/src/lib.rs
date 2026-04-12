pub mod constants;
pub mod error;
pub mod instructions;
pub mod state;

use anchor_lang::prelude::*;
use ephemeral_rollups_sdk::anchor::ephemeral;

pub use constants::*;
pub use instructions::*;
pub use state::*;

declare_id!("8EYYww8fBe2bXZaVsyce6XMjt3bt8R2ih2JyEa4A1V3v");

#[ephemeral]
#[program]
pub mod dive_market {
    use super::*;

    pub fn initialize_market(
        ctx: Context<InitializeMarket>,
        question_hash: [u8; 32],
        question: String,
        outcomes: Vec<String>,
        deadline_ts: i64,
        bond_amount: u64,
        oracle_authority: Pubkey,
    ) -> Result<()> {
        instructions::initialize_market::initialize_market_handler(
            ctx,
            question_hash,
            question,
            outcomes,
            deadline_ts,
            bond_amount,
            oracle_authority,
        )
    }

    pub fn place_bet(ctx: Context<PlaceBet>, outcome: OutcomeSide, amount: u64) -> Result<()> {
        instructions::place_bet::place_bet_handler(ctx, outcome, amount)
    }

    pub fn resolve_market(ctx: Context<ResolveMarket>, outcome: OutcomeSide) -> Result<()> {
        instructions::resolve_market::resolve_market_handler(ctx, outcome)
    }

    pub fn claim_payout(ctx: Context<ClaimPayout>, share_amount: u64) -> Result<()> {
        instructions::claim_payout::claim_payout_handler(ctx, share_amount)
    }

    pub fn dispute_market(ctx: Context<DisputeMarket>, bond_amount: u64) -> Result<()> {
        instructions::dispute_market::dispute_market_handler(ctx, bond_amount)
    }

    pub fn delegate_market(ctx: Context<DelegateMarket>) -> Result<()> {
        instructions::delegate_market::delegate_market_handler(ctx)
    }

    pub fn undelegate_market(ctx: Context<UndelegateMarket>) -> Result<()> {
        instructions::undelegate_market::undelegate_market_handler(ctx)
    }
}
