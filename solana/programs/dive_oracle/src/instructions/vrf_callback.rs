use anchor_lang::prelude::*;

use crate::{error::ErrorCode, state::*, MAX_COMMITTEE_SIZE, SESSION_SEED};

#[derive(Clone)]
struct CandidateAgent {
    pub key: Pubkey,
    pub reputation: u64,
}

#[derive(Accounts)]
pub struct VrfCallback<'info> {
    #[account(address = ephemeral_vrf_sdk::consts::VRF_PROGRAM_IDENTITY)]
    pub vrf_program_identity: Signer<'info>,
    #[account(mut, seeds = [SESSION_SEED, session.market.as_ref()], bump = session.bump)]
    pub session: Account<'info, ResolutionSession>,
}

pub fn vrf_callback_handler<'info>(
    ctx: Context<'_, '_, 'info, 'info, VrfCallback<'info>>,
    randomness: [u8; 32],
) -> Result<()> {
    let mut candidates = Vec::new();
    for account_info in ctx.remaining_accounts.iter() {
        if let Ok(agent) = Account::<Agent>::try_from(account_info) {
            if agent.is_active {
                candidates.push(CandidateAgent {
                    key: agent.authority,
                    reputation: agent.reputation.max(1),
                });
            }
        }
    }

    require!(!candidates.is_empty(), ErrorCode::MissingCandidateAgents);

    let committee_size = usize::min(
        ctx.accounts.session.committee_size as usize,
        usize::min(candidates.len(), MAX_COMMITTEE_SIZE),
    );
    let committee = weighted_committee(randomness, candidates, committee_size)?;

    let session = &mut ctx.accounts.session;
    session.committee = committee;
    session.last_randomness = randomness;
    session.status = SessionStatus::CommitteeSelected;

    Ok(())
}

fn weighted_committee(
    randomness: [u8; 32],
    mut candidates: Vec<CandidateAgent>,
    committee_size: usize,
) -> Result<Vec<Pubkey>> {
    let mut selected = Vec::with_capacity(committee_size);
    let mut cursor = 0usize;

    while selected.len() < committee_size && !candidates.is_empty() {
        let total_weight = candidates.iter().try_fold(0u128, |acc, candidate| {
            acc.checked_add(candidate.reputation as u128)
                .ok_or(error!(ErrorCode::MathOverflow))
        })?;

        let mut threshold = (randomness[cursor % randomness.len()] as u128) % total_weight;
        let mut chosen_index = 0usize;

        for (index, candidate) in candidates.iter().enumerate() {
            let weight = candidate.reputation as u128;
            if threshold < weight {
                chosen_index = index;
                break;
            }
            threshold = threshold
                .checked_sub(weight)
                .ok_or(error!(ErrorCode::MathOverflow))?;
        }

        selected.push(candidates.remove(chosen_index).key);
        cursor = cursor.saturating_add(1);
    }

    Ok(selected)
}
