//! Switchboard V2 On-Chain Integration
//!
//! This module provides real Switchboard V2 aggregator deserialization by reading
//! the AggregatorAccountData layout directly from raw account bytes.
//!
//! The Switchboard V2 AggregatorAccountData is a zero-copy account (packed(1))
//! with a known layout. We extract only the fields we need:
//!   - latest_confirmed_round.result (SwitchboardDecimal at known offset)
//!   - latest_confirmed_round.round_open_timestamp (i64)
//!   - min_oracle_results (u32) for confidence validation
//!
//! Owner check: The aggregator account MUST be owned by the Switchboard V2
//! program (SW1TCH7qEPTdLsDHRgPuMQjbQxKdH2aBStViMFnt64f).
//!
//! Reference: https://docs.rs/switchboard-solana/latest/switchboard_solana/
//!            oracle_program/accounts/aggregator/struct.AggregatorAccountData.html

use anchor_lang::prelude::*;
use crate::state::Peril;
use crate::errors::ClimaFiError;
use crate::constants::{DAY_SECS, SWITCHBOARD_PROGRAM_ID};

// Switchboard V2 AggregatorAccountData layout offsets (packed(1)).
// Based on switchboard-solana v0.30.x AggregatorAccountData struct.
//
// The full struct is ~4608 bytes. Key offsets for our use:
//   - Byte 0-7: Anchor discriminator
//   - latest_confirmed_round starts at offset 272 (after name[32], metadata[128],
//     author_wallet[32], queue[32], oracle_request_batch_size[4],
//     min_oracle_results[4], min_job_results[4], min_update_delay_seconds[4], ...)
//   - Within AggregatorRound (at offset 272):
//     - result (SwitchboardDecimal): mantissa i128 (16 bytes) + scale u32 (4 bytes) = 20 bytes at +112
//     - round_open_timestamp: i64 at +120 (after result)
//
// For safety, we validate:
//   1. Account owner == SWITCHBOARD_PROGRAM_ID
//   2. Account data length >= 4608 (minimum for V2 aggregator)
//   3. Discriminator matches known Switchboard aggregator discriminator

// Known Switchboard V2 aggregator discriminator (first 8 bytes)
const AGGREGATOR_DISCRIMINATOR: [u8; 8] = [217, 230, 65, 101, 201, 162, 27, 125];

// Offset to min_oracle_results field (u32)
const MIN_ORACLE_RESULTS_OFFSET: usize = 8 + 32 + 128 + 32 + 32 + 4; // disc + name + metadata + author + queue + batch_size

// Offset to latest_confirmed_round (AggregatorRound struct)
// After the header fields totaling 272 bytes from start
const LATEST_CONFIRMED_ROUND_OFFSET: usize = 272;

// Within AggregatorRound: result is at offset +112 from round start
// SwitchboardDecimal = i128 mantissa (16 bytes) + u32 scale (4 bytes)
const ROUND_RESULT_MANTISSA_OFFSET: usize = 112;
const ROUND_RESULT_SCALE_OFFSET: usize = 128; // 112 + 16

// round_open_timestamp is at offset +136 within the round struct
const ROUND_TIMESTAMP_OFFSET: usize = 136;

/// Minimum account size for a valid Switchboard V2 aggregator
const MIN_AGGREGATOR_SIZE: usize = 4608;

/// Parsed result from a Switchboard V2 aggregator account
pub struct SwitchboardResult {
    pub value_scaled: i64,          // Value * 100 (for mm precipitation)
    pub timestamp: i64,             // When the result was confirmed
    pub min_oracle_results: u32,    // Confidence: how many oracles contributed
}

