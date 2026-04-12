use anchor_lang::prelude::*;

use crate::{error::ErrorCode, state::*, ORACLE_AUTH_SEED, OUTCOME_UNSET, SESSION_SEED};
use dive_market::cpi::accounts::ResolveMarket;
use dive_market::program::DiveMarket;
use dive_market::state::Market;

#[derive(Accounts)]
pub struct TallyVotes<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    
    #[account(mut, seeds = [SESSION_SEED, session.market.as_ref()], bump = session.bump)]
    pub session: Account<'info, ResolutionSession>,

    #[account(mut)]
    pub market: Account<'info, Market>,

    /// CHECK: PDA used to sign CPIs
    #[account(seeds = [ORACLE_AUTH_SEED], bump)]
    pub oracle_auth: UncheckedAccount<'info>,

    pub dive_market_program: Program<'info, DiveMarket>,
}

pub fn tally_votes_handler<'info>(
    ctx: Context<'_, '_, 'info, 'info, TallyVotes<'info>>,
    round: u8,
) -> Result<()> {
    let session = &mut ctx.accounts.session;
    require!(round == session.current_round, ErrorCode::InvalidRound);
    require_keys_eq!(session.market, ctx.accounts.market.key(), ErrorCode::InvalidMarket);

    let mut yes_votes = 0u64;
    let mut no_votes = 0u64;
    let mut unsure_votes = 0u64;
    let mut total = 0u64;

    for account_info in ctx.remaining_accounts.iter() {
        if account_info.owner == ctx.program_id {
            if let Ok(vote_reveal) = Account::<VoteReveal>::try_from(account_info) {
                if vote_reveal.session != session.key() || vote_reveal.round != round {
                    continue;
                }

                match vote_reveal.vote {
                    0 => yes_votes = yes_votes.saturating_add(1),
                    1 => no_votes = no_votes.saturating_add(1),
                    _ => unsure_votes = unsure_votes.saturating_add(1),
                }
                total = total.saturating_add(1);
            }
        }
    }

    require!(total > 0, ErrorCode::MissingRevealAccounts);

    session.yes_votes = yes_votes;
    session.no_votes = no_votes;
    session.unsure_votes = unsure_votes;

    let yes_consensus = (yes_votes as u128)
        .checked_mul(100)
        .ok_or(error!(ErrorCode::MathOverflow))?
        >= (total as u128)
            .checked_mul(70)
            .ok_or(error!(ErrorCode::MathOverflow))?;
            
    let no_consensus = (no_votes as u128)
        .checked_mul(100)
        .ok_or(error!(ErrorCode::MathOverflow))?
        >= (total as u128)
            .checked_mul(70)
            .ok_or(error!(ErrorCode::MathOverflow))?;

    if yes_consensus || no_consensus {
        let final_outcome = if yes_consensus {
            VoteChoice::Yes.as_u8()
        } else {
            VoteChoice::No.as_u8()
        };
        
        session.final_outcome = final_outcome;
        session.status = SessionStatus::Finalized;

        // Perform CPI to dive_market to resolve the market
        let cpi_program = ctx.accounts.dive_market_program.to_account_info();
        let cpi_accounts = ResolveMarket {
            authority: ctx.accounts.oracle_auth.to_account_info(),
            market: ctx.accounts.market.to_account_info(),
        };

        let bump = ctx.bumps.oracle_auth;
        let seeds = &[ORACLE_AUTH_SEED, &[bump]];
        let signer = &[&seeds[..]];

        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);
        
        // We need to convert from dive_oracle::state::VoteChoice to dive_market::state::OutcomeSide
        // Actually, we can just pass the u8, but wait, dive_market::cpi expects the enum from dive_market
        // Let's check dive_market::cpi params. It expects dive_market::state::OutcomeSide.
        let outcome_side = if final_outcome == 0 {
            dive_market::state::OutcomeSide::Yes
        } else {
            dive_market::state::OutcomeSide::No
        };
        
        dive_market::cpi::resolve_market(cpi_ctx, outcome_side)?;

    } else {
        session.final_outcome = OUTCOME_UNSET;
        session.current_round = session.current_round.saturating_add(1);
        session.status = SessionStatus::Discussion;
    }

    Ok(())
}
