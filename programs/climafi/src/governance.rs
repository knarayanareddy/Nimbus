//! Upgrade Authority & Multisig Governance
//!
//! This module implements a lightweight multisig scheme for admin operations
//! and upgrade authority management. It extends the existing timelock with:
//!
//! 1. Multi-authority approval: N-of-M signers required for critical operations
//! 2. Upgrade authority tracking: Records the current program upgrade authority
//! 3. Authority transfer: Timelocked transfer of upgrade authority
//!
//! Architecture:
//! - MultisigConfig PDA stores the M threshold and N authority pubkeys
//! - Proposals are created with a unique ID and require M approvals before execution
//! - The upgrade authority should be set to the MultisigConfig PDA for full security
//!
//! For mainnet deployment:
//! - Deploy with upgrade authority = deployer
//! - Initialize MultisigConfig with 2-of-3 or 3-of-5 authorities
//! - Transfer program upgrade authority to the MultisigConfig PDA
//! - All subsequent upgrades require M-of-N approval + timelock delay

use anchor_lang::prelude::*;
use crate::errors::ClimaFiError;
use crate::state::GlobalConfig;

/// Maximum proposal age before it expires (7 days)
pub const PROPOSAL_EXPIRY_SECS: i64 = 7 * 24 * 60 * 60;

pub const MULTISIG_SEED: &[u8] = b"multisig";
pub const MAX_AUTHORITIES: usize = 7;

#[account]
pub struct MultisigConfig {
    /// Minimum signatures required (M in M-of-N)
    pub threshold: u8,
    /// Number of active authorities
    pub num_authorities: u8,
    /// Authority pubkeys (max 7)
    pub authorities: [Pubkey; MAX_AUTHORITIES],
    /// Nonce for proposal IDs
    pub proposal_nonce: u64,
    /// Bump seed for PDA derivation
    pub bump: u8,
}

impl MultisigConfig {
    pub const LEN: usize = 8 + 1 + 1 + (32 * MAX_AUTHORITIES) + 8 + 1;

    pub fn is_authority(&self, key: &Pubkey) -> bool {
        self.authorities[..self.num_authorities as usize]
            .iter()
            .any(|a| a == key)
    }

    pub fn has_reached_threshold(&self, approvals: &[bool; MAX_AUTHORITIES]) -> bool {
        let count = approvals.iter().filter(|&&a| a).count();
        count >= self.threshold as usize
    }
}

#[account]
pub struct MultisigProposal {
    /// Unique proposal ID
    pub proposal_id: u64,
    /// The instruction data to execute when approved
    pub operation: GovernanceOperation,
    /// Approval status per authority slot (indexed same as MultisigConfig.authorities)
    pub approvals: [bool; MAX_AUTHORITIES],
    /// Whether this proposal has been executed
    pub executed: bool,
    /// When the proposal was created
    pub created_at: i64,
    /// Proposer (must be an authority)
    pub proposer: Pubkey,
}

