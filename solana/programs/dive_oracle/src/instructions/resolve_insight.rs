use anchor_lang::prelude::*;

use crate::{error::ErrorCode, state::*, AGENT_SEED, INSIGHT_SEED, OUTCOME_UNSET};

#[derive(Accounts)]
pub struct ResolveInsight<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(mut, address = insight.agent)]
    pub agent: Account<'info, Agent>,
    #[account(
        mut,
        seeds = [INSIGHT_SEED, agent.key().as_ref(), insight.market.as_ref()],
        bump = insight.bump,
        constraint = !insight.resolved @ ErrorCode::InsightAlreadyResolved,
    )]
    pub insight: Account<'info, AgentInsight>,
}

pub fn resolve_insight_handler(ctx: Context<ResolveInsight>, actual_outcome: u8) -> Result<()> {
    require!(
        actual_outcome != OUTCOME_UNSET,
        ErrorCode::InsightOutcomeUnresolved
    );

    let insight = &mut ctx.accounts.insight;
    insight.resolved = true;
    insight.correct = insight.predicted_outcome == actual_outcome;

    let agent = &mut ctx.accounts.agent;
    agent.total_votes = agent.total_votes.saturating_add(1);
    if insight.correct {
        agent.correct_votes = agent.correct_votes.saturating_add(1);
        let bonus = (insight.confidence as u64)
            .checked_mul(2)
            .ok_or(error!(ErrorCode::MathOverflow))?;
        agent.reputation = agent.reputation.saturating_add(bonus);
    } else {
        let penalty = (insight.confidence as u64)
            .checked_div(2)
            .ok_or(error!(ErrorCode::MathOverflow))?;
        agent.reputation = agent.reputation.saturating_sub(penalty);
    }
    agent.updated_at = Clock::get()?.unix_timestamp;

    Ok(())
}
