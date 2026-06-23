//! Per-Signer Quote Nonce PDA
//! Prevents replay attacks while avoiding global nonce griefing.
//!
//! Each buyer gets their own nonce account derived from their pubkey.
//! An attacker cannot grief other users by incrementing a global counter.

use anchor_lang::prelude::*;
use crate::errors::NimbusError;

pub const QUOTE_NONCE_SEED: &[u8] = b"quote_nonce";

#[account]
pub struct QuoteNonce {
    pub signer: Pubkey,
    pub last_nonce: u64,
}

impl QuoteNonce {
    pub const LEN: usize = 8 + 32 + 8; // discriminator + signer + last_nonce
}

/// Validates and increments the per-signer nonce.
/// The nonce must be strictly greater than the last used nonce.
pub fn validate_and_increment_nonce(
    nonce_account: &mut Account<QuoteNonce>,
    expected_signer: &Pubkey,
    nonce: u64,
) -> Result<()> {
    require!(
        nonce_account.signer == *expected_signer,
        NimbusError::Unauthorized
    );
    require!(
        nonce > nonce_account.last_nonce,
        NimbusError::NonceAlreadyUsed
    );
    nonce_account.last_nonce = nonce;
    Ok(())
}
