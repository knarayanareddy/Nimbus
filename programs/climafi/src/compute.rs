//! Compute Budget Management for Long Settlement Windows
//! Prevents transaction failures on large observation windows

use anchor_lang::prelude::*;
use solana_program::compute_budget::ComputeBudgetInstruction;

pub fn request_compute_units(units: u32) -> Instruction {
    ComputeBudgetInstruction::set_compute_unit_limit(units)
}

pub const SETTLEMENT_COMPUTE_UNITS: u32 = 400_000; // Safe for up to 31 days