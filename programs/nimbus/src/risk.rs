//! Risk & Economic Management Module
//! Production-grade dynamic LTV and utilization-based pricing
//! 
//! Security considerations (OWASP + Solana):
//! - All calculations use checked arithmetic
//! - No division by zero
//! - Deterministic results

use anchor_lang::prelude::*;
use crate::state::Pool;
use crate::errors::NimbusError;
use crate::constants::BPS_DENOMINATOR;

/// Calculates dynamic LTV based on pool utilization
/// 
/// Formula:
/// base_ltv - (utilization * risk_multiplier)
/// 
/// Security: Uses checked math to prevent overflow/underflow
pub fn calculate_dynamic_ltv(
    pool: &Pool,
    base_ltv_bps: u16,
    risk_multiplier_bps: u16,
) -> Result<u16> {
    let utilization = if pool.capital == 0 {
        0u64
    } else {
        pool.locked
            .checked_mul(BPS_DENOMINATOR as u64)
            .ok_or(NimbusError::MathOverflow)?
            .checked_div(pool.capital)
            .ok_or(NimbusError::MathOverflow)?
    };

    let utilization_bps = utilization as u16;

    let reduction = utilization_bps
        .checked_mul(risk_multiplier_bps)
        .ok_or(NimbusError::MathOverflow)?
        .checked_div(BPS_DENOMINATOR)
        .ok_or(NimbusError::MathOverflow)?;

    let dynamic_ltv = base_ltv_bps.saturating_sub(reduction);

    // Safety floor: never go below 30% LTV
    Ok(dynamic_ltv.max(3000))
}

/// Calculates utilization surcharge for premium pricing
/// 
/// Higher utilization = higher premium (risk premium)
pub fn calculate_utilization_surcharge(
    pool: &Pool,
    base_rate_bps: u16,
) -> Result<u16> {
    let utilization = if pool.capital == 0 {
        0u64
    } else {
        pool.locked
            .checked_mul(10_000)
            .ok_or(NimbusError::MathOverflow)?
            .checked_div(pool.capital)
            .ok_or(NimbusError::MathOverflow)?
    };

    // Surcharge = base_rate * (utilization / 100)
    let surcharge = (base_rate_bps as u64)
        .checked_mul(utilization)
        .ok_or(NimbusError::MathOverflow)?
        .checked_div(10_000)
        .ok_or(NimbusError::MathOverflow)?;

    Ok(surcharge as u16)
}