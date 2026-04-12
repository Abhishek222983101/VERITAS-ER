use anchor_lang::prelude::*;
use ephemeral_rollups_sdk::{anchor::commit, ephem::commit_and_undelegate_accounts};

use crate::{state::Market, MARKET_SEED};

#[commit]
#[derive(Accounts)]
pub struct UndelegateMarket<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(mut, seeds = [MARKET_SEED, market.question_hash.as_ref()], bump = market.market_bump)]
    pub market: Account<'info, Market>,
}

pub fn undelegate_market_handler(ctx: Context<UndelegateMarket>) -> Result<()> {
    commit_and_undelegate_accounts(
        &ctx.accounts.authority,
        vec![&ctx.accounts.market.to_account_info()],
        &ctx.accounts.magic_context,
        &ctx.accounts.magic_program,
        None,
    )?;

    ctx.accounts.market.delegation_active = false;
    ctx.accounts.market.updated_at = Clock::get()?.unix_timestamp;
    Ok(())
}
