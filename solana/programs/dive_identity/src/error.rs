use anchor_lang::prelude::*;

#[error_code]
pub enum ErrorCode {
    #[msg("Expiration timestamp must be in the future")]
    InvalidExpiration,
    #[msg("Only the attestation issuer may revoke or update this attestation")]
    InvalidIssuer,
    #[msg("Attestation is revoked")]
    AttestationRevoked,
    #[msg("Attestation has expired")]
    AttestationExpired,
}
