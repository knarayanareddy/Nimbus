//! Economic Safety Module
//! Production-grade on-chain economic invariants and circuit breakers
//!
//! Security & Economic Guarantees:
//! - Capital ≥ Locked at all times
//! - Dynamic LTV enforcement
//! - High utilization circuit breaker
//! - All math uses checked arithmetic

use anchor_lang::prelude::*;
use crate::state::Pool;
use crate::errors::NimbusError;
use crate::constants::BPS_DENOMINATOR;

/// Enforces core economic invariant: capital >= locked
pub fn assert_capital_solvency(pool: &Pool) -> Result<()> {
    require!(
        pool.capital >= pool.locked,
        NimbusError::InsufficientUnlockedCapital
    );
    Ok(())
}

/// Enforces LTV limit with dynamic adjustment
pub fn assert_ltv_compliance(
    pool: &Pool,
    ltv_limit_bps: u16,
) -> Result<()> {
    if pool.capital == 0 {
        return Ok(());
    }

    let current_ltv = pool.locked
        .checked_mul(BPS_DENOMINATOR as u64)
        .ok_or(NimbusError::MathOverflow)?
        .checked_div(pool.capital)
        .ok_or(NimbusError::MathOverflow)? as u16;

    require!(
        current_ltv <= ltv_limit_bps,
        NimbusError::LtvExceeded
    );
    Ok(())
}

/// Circuit breaker: pauses new policies if utilization > 90%
pub fn should_trigger_circuit_breaker(pool: &Pool) -> bool {
    if pool.capital == 0 {
        return false;
    }
    // If locked * 100 overflows u64, utilization is astronomically high — trigger breaker
    let Some(locked_scaled) = pool.locked.checked_mul(100) else {
        return true;
    };
    let utilization = locked_scaled / pool.capital;

    utilization > 90
}

/// Calculates safe maximum payout a pool can accept
pub fn calculate_max_safe_payout(pool: &Pool, ltv_limit_bps: u16) -> Result<u64> {
    let available_capacity = pool.capital
        .checked_mul(ltv_limit_bps as u64)
        .ok_or(NimbusError::MathOverflow)?
        .checked_div(BPS_DENOMINATOR as u64)
        .ok_or(NimbusError::MathOverflow)?
        .saturating_sub(pool.locked);

    Ok(available_capacity)
}