use anchor_lang::prelude::*;
use anchor_spl::token_interface::{burn, Burn, Mint, TokenAccount, TokenInterface};

use crate::{error::ErrorCode, state::*, MARKET_SEED, OUTCOME_NO, OUTCOME_YES, VAULT_SEED};

#[derive(Accounts)]
pub struct ClaimPayout<'info> {
    #[account(mut)]
    pub claimer: Signer<'info>,
    #[account(mut, seeds = [MARKET_SEED, market.question_hash.as_ref()], bump = market.market_bump)]
    pub market: Account<'info, Market>,
    #[account(mut, seeds = [VAULT_SEED, market.key().as_ref()], bump = market.vault_bump)]
    pub vault: Account<'info, Vault>,
    #[account(mut)]
    pub winning_mint: InterfaceAccount<'info, Mint>,
    #[account(
        mut,
        constraint = claimant_token_account.owner == claimer.key(),
        constraint = claimant_token_account.mint == winning_mint.key(),
    )]
    pub claimant_token_account: InterfaceAccount<'info, TokenAccount>,
    pub token_program: Interface<'info, TokenInterface>,
}

pub fn claim_payout_handler(ctx: Context<ClaimPayout>, share_amount: u64) -> Result<()> {
    require!(share_amount > 0, ErrorCode::InvalidAmount);

    let market = &mut ctx.accounts.market;
    require!(
        market.status == MarketStatus::Resolved,
        ErrorCode::MarketUnresolved
    );
    require_keys_eq!(
        market.vault,
        ctx.accounts.vault.key(),
        ErrorCode::InvalidVault
    );

    match market.resolved_outcome {
        OUTCOME_YES => require_keys_eq!(
            market.yes_mint,
            ctx.accounts.winning_mint.key(),
            ErrorCode::InvalidWinningMint
        ),
        OUTCOME_NO => require_keys_eq!(
            market.no_mint,
            ctx.accounts.winning_mint.key(),
            ErrorCode::InvalidWinningMint
        ),
        _ => return err!(ErrorCode::MarketUnresolved),
    }

    let burn_ctx = CpiContext::new(
        ctx.accounts.token_program.to_account_info(),
        Burn {
            mint: ctx.accounts.winning_mint.to_account_info(),
            from: ctx.accounts.claimant_token_account.to_account_info(),
            authority: ctx.accounts.claimer.to_account_info(),
        },
    );
    burn(burn_ctx, share_amount)?;

    let total_pool = market.total_pool()? as u128;
    let winning_pool = market.winning_pool()? as u128;
    let payout = (share_amount as u128)
        .checked_mul(total_pool)
        .ok_or(error!(ErrorCode::MathOverflow))?
        .checked_div(winning_pool)
        .ok_or(error!(ErrorCode::MathOverflow))? as u64;

    **ctx
        .accounts
        .vault
        .to_account_info()
        .try_borrow_mut_lamports()? = ctx
        .accounts
        .vault
        .to_account_info()
        .lamports()
        .checked_sub(payout)
        .ok_or(error!(ErrorCode::MathOverflow))?;
    **ctx
        .accounts
        .claimer
        .to_account_info()
        .try_borrow_mut_lamports()? = ctx
        .accounts
        .claimer
        .to_account_info()
        .lamports()
        .checked_add(payout)
        .ok_or(error!(ErrorCode::MathOverflow))?;

    market.updated_at = Clock::get()?.unix_timestamp;
    Ok(())
}
