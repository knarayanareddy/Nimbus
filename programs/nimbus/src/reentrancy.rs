//! Reentrancy Guard for Solana Programs
//! Uses instruction introspection to detect multiple invocations of this program
//! within the same transaction (S-02 fix: simplified single-pass count).

use anchor_lang::prelude::*;
use solana_program::sysvar::instructions::load_instruction_at_checked;

pub fn assert_no_cpi_in_transaction(instructions_sysvar: &AccountInfo) -> Result<()> {
    let program_id = crate::ID;
    let mut count = 0u8;
    let mut idx: usize = 0;

    while let Ok(ix) = load_instruction_at_checked(idx, instructions_sysvar) {
        if ix.program_id == program_id {
            count += 1;
        }
        idx += 1;
    }

    // Only one invocation of this program per transaction is allowed
    require!(count <= 1, crate::errors::NimbusError::Unauthorized);

    Ok(())
}