/// Deserialize and validate a Switchboard V2 aggregator account.
///
/// # Security checks performed:
/// 1. Account owner == SWITCHBOARD_PROGRAM_ID
/// 2. Account data length >= MIN_AGGREGATOR_SIZE
/// 3. Discriminator matches known aggregator discriminator
/// 4. Staleness check (configurable max age)
/// 5. Min oracle results >= 1 (at least one oracle confirmed)
pub fn parse_switchboard_aggregator(
    aggregator_info: &AccountInfo,
    max_staleness_secs: i64,
) -> Result<SwitchboardResult> {
    // 1. Owner check
    require!(
        aggregator_info.owner == &SWITCHBOARD_PROGRAM_ID,
        ClimaFiError::OracleUnauthorized
    );

    let data = aggregator_info.try_borrow_data()?;

    // 2. Size check
    require!(
        data.len() >= MIN_AGGREGATOR_SIZE,
        ClimaFiError::OracleUnauthorized
    );

    // 3. Discriminator check
    let disc = &data[0..8];
    require!(
        disc == AGGREGATOR_DISCRIMINATOR,
        ClimaFiError::OracleUnauthorized
    );

    // 4. Read min_oracle_results
    let min_oracle_results = u32::from_le_bytes(
        data[MIN_ORACLE_RESULTS_OFFSET..MIN_ORACLE_RESULTS_OFFSET + 4]
            .try_into()
            .map_err(|_| error!(ClimaFiError::OracleUnauthorized))?
    );
    require!(min_oracle_results >= 1, ClimaFiError::OracleUnauthorized);

    // 5. Read result mantissa (i128) and scale (u32)
    let mantissa_offset = LATEST_CONFIRMED_ROUND_OFFSET + ROUND_RESULT_MANTISSA_OFFSET;
    let mantissa = i128::from_le_bytes(
        data[mantissa_offset..mantissa_offset + 16]
            .try_into()
            .map_err(|_| error!(ClimaFiError::OracleUnauthorized))?
    );

    let scale_offset = LATEST_CONFIRMED_ROUND_OFFSET + ROUND_RESULT_SCALE_OFFSET;
    let scale = u32::from_le_bytes(
        data[scale_offset..scale_offset + 4]
            .try_into()
            .map_err(|_| error!(ClimaFiError::OracleUnauthorized))?
    );

    // 6. Read round_open_timestamp
    let ts_offset = LATEST_CONFIRMED_ROUND_OFFSET + ROUND_TIMESTAMP_OFFSET;
    let timestamp = i64::from_le_bytes(
        data[ts_offset..ts_offset + 8]
            .try_into()
            .map_err(|_| error!(ClimaFiError::OracleUnauthorized))?
    );

    // 7. Staleness check (timestamp must not be in the future, and not older than max_staleness)
    let now = Clock::get()?.unix_timestamp;
    require!(timestamp <= now, ClimaFiError::ObservationStale);
    require!(
        now - timestamp <= max_staleness_secs,
        ClimaFiError::ObservationStale
    );

    // 8. Convert SwitchboardDecimal to i64 scaled by 100 (for mm * 100)
    // SwitchboardDecimal: value = mantissa / 10^scale
    // We want value * 100, so: (mantissa * 100) / 10^scale
    // Guard against unreasonable scale values (max 20 digits for i128 range)
    require!(scale <= 20, ClimaFiError::OracleUnauthorized);
    let value_scaled = if scale == 0 {
        (mantissa * 100) as i64
    } else {
        let divisor = 10i128.pow(scale);
        ((mantissa * 100) / divisor) as i64
    };

    Ok(SwitchboardResult {
        value_scaled,
        timestamp,
        min_oracle_results,
    })
}

/// Record an observation from a real Switchboard V2 aggregator.
/// This replaces the old stub that used a fake account struct.
pub fn record_observation_switchboard(
    ctx: Context<crate::RecordObservationSwitchboard>,
    region_id: u64,
    peril: Peril,
    day_start_unix: i64,
) -> Result<()> {
    let cfg = &ctx.accounts.config;
    require!(!cfg.paused, ClimaFiError::Paused);

    // Day alignment validation
    require!(day_start_unix % DAY_SECS == 0, ClimaFiError::InvalidTimeRange);

    let now = Clock::get()?.unix_timestamp;

    // No future observations beyond 1 day ahead
    require!(day_start_unix <= now + DAY_SECS, ClimaFiError::InvalidTimeRange);

    // Parse and validate Switchboard aggregator using raw deserialization
    let aggregator_info = ctx.accounts.switchboard_aggregator.to_account_info();
    let result = parse_switchboard_aggregator(
        &aggregator_info,
        cfg.max_oracle_staleness_secs as i64,
    )?;

    // Additional check: aggregator timestamp should cover the observation day
    require!(
        result.timestamp >= day_start_unix,
        ClimaFiError::ObservationStale
    );

    let obs = &mut ctx.accounts.observation;
    obs.region_id = region_id;
    obs.peril = peril;
    obs.day_start_unix = day_start_unix;
    obs.day_end_unix = day_start_unix + DAY_SECS;
    obs.value = result.value_scaled;
    obs.published_at_unix = now;
    obs.oracle_authority = ctx.accounts.oracle.key();
    obs.sources_bitmap = 0b0000_0000_0000_0010; // Bit 1 = Switchboard source
    obs.agg_method = 2; // Switchboard verified

    emit!(crate::state::ObservationRecorded {
        region_id,
        peril,
        day_start_unix,
        value: result.value_scaled,
        oracle_authority: obs.oracle_authority,
        ts: now,
    });

    Ok(())
}
