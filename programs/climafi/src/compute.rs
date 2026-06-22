//! Compute Budget constants for settlement operations.
//! The actual ComputeBudgetInstruction is prepended client-side.

pub const SETTLEMENT_COMPUTE_UNITS: u32 = 400_000; // Safe for up to 31 days
