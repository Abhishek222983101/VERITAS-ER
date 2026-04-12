use anchor_lang::prelude::*;
use ephemeral_rollups_sdk::{anchor::delegate, cpi::DelegateConfig};

use crate::{state::Market, MARKET_SEED};

#[delegate]
#[derive(Accounts)]
pub struct DelegateMarket<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(mut, del, seeds = [MARKET_SEED, market.question_hash.as_ref()], bump = market.market_bump)]
    pub market: Account<'info, Market>,
}

pub fn delegate_market_handler(ctx: Context<DelegateMarket>) -> Result<()> {
    let question_hash = ctx.accounts.market.question_hash;
    ctx.accounts.delegate_market(
        &ctx.accounts.authority,
        &[MARKET_SEED, question_hash.as_ref()],
        DelegateConfig {
            validator: ctx.remaining_accounts.first().map(|account| account.key()),
            ..Default::default()
        },
    )?;

    ctx.accounts.market.delegation_active = true;
    ctx.accounts.market.updated_at = Clock::get()?.unix_timestamp;
    Ok(())
}
