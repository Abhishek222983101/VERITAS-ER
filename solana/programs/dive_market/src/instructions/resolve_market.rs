use anchor_lang::prelude::*;

use crate::{error::ErrorCode, state::*, MARKET_SEED, OUTCOME_UNRESOLVED};

#[derive(Accounts)]
pub struct ResolveMarket<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(mut, seeds = [MARKET_SEED, market.question_hash.as_ref()], bump = market.market_bump)]
    pub market: Account<'info, Market>,
}

pub fn resolve_market_handler(ctx: Context<ResolveMarket>, outcome: OutcomeSide) -> Result<()> {
    let market = &mut ctx.accounts.market;

    require_keys_eq!(
        market.oracle_authority,
        ctx.accounts.authority.key(),
        ErrorCode::InvalidOracleAuthority
    );
    require!(
        market.resolved_outcome == OUTCOME_UNRESOLVED,
        ErrorCode::MarketAlreadyResolved
    );

    market.resolved_outcome = outcome.as_u8();
    market.status = MarketStatus::Resolved;
    market.updated_at = Clock::get()?.unix_timestamp;
    market.is_disputed = false;

    Ok(())
}
