//! On-Chain Timelock for Admin Operations
//!
//! Security: Prevents instant malicious admin actions by enforcing a delay
//! between scheduling and executing sensitive operations.
//! Supports: key rotation (quote_signer, oracle_authority), pause toggle.

use anchor_lang::prelude::*;

pub const DEFAULT_DELAY_SECONDS: u32 = 86400; // 24 hours
pub const MIN_TIMELOCK_DELAY: u32 = 3600; // 1 hour minimum (H-05 fix)

#[account]
pub struct Timelock {
    pub admin: Pubkey,
    pub delay_seconds: u32,
    pub pending_operation: Option<PendingOperation>,
}

impl Timelock {
    // discriminator(8) + admin(32) + delay(4) + option_tag(1) + PendingOperation max
    pub const LEN: usize = 8 + 32 + 4 + 1 + PendingOperation::LEN;
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct PendingOperation {
    pub operation: AdminOperation,
    pub scheduled_at: i64,
    pub executed: bool,
}

impl PendingOperation {
    // operation(1 + 32) + scheduled_at(8) + executed(1) + padding
    pub const LEN: usize = 1 + 32 + 8 + 1 + 16;
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub enum AdminOperation {
    SetPaused { paused: bool },
    UpdateQuoteSigner { new_signer: Pubkey },
    UpdateOracleAuthority { new_authority: Pubkey },
    UpdateAdmin { new_admin: Pubkey },
}

impl AdminOperation {
    pub fn description(&self) -> &'static str {
        match self {
            AdminOperation::SetPaused { .. } => "SetPaused",
            AdminOperation::UpdateQuoteSigner { .. } => "UpdateQuoteSigner",
            AdminOperation::UpdateOracleAuthority { .. } => "UpdateOracleAuthority",
            AdminOperation::UpdateAdmin { .. } => "UpdateAdmin",
        }
    }
}
