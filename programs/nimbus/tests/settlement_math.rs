#[path = "../src/settlement_math.rs"]
mod settlement_math;

use settlement_math::{settle_balances, SettlementError};

#[test]
fn payout_decrements_capital_and_unlocks_liability() {
    assert_eq!(settle_balances(100, 60, 30, true), Ok((70, 30)));
}

#[test]
fn no_trigger_preserves_capital_and_unlocks_liability() {
    assert_eq!(settle_balances(100, 60, 30, false), Ok((100, 30)));
}

#[test]
fn exact_exhausted_balance_is_valid() {
    assert_eq!(settle_balances(40, 40, 40, true), Ok((0, 0)));
}

#[test]
fn rejects_locked_exceeding_capital() {
    assert_eq!(
        settle_balances(9, 10, 1, false),
        Err(SettlementError::Insolvent)
    );
}

#[test]
fn rejects_liability_exceeding_locked() {
    assert_eq!(
        settle_balances(10, 4, 5, false),
        Err(SettlementError::InsufficientUnlockedCapital)
    );
}

#[test]
fn rejects_payout_exceeding_reserved_liability() {
    assert_eq!(
        settle_balances(10, 8, 9, true),
        Err(SettlementError::InsufficientUnlockedCapital)
    );
}

#[test]
fn multiple_policy_settlements_conserve_capital_and_release_reserves() {
    let (capital, locked) = settle_balances(100, 70, 30, true).unwrap();
    let (capital, locked) = settle_balances(capital, locked, 20, false).unwrap();
    let (capital, locked) = settle_balances(capital, locked, 20, true).unwrap();
    assert_eq!((capital, locked), (50, 0));
}

#[test]
fn liability_boundaries_are_checked() {
    assert_eq!(settle_balances(100, 100, 100, false), Ok((100, 0)));
    assert_eq!(
        settle_balances(u64::MAX, u64::MAX, 1, false),
        Ok((u64::MAX, u64::MAX - 1))
    );
}
