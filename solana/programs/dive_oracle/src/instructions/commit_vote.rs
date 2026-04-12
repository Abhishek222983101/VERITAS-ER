use anchor_lang::prelude::*;

use crate::{error::ErrorCode, state::*, AGENT_SEED, COMMIT_SEED, SESSION_SEED};

#[derive(Accounts)]
#[instruction(round: u8)]
pub struct CommitVote<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(seeds = [AGENT_SEED, authority.key().as_ref()], bump = agent.bump)]
    pub agent: Account<'info, Agent>,
    #[account(mut, seeds = [SESSION_SEED, session.market.as_ref()], bump = session.bump)]
    pub session: Account<'info, ResolutionSession>,
    #[account(
        init,
        payer = authority,
        space = 8 + VoteCommit::INIT_SPACE,
        seeds = [COMMIT_SEED, session.key().as_ref(), agent.authority.as_ref(), &[round]],
        bump
    )]
    pub vote_commit: Account<'info, VoteCommit>,
    pub system_program: Program<'info, System>,
}

pub fn commit_vote_handler(
    ctx: Context<CommitVote>,
    round: u8,
    commit_hash: [u8; 32],
) -> Result<()> {
    let now = Clock::get()?.unix_timestamp;
    let session = &mut ctx.accounts.session;

    require!(round == session.current_round, ErrorCode::InvalidRound);
    require!(
        matches!(
            session.status,
            SessionStatus::CommitteeSelected
                | SessionStatus::CommitPhase
                | SessionStatus::Discussion
        ),
        ErrorCode::InvalidSessionStatus
    );
    require!(now <= session.commit_deadline, ErrorCode::CommitPhaseClosed);
    require!(
        session.committee.contains(&ctx.accounts.agent.authority),
        ErrorCode::AgentNotInCommittee
    );

    let vote_commit = &mut ctx.accounts.vote_commit;
    vote_commit.session = session.key();
    vote_commit.market = session.market;
    vote_commit.agent = ctx.accounts.agent.authority;
    vote_commit.round = round;
    vote_commit.commit_hash = commit_hash;
    vote_commit.committed_at = now;
    vote_commit.revealed = false;
    vote_commit.bump = ctx.bumps.vote_commit;

    session.status = SessionStatus::CommitPhase;
    Ok(())
}
