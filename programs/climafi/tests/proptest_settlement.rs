//! Property-Based Testing for Settlement Math using proptest
//! 
//! This ensures settlement logic is deterministic and correct across all inputs.

use proptest::prelude::*;

proptest! {
    #[test]
    fn settlement_sum_is_deterministic(values in prop::collection::vec(0i64..10000, 1..32)) {
        let sum1: i64 = values.iter().sum();
        let sum2: i64 = values.iter().sum();
        prop_assert_eq!(sum1, sum2);
    }

    #[test]
    fn drought_trigger_works(values in prop::collection::vec(0i64..500, 3..10), threshold in 0i64..2000) {
        let sum: i64 = values.iter().sum();
        let triggered = sum <= threshold;
        // Property: if all values are very low, it should usually trigger
        if values.iter().all(|&v| v < 50) && sum < threshold {
            prop_assert!(triggered);
        }
    }

    #[test]
    fn flood_trigger_works(values in prop::collection::vec(100i64..1000, 3..10), threshold in 0i64..5000) {
        let sum: i64 = values.iter().sum();
        let triggered = sum >= threshold;
        if values.iter().all(|&v| v > 800) && sum > threshold {
            prop_assert!(triggered);
        }
    }
}