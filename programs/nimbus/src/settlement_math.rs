#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SettlementError {
    InsufficientUnlockedCapital,
    Insolvent,
}

/// Computes pool balances after releasing a policy's maximum liability.
/// The payout amount is deducted from capital only when the policy triggers.
pub fn settle_balances(
    capital: u64,
    locked: u64,
    payout_limit: u64,
    triggered: bool,
) -> Result<(u64, u64), SettlementError> {
    if capital < locked {
        return Err(SettlementError::Insolvent);
    }

    capital
        .checked_sub(locked)
        .ok_or(SettlementError::Insolvent)?;
    let ending_locked = locked
        .checked_sub(payout_limit)
        .ok_or(SettlementError::InsufficientUnlockedCapital)?;
    let ending_capital = if triggered {
        capital
            .checked_sub(payout_limit)
            .ok_or(SettlementError::Insolvent)?
    } else {
        capital
    };

    if ending_capital < ending_locked {
        return Err(SettlementError::Insolvent);
    }
    Ok((ending_capital, ending_locked))
}
