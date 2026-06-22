//! Reentrancy Guard for Solana Programs
//! Uses instruction introspection to detect CPI calls back into this program
//! within the same transaction.

use anchor_lang::prelude::*;
use solana_program::sysvar::instructions::{load_instruction_at_checked, ID as InstructionsID};

pub fn assert_no_cpi_in_transaction(instructions_sysvar: &AccountInfo) -> Result<()> {
    let program_id = crate::ID;
    let mut idx: usize = 0;

    // Iterate through all instructions in the transaction
    loop {
        match load_instruction_at_checked(idx, instructions_sysvar) {
            Ok(ix) => {
                // If another instruction targets our program AND is not the current one,
                // it could be a reentrancy vector via CPI ordering.
                // For safety, we reject any transaction that calls this program more than once.
                if ix.program_id == program_id && idx > 0 {
                    // Check if this is a CPI (inner instruction) by verifying
                    // the instruction count. Multiple calls to the same program
                    // in a single transaction is suspicious.
                    // This is a conservative guard - allow at most one call to our program.
                    let mut our_program_count = 0u8;
                    let mut check_idx = 0usize;
                    loop {
                        match load_instruction_at_checked(check_idx, instructions_sysvar) {
                            Ok(check_ix) => {
                                if check_ix.program_id == program_id {
                                    our_program_count += 1;
                                }
                                check_idx += 1;
                            }
                            Err(_) => break,
                        }
                    }
                    if our_program_count > 1 {
                        return Err(error!(crate::errors::ClimaFiError::Unauthorized));
                    }
                }
                idx += 1;
            }
            Err(_) => break,
        }
    }

    Ok(())
}
