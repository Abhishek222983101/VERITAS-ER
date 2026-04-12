use anchor_lang::prelude::*;

use crate::{error::ErrorCode, state::*, HUMAN_ATTESTATION_SEED};

#[derive(Accounts)]
pub struct RevokeAttestation<'info> {
    #[account(mut)]
    pub issuer: Signer<'info>,
    /// CHECK: subject wallet used to derive the attestation PDA
    pub wallet: UncheckedAccount<'info>,
    #[account(
        mut,
        seeds = [HUMAN_ATTESTATION_SEED, wallet.key().as_ref()],
        bump = human_attestation.bump
    )]
    pub human_attestation: Account<'info, HumanAttestation>,
}

pub fn revoke_attestation_handler(ctx: Context<RevokeAttestation>) -> Result<()> {
    require_keys_eq!(
        ctx.accounts.human_attestation.issuer,
        ctx.accounts.issuer.key(),
        ErrorCode::InvalidIssuer
    );
    ctx.accounts.human_attestation.revoked = true;
    Ok(())
}
