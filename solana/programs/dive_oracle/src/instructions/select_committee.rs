use anchor_lang::prelude::*;
use ephemeral_vrf_sdk::anchor::vrf;
use ephemeral_vrf_sdk::instructions::{create_request_randomness_ix, RequestRandomnessParams};
use ephemeral_vrf_sdk::types::SerializableAccountMeta;

use crate::{error::ErrorCode, state::*, SESSION_SEED};

#[vrf]
#[derive(Accounts)]
pub struct SelectCommittee<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(mut, seeds = [SESSION_SEED, session.market.as_ref()], bump = session.bump)]
    pub session: Account<'info, ResolutionSession>,
    /// CHECK: MagicBlock VRF queue account
    #[account(mut, address = ephemeral_vrf_sdk::consts::DEFAULT_QUEUE)]
    pub oracle_queue: AccountInfo<'info>,
}

pub fn select_committee_handler(
    ctx: Context<SelectCommittee>,
    caller_seed: [u8; 32],
) -> Result<()> {
    let session = &ctx.accounts.session;
    require!(
        matches!(
            session.status,
            SessionStatus::PendingSelection | SessionStatus::Discussion
        ),
        ErrorCode::InvalidSessionStatus
    );

    let ix = create_request_randomness_ix(RequestRandomnessParams {
        payer: ctx.accounts.authority.key(),
        oracle_queue: ctx.accounts.oracle_queue.key(),
        callback_program_id: crate::ID,
        callback_discriminator: crate::instruction::VrfCallback::DISCRIMINATOR.to_vec(),
        caller_seed,
        accounts_metas: Some(vec![SerializableAccountMeta {
            pubkey: ctx.accounts.session.key(),
            is_signer: false,
            is_writable: true,
        }]),
        ..Default::default()
    });

    ctx.accounts
        .invoke_signed_vrf(&ctx.accounts.authority.to_account_info(), &ix)?;

    Ok(())
}
