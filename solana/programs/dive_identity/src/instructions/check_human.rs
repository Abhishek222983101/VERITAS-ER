use anchor_lang::prelude::*;

use crate::{error::ErrorCode, state::*, HUMAN_ATTESTATION_SEED};

#[derive(Accounts)]
pub struct CheckHuman<'info> {
    /// CHECK: subject wallet used to derive the attestation PDA
    pub wallet: UncheckedAccount<'info>,
    #[account(
        seeds = [HUMAN_ATTESTATION_SEED, wallet.key().as_ref()],
        bump = human_attestation.bump
    )]
    pub human_attestation: Account<'info, HumanAttestation>,
}

pub fn check_human_handler(ctx: Context<CheckHuman>) -> Result<()> {
    let attestation = &ctx.accounts.human_attestation;
    require!(!attestation.revoked, ErrorCode::AttestationRevoked);
    require!(
        attestation.expires_at > Clock::get()?.unix_timestamp,
        ErrorCode::AttestationExpired
    );
    Ok(())
}
