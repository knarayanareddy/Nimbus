//! Switchboard V2 On-Chain Integration (MVP)
//!
//! SECURITY NOTE (C-03): This module uses a simplified aggregator struct for MVP.
//! For mainnet deployment, replace with the official `switchboard-v2` crate
//! and deserialize `AggregatorAccountData` properly.
//!
//! The current struct layout does NOT match real Switchboard V2 accounts.
//! The owner check ensures the account is owned by the Switchboard program,
//! and the discriminator check (via Anchor's Account<>) provides additional
//! safety, but a full integration requires the official crate.

use anchor_lang::prelude::*;
use crate::state::Peril;
use crate::errors::ClimaFiError;
use crate::constants::DAY_SECS;

/// Switchboard aggregator account data (simplified for MVP)
/// WARNING: This does NOT match the real Switchboard V2 AggregatorAccountData layout.
/// For production, use: `switchboard-v2 = "0.4"` crate with proper deserialization.
#[account]
pub struct SwitchboardAggregator {
    pub latest_value: i64,
    pub latest_timestamp: i64,
    pub min_sample_size: u32,
    pub max_confidence_interval: u32,
}

impl SwitchboardAggregator {
    pub const LEN: usize = 8 + 8 + 8 + 4 + 4;
}

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

    let aggregator = &ctx.accounts.switchboard_aggregator;
    let now = Clock::get()?.unix_timestamp;

    // No future observations beyond 1 day ahead
    require!(day_start_unix <= now + DAY_SECS, ClimaFiError::InvalidTimeRange);

    // Security checks
    require!(
        aggregator.latest_timestamp >= day_start_unix,
        ClimaFiError::ObservationStale
    );
    require!(
        now - aggregator.latest_timestamp <= 3600, // 1 hour max staleness
        ClimaFiError::ObservationStale
    );

    // Scale value (Switchboard typically returns float * 100)
    let value = aggregator.latest_value;

    let obs = &mut ctx.accounts.observation;
    obs.region_id = region_id;
    obs.peril = peril;
    obs.day_start_unix = day_start_unix;
    obs.day_end_unix = day_start_unix + DAY_SECS;
    obs.value = value;
    obs.published_at_unix = now;
    obs.oracle_authority = ctx.accounts.oracle.key();
    obs.sources_bitmap = 0b0000_0000_0000_0001; // Switchboard source
    obs.agg_method = 2; // Switchboard verified

    emit!(crate::state::ObservationRecorded {
        region_id,
        peril,
        day_start_unix,
        value,
        oracle_authority: obs.oracle_authority,
        ts: now,
    });

    Ok(())
}