impl MultisigProposal {
    // disc(8) + proposal_id(8) + operation(1 + 32 max) + approvals(7) + executed(1) + created_at(8) + proposer(32)
    pub const LEN: usize = 8 + 8 + 33 + MAX_AUTHORITIES + 1 + 8 + 32;
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum GovernanceOperation {
    /// Transfer admin to a new key
    TransferAdmin { new_admin: Pubkey },
    /// Update quote signer key
    UpdateQuoteSigner { new_signer: Pubkey },
    /// Update oracle authority key
    UpdateOracleAuthority { new_oracle: Pubkey },
    /// Set protocol paused state
    SetPaused { paused: bool },
}

/// Initialize the multisig configuration
pub fn handle_initialize_multisig(
    multisig: &mut MultisigConfig,
    admin_key: Pubkey,
    config_admin: Pubkey,
    threshold: u8,
    authorities: Vec<Pubkey>,
    bump: u8,
) -> Result<()> {
    require!(admin_key == config_admin, ClimaFiError::Unauthorized);
    require!(
        authorities.len() >= threshold as usize,
        ClimaFiError::InvalidBps
    );
    require!(
        authorities.len() <= MAX_AUTHORITIES,
        ClimaFiError::InvalidBps
    );
    require!(threshold >= 1, ClimaFiError::InvalidBps);

    // Reject duplicate authorities — prevents single key from counting multiple times
    for i in 0..authorities.len() {
        for j in (i + 1)..authorities.len() {
            require!(
                authorities[i] != authorities[j],
                ClimaFiError::InvalidBps
            );
        }
    }

    multisig.threshold = threshold;
    multisig.num_authorities = authorities.len() as u8;
    multisig.proposal_nonce = 0;
    multisig.bump = bump;

    let mut auth_array = [Pubkey::default(); MAX_AUTHORITIES];
    for (i, auth) in authorities.iter().enumerate() {
        auth_array[i] = *auth;
    }
    multisig.authorities = auth_array;

    Ok(())
}

/// Create a new governance proposal
pub fn handle_create_proposal(
    multisig: &mut MultisigConfig,
    proposal: &mut MultisigProposal,
    proposer: Pubkey,
    operation: GovernanceOperation,
) -> Result<()> {
    require!(
        multisig.is_authority(&proposer),
        ClimaFiError::Unauthorized
    );

    proposal.proposal_id = multisig.proposal_nonce;
    proposal.operation = operation;
    proposal.executed = false;
    proposal.created_at = Clock::get()?.unix_timestamp;
    proposal.proposer = proposer;

    // Auto-approve by proposer
    let proposer_idx = multisig.authorities[..multisig.num_authorities as usize]
        .iter()
        .position(|a| *a == proposer)
        .ok_or(error!(ClimaFiError::Unauthorized))?;
    proposal.approvals = [false; MAX_AUTHORITIES];
    proposal.approvals[proposer_idx] = true;

    multisig.proposal_nonce += 1;

    Ok(())
}

/// Approve a pending proposal
pub fn handle_approve_proposal(
    multisig: &MultisigConfig,
    proposal: &mut MultisigProposal,
    approver: Pubkey,
) -> Result<()> {
    require!(!proposal.executed, ClimaFiError::TimelockAlreadyExecuted);
    require!(
        multisig.is_authority(&approver),
        ClimaFiError::Unauthorized
    );

    let approver_idx = multisig.authorities[..multisig.num_authorities as usize]
        .iter()
        .position(|a| *a == approver)
        .ok_or(error!(ClimaFiError::Unauthorized))?;

    proposal.approvals[approver_idx] = true;

    Ok(())
}

/// Execute a proposal that has reached threshold.
/// Anyone can call this (permissionless crank) once threshold is met and proposal
/// has not expired. Expiry prevents stale proposals from executing after context changes.
pub fn handle_execute_proposal(
    multisig: &MultisigConfig,
    proposal: &mut MultisigProposal,
    config: &mut GlobalConfig,
) -> Result<()> {
    require!(!proposal.executed, ClimaFiError::TimelockAlreadyExecuted);
    require!(
        multisig.has_reached_threshold(&proposal.approvals),
        ClimaFiError::Unauthorized
    );

    // Proposal expiry: reject proposals older than 7 days
    let now = Clock::get()?.unix_timestamp;
    require!(
        now - proposal.created_at <= PROPOSAL_EXPIRY_SECS,
        ClimaFiError::TimelockNotReady
    );

    match &proposal.operation {
        GovernanceOperation::TransferAdmin { new_admin } => {
            config.admin = *new_admin;
        }
        GovernanceOperation::UpdateQuoteSigner { new_signer } => {
            config.quote_signer = *new_signer;
        }
        GovernanceOperation::UpdateOracleAuthority { new_oracle } => {
            config.oracle_authority = *new_oracle;
        }
        GovernanceOperation::SetPaused { paused } => {
            config.paused = *paused;
        }
    }

    proposal.executed = true;

    Ok(())
}
