use anchor_lang::prelude::*;
use dive_identity::state::HumanAttestation;
use dive_identity::HUMAN_ATTESTATION_SEED;

use crate::{error::ErrorCode, state::*, AGENT_SEED, DEFAULT_REPUTATION};

#[derive(Accounts)]
pub struct RegisterAgent<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    
    #[account(
        seeds = [HUMAN_ATTESTATION_SEED, authority.key().as_ref()],
        bump,
        seeds::program = dive_identity::ID,
    )]
    pub human_attestation: Account<'info, HumanAttestation>,

    #[account(
        init_if_needed,
        payer = authority,
        space = 8 + Agent::INIT_SPACE,
        seeds = [AGENT_SEED, authority.key().as_ref()],
        bump
    )]
    pub agent: Account<'info, Agent>,
    
    pub system_program: Program<'info, System>,
}

pub fn register_agent_handler(
    ctx: Context<RegisterAgent>,
    name: String,
    personality_hash: [u8; 32],
) -> Result<()> {
    require!(
        !name.trim().is_empty() && name.len() <= 32,
        ErrorCode::InvalidAgentName
    );

    let now = Clock::get()?.unix_timestamp;

    // Verify human attestation is valid
    let attestation = &ctx.accounts.human_attestation;
    require!(!attestation.revoked, ErrorCode::AttestationRevoked);
    require!(attestation.expires_at > now, ErrorCode::AttestationExpired);

    let existing_reputation = if ctx.accounts.agent.authority == Pubkey::default() {
        DEFAULT_REPUTATION
    } else {
        ctx.accounts.agent.reputation
    };

    let agent = &mut ctx.accounts.agent;
    agent.authority = ctx.accounts.authority.key();
    agent.sas_attestation = attestation.key();
    agent.name = name;
    agent.personality_hash = personality_hash;
    agent.reputation = existing_reputation;
    agent.total_votes = agent.total_votes.max(0);
    agent.correct_votes = agent.correct_votes.max(0);
    agent.is_active = true;
    agent.created_at = if agent.created_at == 0 {
        now
    } else {
        agent.created_at
    };
    agent.updated_at = now;
    agent.bump = ctx.bumps.agent;

    Ok(())
}
