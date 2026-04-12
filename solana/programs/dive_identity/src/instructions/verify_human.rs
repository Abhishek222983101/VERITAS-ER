use anchor_lang::prelude::*;

use crate::{error::ErrorCode, state::*, CONFIG_SEED, HUMAN_ATTESTATION_SEED};

#[derive(Accounts)]
pub struct VerifyHuman<'info> {
    #[account(
        mut,
        constraint = issuer.key() == config.authorized_issuer @ ErrorCode::InvalidIssuer
    )]
    pub issuer: Signer<'info>,

    #[account(
        seeds = [CONFIG_SEED],
        bump = config.bump
    )]
    pub config: Account<'info, GlobalConfig>,

    /// CHECK: subject wallet for the human proof
    pub wallet: UncheckedAccount<'info>,

    #[account(
        init_if_needed,
        payer = issuer,
        space = 8 + HumanAttestation::INIT_SPACE,
        seeds = [HUMAN_ATTESTATION_SEED, wallet.key().as_ref()],
        bump
    )]
    pub human_attestation: Account<'info, HumanAttestation>,

    pub system_program: Program<'info, System>,
}

pub fn verify_human_handler(
    ctx: Context<VerifyHuman>,
    provider_hash: [u8; 32],
    reclaim_proof_hash: [u8; 32],
    stable_id_hash: [u8; 32],
    expires_at: i64,
) -> Result<()> {
    let now = Clock::get()?.unix_timestamp;
    require!(expires_at > now, ErrorCode::InvalidExpiration);

    let human_attestation = &mut ctx.accounts.human_attestation;

    human_attestation.wallet = ctx.accounts.wallet.key();
    human_attestation.issuer = ctx.accounts.issuer.key();
    human_attestation.provider_hash = provider_hash;
    human_attestation.reclaim_proof_hash = reclaim_proof_hash;
    human_attestation.stable_id_hash = stable_id_hash;
    human_attestation.verified_at = now;
    human_attestation.expires_at = expires_at;
    human_attestation.revoked = false;
    human_attestation.bump = ctx.bumps.human_attestation;

    Ok(())
}
