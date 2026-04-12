pub mod constants;
pub mod error;
pub mod instructions;
pub mod state;

use anchor_lang::prelude::*;

pub use constants::*;
pub use instructions::*;
pub use state::*;

declare_id!("7NqTfy2DAoy9XaHqYStigVNmSgJ2Mh9HS2Rcrve5WFYj");

#[program]
pub mod dive_identity {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>, authorized_issuer: Pubkey) -> Result<()> {
        instructions::initialize::initialize_handler(ctx, authorized_issuer)
    }

    pub fn verify_human(
        ctx: Context<VerifyHuman>,
        provider_hash: [u8; 32],
        reclaim_proof_hash: [u8; 32],
        stable_id_hash: [u8; 32],
        expires_at: i64,
    ) -> Result<()> {
        instructions::verify_human::verify_human_handler(
            ctx,
            provider_hash,
            reclaim_proof_hash,
            stable_id_hash,
            expires_at,
        )
    }

    pub fn revoke_attestation(ctx: Context<RevokeAttestation>) -> Result<()> {
        instructions::revoke_attestation::revoke_attestation_handler(ctx)
    }

    pub fn check_human(ctx: Context<CheckHuman>) -> Result<()> {
        instructions::check_human::check_human_handler(ctx)
    }
}
