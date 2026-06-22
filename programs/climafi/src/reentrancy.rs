//! Reentrancy Guard for Solana Programs
//! Uses instruction introspection to detect CPI calls back into this program
//! within the same transaction.

use anchor_lang::prelude::*;
use solana_program::sysvar::instructions::load_instruction_at_checked;

pub fn assert_no_cpi_in_transaction(instructions_sysvar: &AccountInfo) -> Result<()> {
    let program_id = crate::ID;
    let mut idx: usize = 0;

    while let Ok(ix) = load_instruction_at_checked(idx, instructions_sysvar) {
        if ix.program_id == program_id && idx > 0 {
            let mut our_program_count = 0u8;
            let mut check_idx = 0usize;
            while let Ok(check_ix) = load_instruction_at_checked(check_idx, instructions_sysvar) {
                if check_ix.program_id == program_id {
                    our_program_count += 1;
                }
                check_idx += 1;
            }
            if our_program_count > 1 {
                return Err(error!(crate::errors::ClimaFiError::Unauthorized));
            }
        }
        idx += 1;
    }

    Ok(())
}
