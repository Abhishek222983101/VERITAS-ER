use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct HumanAttestation {
    pub wallet: Pubkey,
    pub issuer: Pubkey,
    pub provider_hash: [u8; 32],
    pub reclaim_proof_hash: [u8; 32],
    pub stable_id_hash: [u8; 32],
    pub verified_at: i64,
    pub expires_at: i64,
    pub revoked: bool,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct GlobalConfig {
    pub authority: Pubkey,
    pub authorized_issuer: Pubkey,
    pub bump: u8,
}
