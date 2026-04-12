use anchor_lang::prelude::*;
use anchor_spl::token_interface::{Mint, TokenInterface};

use crate::{
    error::ErrorCode, state::*, MARKET_SEED, NO_MINT_SEED, OUTCOME_UNRESOLVED, VAULT_SEED,
    YES_MINT_SEED,
};

#[derive(Accounts)]
#[instruction(question_hash: [u8; 32])]
pub struct InitializeMarket<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(
        init,
        payer = authority,
        space = 8 + Market::INIT_SPACE,
        seeds = [MARKET_SEED, question_hash.as_ref()],
        bump
    )]
    pub market: Account<'info, Market>,
    #[account(
        init,
        payer = authority,
        space = 8 + Vault::INIT_SPACE,
        seeds = [VAULT_SEED, market.key().as_ref()],
        bump
    )]
    pub vault: Account<'info, Vault>,
    #[account(
        init,
        payer = authority,
        seeds = [YES_MINT_SEED, market.key().as_ref()],
        bump,
        mint::decimals = 9,
        mint::authority = market,
        mint::freeze_authority = market,
        mint::token_program = token_program
    )]
    pub yes_mint: InterfaceAccount<'info, Mint>,
    #[account(
        init,
        payer = authority,
        seeds = [NO_MINT_SEED, market.key().as_ref()],
        bump,
        mint::decimals = 9,
        mint::authority = market,
        mint::freeze_authority = market,
        mint::token_program = token_program
    )]
    pub no_mint: InterfaceAccount<'info, Mint>,
    pub token_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,
}

pub fn initialize_market_handler(
    ctx: Context<InitializeMarket>,
    question_hash: [u8; 32],
    question: String,
    outcomes: Vec<String>,
    deadline_ts: i64,
    bond_amount: u64,
    oracle_authority: Pubkey,
) -> Result<()> {
    require!(question_hash != [0; 32], ErrorCode::EmptyQuestionHash);
    require!(outcomes.len() == 2, ErrorCode::InvalidOutcomeCount);
    require!(question.len() <= 280, ErrorCode::QuestionTooLong);
    require!(
        outcomes
            .iter()
            .all(|label| !label.is_empty() && label.len() <= 16),
        ErrorCode::OutcomeTooLong
    );
    require!(
        deadline_ts > Clock::get()?.unix_timestamp,
        ErrorCode::InvalidDeadline
    );

    let market = &mut ctx.accounts.market;
    market.authority = ctx.accounts.authority.key();
    market.oracle_authority = oracle_authority;
    market.vault = ctx.accounts.vault.key();
    market.yes_mint = ctx.accounts.yes_mint.key();
    market.no_mint = ctx.accounts.no_mint.key();
    market.question_hash = question_hash;
    market.question = question;
    market.outcomes = outcomes;
    market.deadline_ts = deadline_ts;
    market.created_at = Clock::get()?.unix_timestamp;
    market.updated_at = market.created_at;
    market.yes_pool = 0;
    market.no_pool = 0;
    market.bond_amount = bond_amount;
    market.status = MarketStatus::Active;
    market.resolved_outcome = OUTCOME_UNRESOLVED;
    market.is_disputed = false;
    market.resolve_nonce = 0;
    market.market_bump = ctx.bumps.market;
    market.vault_bump = ctx.bumps.vault;
    market.yes_mint_bump = ctx.bumps.yes_mint;
    market.no_mint_bump = ctx.bumps.no_mint;
    market.delegation_active = false;

    let vault = &mut ctx.accounts.vault;
    vault.market = market.key();
    vault.bump = ctx.bumps.vault;

    Ok(())
}
