use anchor_lang::{prelude::*, system_program};

use crate::{error::ErrorCode, state::*, MARKET_SEED, VAULT_SEED};

#[derive(Accounts)]
pub struct DisputeMarket<'info> {
    #[account(mut)]
    pub challenger: Signer<'info>,
    #[account(mut, seeds = [MARKET_SEED, market.question_hash.as_ref()], bump = market.market_bump)]
    pub market: Account<'info, Market>,
    #[account(mut, seeds = [VAULT_SEED, market.key().as_ref()], bump = market.vault_bump)]
    pub vault: Account<'info, Vault>,
    pub system_program: Program<'info, System>,
}

pub fn dispute_market_handler(ctx: Context<DisputeMarket>, bond_amount: u64) -> Result<()> {
    let market = &mut ctx.accounts.market;

    require!(
        market.status == MarketStatus::Resolved,
        ErrorCode::MarketMustBeResolvedToDispute
    );
    require!(!market.is_disputed, ErrorCode::MarketAlreadyDisputed);
    require!(
        bond_amount == market.bond_amount,
        ErrorCode::InvalidDisputeBond
    );
    require_keys_eq!(
        market.vault,
        ctx.accounts.vault.key(),
        ErrorCode::InvalidVault
    );

    let transfer_ctx = CpiContext::new(
        ctx.accounts.system_program.to_account_info(),
        system_program::Transfer {
            from: ctx.accounts.challenger.to_account_info(),
            to: ctx.accounts.vault.to_account_info(),
        },
    );
    system_program::transfer(transfer_ctx, bond_amount)?;

    market.is_disputed = true;
    market.status = MarketStatus::Disputed;
    market.resolve_nonce = market
        .resolve_nonce
        .checked_add(1)
        .ok_or(error!(ErrorCode::MathOverflow))?;
    market.updated_at = Clock::get()?.unix_timestamp;

    Ok(())
}
