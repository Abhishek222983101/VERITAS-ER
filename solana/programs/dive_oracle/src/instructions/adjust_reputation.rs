use anchor_lang::prelude::*;

use crate::{error::ErrorCode, state::*, AGENT_SEED, SESSION_SEED};

#[derive(Accounts)]
pub struct AdjustReputation<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(seeds = [SESSION_SEED, session.market.as_ref()], bump = session.bump)]
    pub session: Account<'info, ResolutionSession>,
    #[account(mut, seeds = [AGENT_SEED, agent.authority.as_ref()], bump = agent.bump)]
    pub agent: Account<'info, Agent>,
}

pub fn adjust_reputation_handler(ctx: Context<AdjustReputation>, delta: i64) -> Result<()> {
    require_keys_eq!(
        ctx.accounts.session.authority,
        ctx.accounts.authority.key(),
        ErrorCode::InvalidSessionAuthority
    );

    let agent = &mut ctx.accounts.agent;
    agent.reputation = if delta.is_negative() {
        agent.reputation.saturating_sub(delta.unsigned_abs())
    } else {
        agent.reputation.saturating_add(delta as u64)
    };
    agent.updated_at = Clock::get()?.unix_timestamp;
    Ok(())
}
