use anchor_lang::prelude::*;

use crate::{error::ErrorCode, state::*, OUTCOME_UNSET, SESSION_SEED};

#[derive(Accounts)]
pub struct InitializeResolutionSession<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(
        init,
        payer = authority,
        space = 8 + ResolutionSession::INIT_SPACE,
        seeds = [SESSION_SEED, market.key().as_ref()],
        bump
    )]
    pub session: Account<'info, ResolutionSession>,
    /// CHECK: market pubkey is stored for cross-program resolution later
    pub market: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
}

pub fn initialize_resolution_session_handler(
    ctx: Context<InitializeResolutionSession>,
    market: Pubkey,
    committee_size: u8,
    commit_deadline: i64,
    reveal_deadline: i64,
) -> Result<()> {
    let now = Clock::get()?.unix_timestamp;
    require!(committee_size > 0, ErrorCode::InvalidDeadlines);
    require!(
        commit_deadline > now && reveal_deadline > commit_deadline,
        ErrorCode::InvalidDeadlines
    );
    require_keys_eq!(
        ctx.accounts.market.key(),
        market,
        ErrorCode::InvalidDeadlines
    );

    let session = &mut ctx.accounts.session;
    session.authority = ctx.accounts.authority.key();
    session.market = market;
    session.committee = Vec::new();
    session.committee_size = committee_size;
    session.current_round = 0;
    session.commit_deadline = commit_deadline;
    session.reveal_deadline = reveal_deadline;
    session.status = SessionStatus::PendingSelection;
    session.final_outcome = OUTCOME_UNSET;
    session.yes_votes = 0;
    session.no_votes = 0;
    session.unsure_votes = 0;
    session.last_randomness = [0; 32];
    session.bump = ctx.bumps.session;

    Ok(())
}
