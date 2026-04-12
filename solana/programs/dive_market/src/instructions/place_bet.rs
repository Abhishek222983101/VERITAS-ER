use anchor_lang::{prelude::*, system_program};
use anchor_spl::token_interface::{mint_to, Mint, MintTo, TokenAccount, TokenInterface};
use dive_identity::state::HumanAttestation;
use dive_identity::HUMAN_ATTESTATION_SEED;

use crate::{error::ErrorCode, state::*, MARKET_SEED, OUTCOME_UNRESOLVED, VAULT_SEED};

#[derive(Accounts)]
pub struct PlaceBet<'info> {
    #[account(mut)]
    pub bettor: Signer<'info>,

    #[account(
        seeds = [HUMAN_ATTESTATION_SEED, bettor.key().as_ref()],
        bump,
        seeds::program = dive_identity::ID,
    )]
    pub human_attestation: Account<'info, HumanAttestation>,

    #[account(mut, seeds = [MARKET_SEED, market.question_hash.as_ref()], bump = market.market_bump)]
    pub market: Account<'info, Market>,
    #[account(mut, seeds = [VAULT_SEED, market.key().as_ref()], bump = market.vault_bump)]
    pub vault: Account<'info, Vault>,
    #[account(mut)]
    pub yes_mint: InterfaceAccount<'info, Mint>,
    #[account(mut)]
    pub no_mint: InterfaceAccount<'info, Mint>,
    #[account(mut)]
    pub user_token_account: InterfaceAccount<'info, TokenAccount>,
    pub token_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,
}

pub fn place_bet_handler(ctx: Context<PlaceBet>, outcome: OutcomeSide, amount: u64) -> Result<()> {
    require!(amount > 0, ErrorCode::InvalidAmount);

    let now = Clock::get()?.unix_timestamp;

    // Verify human attestation is valid
    let attestation = &ctx.accounts.human_attestation;
    require!(!attestation.revoked, ErrorCode::AttestationRevoked);
    require!(attestation.expires_at > now, ErrorCode::AttestationExpired);

    let market = &mut ctx.accounts.market;

    require!(
        market.status == MarketStatus::Active,
        ErrorCode::MarketNotActive
    );
    require!(
        market.resolved_outcome == OUTCOME_UNRESOLVED,
        ErrorCode::MarketAlreadyResolved
    );
    require!(now < market.deadline_ts, ErrorCode::MarketClosed);
    require_keys_eq!(
        market.vault,
        ctx.accounts.vault.key(),
        ErrorCode::InvalidVault
    );

    let expected_mint = market.outcome_mint(outcome);
    require_keys_eq!(
        ctx.accounts.user_token_account.mint,
        expected_mint,
        ErrorCode::InvalidOutcomeTokenAccount
    );

    let transfer_ctx = CpiContext::new(
        ctx.accounts.system_program.to_account_info(),
        system_program::Transfer {
            from: ctx.accounts.bettor.to_account_info(),
            to: ctx.accounts.vault.to_account_info(),
        },
    );
    system_program::transfer(transfer_ctx, amount)?;

    let mint_info = match outcome {
        OutcomeSide::Yes => ctx.accounts.yes_mint.to_account_info(),
        OutcomeSide::No => ctx.accounts.no_mint.to_account_info(),
    };

    let bump = [market.market_bump];
    let signer_seeds: &[&[u8]] = &[MARKET_SEED, market.question_hash.as_ref(), &bump];
    let signer_seeds_arr = [signer_seeds];

    let mint_ctx = CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        MintTo {
            mint: mint_info,
            to: ctx.accounts.user_token_account.to_account_info(),
            authority: market.to_account_info(),
        },
        &signer_seeds_arr,
    );
    mint_to(mint_ctx, amount)?;

    match outcome {
        OutcomeSide::Yes => {
            market.yes_pool = market
                .yes_pool
                .checked_add(amount)
                .ok_or(error!(ErrorCode::MathOverflow))?;
        }
        OutcomeSide::No => {
            market.no_pool = market
                .no_pool
                .checked_add(amount)
                .ok_or(error!(ErrorCode::MathOverflow))?;
        }
    }

    market.updated_at = now;
    Ok(())
}
