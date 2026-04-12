pub mod constants;
pub mod error;
pub mod instructions;
pub mod state;

use anchor_lang::prelude::*;

pub use constants::*;
pub use instructions::*;
pub use state::*;

declare_id!("47aEwUawQtJL8rb4mjZ4XkQNF8gH7q3yAw1JqGLuFJSJ");

#[program]
pub mod dive_oracle {
    use super::*;

    pub fn register_agent(
        ctx: Context<RegisterAgent>,
        name: String,
        personality_hash: [u8; 32],
    ) -> Result<()> {
        instructions::register_agent::register_agent_handler(
            ctx,
            name,
            personality_hash,
        )
    }

    pub fn initialize_resolution_session(
        ctx: Context<InitializeResolutionSession>,
        market: Pubkey,
        committee_size: u8,
        commit_deadline: i64,
        reveal_deadline: i64,
    ) -> Result<()> {
        instructions::initialize_resolution_session::initialize_resolution_session_handler(
            ctx,
            market,
            committee_size,
            commit_deadline,
            reveal_deadline,
        )
    }

    pub fn select_committee(ctx: Context<SelectCommittee>, caller_seed: [u8; 32]) -> Result<()> {
        instructions::select_committee::select_committee_handler(ctx, caller_seed)
    }

    pub fn vrf_callback<'info>(
        ctx: Context<'_, '_, 'info, 'info, VrfCallback<'info>>,
        randomness: [u8; 32],
    ) -> Result<()> {
        instructions::vrf_callback::vrf_callback_handler(ctx, randomness)
    }

    pub fn commit_vote(ctx: Context<CommitVote>, round: u8, commit_hash: [u8; 32]) -> Result<()> {
        instructions::commit_vote::commit_vote_handler(ctx, round, commit_hash)
    }

    pub fn reveal_vote(
        ctx: Context<RevealVote>,
        round: u8,
        vote: VoteChoice,
        salt: [u8; 16],
        confidence: u8,
        evidence_hash: [u8; 32],
    ) -> Result<()> {
        instructions::reveal_vote::reveal_vote_handler(
            ctx,
            round,
            vote,
            salt,
            confidence,
            evidence_hash,
        )
    }

    pub fn tally_votes<'info>(
        ctx: Context<'_, '_, 'info, 'info, TallyVotes<'info>>,
        round: u8,
    ) -> Result<()> {
        instructions::tally_votes::tally_votes_handler(ctx, round)
    }

    pub fn adjust_reputation(ctx: Context<AdjustReputation>, delta: i64) -> Result<()> {
        instructions::adjust_reputation::adjust_reputation_handler(ctx, delta)
    }

    pub fn submit_insight(
        ctx: Context<SubmitInsight>,
        market: Pubkey,
        predicted_outcome: PredictionOutcome,
        confidence: u8,
        reasoning: String,
        model_hash: [u8; 32],
    ) -> Result<()> {
        instructions::submit_insight::submit_insight_handler(
            ctx,
            market,
            predicted_outcome,
            confidence,
            reasoning,
            model_hash,
        )
    }

    pub fn resolve_insight(ctx: Context<ResolveInsight>, actual_outcome: u8) -> Result<()> {
        instructions::resolve_insight::resolve_insight_handler(ctx, actual_outcome)
    }
}
