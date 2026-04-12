use anchor_lang::prelude::*;
use solana_program::hash::hashv;

use crate::{error::ErrorCode, state::*, AGENT_SEED, COMMIT_SEED, REVEAL_SEED, SESSION_SEED};

#[derive(Accounts)]
#[instruction(round: u8)]
pub struct RevealVote<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(seeds = [AGENT_SEED, authority.key().as_ref()], bump = agent.bump)]
    pub agent: Account<'info, Agent>,
    #[account(mut, seeds = [SESSION_SEED, session.market.as_ref()], bump = session.bump)]
    pub session: Account<'info, ResolutionSession>,
    #[account(
        mut,
        seeds = [COMMIT_SEED, session.key().as_ref(), agent.authority.as_ref(), &[round]],
        bump = vote_commit.bump
    )]
    pub vote_commit: Account<'info, VoteCommit>,
    #[account(
        init,
        payer = authority,
        space = 8 + VoteReveal::INIT_SPACE,
        seeds = [REVEAL_SEED, session.key().as_ref(), agent.authority.as_ref(), &[round]],
        bump
    )]
    pub vote_reveal: Account<'info, VoteReveal>,
    pub system_program: Program<'info, System>,
}

pub fn reveal_vote_handler(
    ctx: Context<RevealVote>,
    round: u8,
    vote: VoteChoice,
    salt: [u8; 16],
    confidence: u8,
    evidence_hash: [u8; 32],
) -> Result<()> {
    let now = Clock::get()?.unix_timestamp;
    let session = &mut ctx.accounts.session;

    require!(round == session.current_round, ErrorCode::InvalidRound);
    require!(
        now >= session.commit_deadline && now <= session.reveal_deadline,
        ErrorCode::RevealPhaseClosed
    );
    require!(confidence <= 100, ErrorCode::InvalidConfidence);
    require!(
        session.committee.contains(&ctx.accounts.agent.authority),
        ErrorCode::AgentNotInCommittee
    );

    let expected_hash = hashv(&[
        &[vote.as_u8()],
        &salt[..],
        session.market.as_ref(),
        &[round],
    ])
    .to_bytes();

    require!(
        expected_hash == ctx.accounts.vote_commit.commit_hash,
        ErrorCode::InvalidReveal
    );

    ctx.accounts.vote_commit.revealed = true;

    let vote_reveal = &mut ctx.accounts.vote_reveal;
    vote_reveal.session = session.key();
    vote_reveal.market = session.market;
    vote_reveal.agent = ctx.accounts.agent.authority;
    vote_reveal.round = round;
    vote_reveal.vote = vote.as_u8();
    vote_reveal.salt = salt;
    vote_reveal.confidence = confidence;
    vote_reveal.evidence_hash = evidence_hash;
    vote_reveal.revealed_at = now;
    vote_reveal.bump = ctx.bumps.vote_reveal;

    session.status = SessionStatus::RevealPhase;
    Ok(())
}
