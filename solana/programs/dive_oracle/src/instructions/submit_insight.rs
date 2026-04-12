use anchor_lang::prelude::*;

use crate::{error::ErrorCode, state::*, AGENT_SEED, INSIGHT_SEED};

#[derive(Accounts)]
#[instruction(market: Pubkey)]
pub struct SubmitInsight<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(seeds = [AGENT_SEED, authority.key().as_ref()], bump = agent.bump)]
    pub agent: Account<'info, Agent>,
    #[account(
        init,
        payer = authority,
        space = 8 + AgentInsight::INIT_SPACE,
        seeds = [INSIGHT_SEED, agent.key().as_ref(), market.as_ref()],
        bump
    )]
    pub insight: Account<'info, AgentInsight>,
    pub system_program: Program<'info, System>,
}

pub fn submit_insight_handler(
    ctx: Context<SubmitInsight>,
    market: Pubkey,
    predicted_outcome: PredictionOutcome,
    confidence: u8,
    reasoning: String,
    model_hash: [u8; 32],
) -> Result<()> {
    require!(confidence <= 100, ErrorCode::InvalidInsightConfidence);
    require!(
        !reasoning.is_empty() && reasoning.len() <= 256,
        ErrorCode::InsightReasoningTooLong
    );
    require!(ctx.accounts.agent.is_active, ErrorCode::AgentNotActive);
    require_keys_eq!(
        ctx.accounts.agent.authority,
        ctx.accounts.authority.key(),
        ErrorCode::InvalidAgentAuthority
    );

    let now = Clock::get()?.unix_timestamp;
    let insight = &mut ctx.accounts.insight;
    insight.agent = ctx.accounts.agent.key();
    insight.market = market;
    insight.predicted_outcome = predicted_outcome.as_u8();
    insight.confidence = confidence;
    insight.reasoning = reasoning;
    insight.model_hash = model_hash;
    insight.submitted_at = now;
    insight.resolved = false;
    insight.correct = false;
    insight.bump = ctx.bumps.insight;

    Ok(())
}
