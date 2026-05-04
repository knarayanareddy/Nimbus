Design Doc 1 — ClimaFi (Parametric Climate Insurance on Solana)
Document status: v1.0 (Implementation Blueprint)
Target: Frontier Hackathon submission by May 11, 2026
Primary deliverable: Working devnet/mainnet demo of parametric coverage, oracle-driven trigger, and automated payout
Core principle: “No adjusters, no claims process — deterministic trigger ⇒ deterministic payout.”

0) Executive Summary (What we’re building)
ClimaFi is a Solana protocol that lets:

Policyholders buy parametric coverage (e.g., drought, heavy rainfall, extreme heat),
Capital providers underwrite risk by supplying liquidity to pools,
Oracles publish signed/verified weather observations,
Smart contracts automatically pay out when an objective threshold is met.
MVP scope (hackathon):

One perils family (pick 1–2): Rainfall deficit (drought index) and/or excess rainfall (flood proxy)
Limited geography: start with grid-based regions (e.g., geohash-like buckets)
One settlement asset: USDC (or devnet mock USDC)
Oracle: Switchboard-based custom feed or a simple signed relayer (with a credible audit trail)
1) Goals / Non-goals
1.1 Goals (MVP)
Buy a policy in < 2 minutes.
Deterministic pricing (even if crude): quote is reproducible and verifiable.
Deterministic trigger: “If rainfall in region R for window W < threshold T ⇒ payout P”
Payout executes permissionlessly once trigger is satisfied.
Underwriters can deposit/withdraw liquidity with predictable constraints.
Full event trail: every major action emits logs + indexable off-chain events.
1.2 Non-goals (MVP)
Full actuarial pricing, reinsurance integration, regulated insurance licensing.
Multi-chain.
Any guarantee that this is legally “insurance” in a given jurisdiction (position as “parametric risk cover / risk pool” for MVP).
2) Key Concepts & Terminology
Region: A discrete geographic bucket (e.g., region_id = u64 derived from geohash/tiles).
Peril: Weather variable type: rainfall, temperature, windspeed.
Observation Window: Time range over which aggregate is computed (e.g., daily sums for last 30 days).
Index: Aggregation method (sum, mean, max).
Trigger: Boolean predicate over index value.
Policy: Contract specifying region, peril, window, threshold, payout, premium, and maturity.
Pool: Liquidity pool underwriting a class of policies (peril + region set + max tenor).
3) System Architecture (High-level)
3.1 Components
On-chain (Solana programs)

climafi_core — policies, pools, deposits/withdrawals, accounting
climafi_oracle_consumer — reads oracle feed(s), validates freshness, stores “observation snapshots”
climafi_payout_engine — evaluates triggers and executes payouts
Off-chain

Oracle pipeline (recommended):
Switchboard feed(s) aggregating multiple data sources 
6
Or (fallback) your own relayer that posts signed weather observations
Indexer (Helius / Triton / custom) for:
UI state
analytics
debugging / replay
Web app:
Buy policy UI
Underwrite UI
Claim/payout status UI
3.2 Data flow (happy path)
Underwriter deposits USDC into pool vault.
Policyholder requests a quote → receives signed quote.
Policyholder purchases policy on-chain using quote.
Oracle posts daily observation(s) for region/peril.
Anyone calls execute_payout(policy_id) after window close; program verifies trigger and pays.
4) Oracle Design (Make it credible)
4.1 Requirement: determinism & auditability
The single biggest reason “parametric insurance demos” fail: oracle ambiguity. We solve by:

Defining a canonical observation format.
Defining allowed data sources.
Defining update cadence.
Defining “freshness window”.
4.2 Recommended oracle approach: Switchboard aggregator + custom function
Switchboard supports:

custom feeds / on-demand feeds
aggregation across sources for reliability 
6
Approach:

For each region_id, run a Switchboard function daily:
Fetch rainfall (or temp) for region bounds from multiple APIs (e.g., NOAA + Open-Meteo + WeatherXM API)
Normalize units
Output deterministic number (e.g., rainfall mm in last 24h)
Publish to an on-chain aggregator account.
WeatherXM publicly positions itself as building an oracle-like network and provides B2B API access for weather data; you can use it as one input source in the aggregator. 
7

4.3 Observation schema (canonical)
For each region-day:

region_id: u64
peril: enum { Rainfall, Temp, Wind }
day_start_unix: i64 (00:00 UTC)
day_end_unix: i64
value: i64 (scaled int; e.g., rainfall in mm * 100)
sources_bitmap: u16 (which providers contributed)
agg_method: enum { Median, MeanTrimmed, WeightedMean }
published_at_unix: i64
signature / proof: oracle attestation / Switchboard guarantee
Freshness rule:

Observation is valid if published_at_unix >= day_end_unix and published_at_unix <= day_end_unix + 48h
5) On-chain Program Design (Accounts, PDAs, Instructions)
5.1 Program set
climafi_core (Anchor)
climafi_oracle_consumer (Anchor)
climafi_payout_engine (Anchor)
You can combine these into one program for MVP to reduce CPI complexity, but keeping them separate helps audits and separation of concerns.

5.2 Core Accounts (PDAs)
5.2.1 GlobalConfig (PDA)
Seed: ["config"]

Fields:

admin: Pubkey
paused: bool
usdc_mint: Pubkey
protocol_fee_bps: u16
treasury_usdc_ata: Pubkey
max_oracle_staleness_secs: u32
min_policy_duration_secs: u32
max_policy_duration_secs: u32
quote_signer: Pubkey (off-chain signer for quotes)
version: u16
5.2.2 Pool (PDA)
Seed: ["pool", pool_id]

Fields:

pool_id: u64
pool_manager: Pubkey (optional)
peril: Peril
region_set_hash: [u8; 32] (commitment to allowable regions)
max_tenor_secs: u32
ltv_limit_bps: u16 (max exposure vs liquidity)
capital: u64 (USDC base units)
locked: u64 (reserved for active policies)
lp_mint: Pubkey (LP token mint)
pool_vault_usdc: Pubkey (token account owned by vault authority PDA)
created_at: i64
5.2.3 VaultAuthority (PDA)
Seed: ["vault_auth", pool_id] Used as token account authority for pool vault.

5.2.4 Policy (PDA)
Seed: ["policy", policy_id]

Fields:

policy_id: u64
owner: Pubkey
pool_id: u64
region_id: u64
peril: Peril
window_start_unix: i64
window_end_unix: i64
index_method: IndexMethod
threshold: i64 (scaled)
direction: TriggerDirection (LT / GT)
payout_amount: u64
premium_amount: u64
status: PolicyStatus (Active / Matured / Paid / Expired / Cancelled)
created_at: i64
quote_hash: [u8; 32]
5.2.5 ObservationSnapshot (PDA)
Seed: ["obs", region_id, peril, day_start_unix]

Fields:

region_id, peril, day_start_unix
value: i64
published_at_unix: i64
oracle_source: Pubkey (the feed/authority)
agg_method
sources_bitmap
This makes payout evaluation deterministic and replayable.

5.3 Instructions (MVP)
Admin
initialize_config(...)
set_paused(bool)
set_fee(bps)
set_quote_signer(pubkey)
create_pool(params...)
update_pool_params(...)
Underwriter
deposit_liquidity(pool_id, amount)
withdraw_liquidity(pool_id, lp_amount)
Constraint: cannot violate capital - locked requirement.
Policyholder
buy_policy(quote, signature)

Verifies quote signature against config.quote_signer
Reserves payout_amount in pool.locked
Transfers premium from buyer to pool vault
Mints LP-fee cut to treasury (optional)
cancel_policy(policy_id) (optional)

Only before window_start
Refund premium minus fee
Oracle
record_observation(region_id, peril, day_start, value, meta...)
Permissioned in MVP (admin/oracle authority)
Later: permissionless if using Switchboard verification
Payout
evaluate_policy(policy_id)
Reads ObservationSnapshots across window, computes index, sets policy status to Matured
execute_payout(policy_id)
Requires policy Matured, trigger true, not paid
Transfers payout_amount USDC to owner
Decrements pool.locked
expire_policy(policy_id)
If matured and trigger false, sets Expired and unlocks capital
6) Quote & Pricing Design (MVP but secure)
6.1 Why quotes must be signed
If pricing is off-chain (likely for MVP), you must prevent:

user forging a “cheap premium” quote
user modifying payout/threshold
Solution: Off-chain quote service produces a canonical quote struct and signs it with quote_signer.

Quote struct:

policy_id
pool_id
region_id
peril
window_start_unix, window_end_unix
threshold, direction, index_method
payout_amount
premium_amount
quote_expiry_unix
nonce
On-chain:

hash the quote
verify signature
store quote_hash in Policy
6.2 Pricing formula (simple, deterministic)
MVP deterministic pricing (replace later):

premium = payout_amount * base_rate_bps / 10_000
base_rate_bps depends on:
peril
tenor bucket (7d/14d/30d)
region risk tier (1–5)
Add protocol_fee_bps
You can hardcode risk tiers for hackathon, then later compute from historical climate data.

7) Security / Threat Model (ClimaFi)
7.1 Key threats
Oracle manipulation / bad data
Pool insolvency (over-issuing policies)
Re-entrancy style issues (less common on Solana but CPI ordering matters)
Precision / scaling bugs (mm*100 etc.)
Admin key compromise
7.2 Mitigations
Multi-source aggregation in oracle (Switchboard aggregator concept) 
6
Strict ltv_limit_bps cap: never lock > X% of capital
Freshness checks + window boundaries
Use integer math only, fixed scaling, explicit overflow checks
Emergency pause in config
Time-delayed admin changes (post-hackathon enhancement)
8) Testing Plan (ClimaFi)
8.1 Unit tests (Anchor)
Pool accounting: deposit/withdraw/locked math
Quote verification: valid sig/invalid sig/expired quote
Observation snapshots: idempotency (same day), update rules
Payout evaluation: boundary windows, LT vs GT, index method
Insolvency checks: ensure locked cannot exceed caps
8.2 Property tests
Invariant: pool.capital >= pool.locked
Invariant: policy cannot be paid twice
Invariant: sum(payouts) ≤ locked reductions
8.3 End-to-end
Spin local validator
Seed mock USDC mint
Simulate 30 days of observations
Buy policy day 0, trigger day 30, payout day 30
9) Deployment & Ops (ClimaFi)
Environments: localnet → devnet → mainnet (optional)
Observability:
index program logs
persist decoded instruction events in Postgres
Key management:
quote signer in HSM or secure enclave for production
Upgrade authority:
keep upgradeable for hackathon
post-hackathon: governance + multisig




Package A — climafi (single-program MVP)
Directory layout
text

programs/climafi/src/
  lib.rs
  constants.rs
  state.rs
  errors.rs
  events.rs
  utils/
    mod.rs
    ed25519.rs
programs/climafi/src/constants.rs
Rust

use anchor_lang::prelude::*;

pub const CONFIG_SEED: &[u8] = b"config";
pub const POOL_SEED: &[u8] = b"pool";
pub const VAULT_AUTH_SEED: &[u8] = b"vault_auth";
pub const LP_MINT_SEED: &[u8] = b"lp_mint";
pub const POLICY_SEED: &[u8] = b"policy";
pub const OBS_SEED: &[u8] = b"obs";

pub const BPS_DENOMINATOR: u64 = 10_000;

// Keep MVP windows small so you can pass all observation accounts.
pub const MAX_WINDOW_DAYS: u16 = 31;

// Account size helpers (manual; adjust if you add fields)
pub const PUBKEY_BYTES: usize = 32;
programs/climafi/src/state.rs
Rust

use anchor_lang::prelude::*;

#[repr(u8)]
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum Peril {
    Rainfall = 0,
    Temperature = 1,
    WindSpeed = 2,
}

#[repr(u8)]
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum IndexMethod {
    Sum = 0,
    Mean = 1,
    Max = 2,
}

#[repr(u8)]
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum TriggerDirection {
    LessThan = 0,
    GreaterThan = 1,
}

#[repr(u8)]
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum PolicyStatus {
    Active = 0,
    Cancelled = 1,
    SettledPaid = 2,
    SettledExpired = 3,
}

#[account]
pub struct GlobalConfig {
    pub admin: Pubkey,
    pub paused: bool,

    pub usdc_mint: Pubkey,

    /// Protocol fee charged on premium (bps).
    pub protocol_fee_bps: u16,

    /// Treasury ATA for collecting fees (USDC).
    pub treasury_usdc_ata: Pubkey,

    /// Hard cap for oracle snapshot staleness.
    pub max_oracle_staleness_secs: u32,

    /// Quote signer (ed25519 pubkey)
    pub quote_signer: Pubkey,

    /// Oracle authority for MVP snapshot posting
    pub oracle_authority: Pubkey,

    pub min_policy_duration_secs: u32,
    pub max_policy_duration_secs: u32,

    pub version: u16,
}

impl GlobalConfig {
    pub const LEN: usize =
        8 +  // disc
        32 + // admin
        1  + // paused
        32 + // usdc_mint
        2  + // protocol_fee_bps
        32 + // treasury_usdc_ata
        4  + // max_oracle_staleness_secs
        32 + // quote_signer
        32 + // oracle_authority
        4  + // min_policy_duration_secs
        4  + // max_policy_duration_secs
        2;   // version
}

#[account]
pub struct Pool {
    pub pool_id: u64,

    pub peril: Peril,

    /// Commitment to allowed regions (hash of list or merkle root)
    pub region_set_hash: [u8; 32],

    pub max_tenor_secs: u32,

    /// Max locked exposure vs capital (bps). e.g. 8_000 = 80%
    pub ltv_limit_bps: u16,

    /// Total pool capital in USDC base units
    pub capital: u64,

    /// Reserved max liability for active policies
    pub locked: u64,

    pub lp_mint: Pubkey,

    /// USDC vault (ATA owned by vault_auth PDA)
    pub vault_usdc_ata: Pubkey,

    pub created_at_unix: i64,
}

impl Pool {
    pub const LEN: usize =
        8 +  // disc
        8 +  // pool_id
        1 +  // peril
        32 + // region_set_hash
        4 +  // max_tenor_secs
        2 +  // ltv_limit_bps
        8 +  // capital
        8 +  // locked
        32 + // lp_mint
        32 + // vault_usdc_ata
        8;   // created_at_unix
}

#[account]
pub struct Policy {
    pub policy_id: u64,
    pub owner: Pubkey,

    pub pool_id: u64,
    pub pool: Pubkey,

    pub region_id: u64,
    pub peril: Peril,

    pub window_start_unix: i64,
    pub window_end_unix: i64,

    pub index_method: IndexMethod,
    pub direction: TriggerDirection,

    /// Scaled int, e.g. rainfall_mm * 100
    pub threshold: i64,

    pub payout_amount: u64,
    pub premium_amount: u64,

    pub status: PolicyStatus,

    /// Recorded at settlement time
    pub observed_value: i64,
    pub triggered: bool,
    pub settled_at_unix: i64,

    pub quote_hash: [u8; 32],

    pub created_at_unix: i64,
}

impl Policy {
    pub const LEN: usize =
        8 +   // disc
        8 +   // policy_id
        32 +  // owner
        8 +   // pool_id
        32 +  // pool
        8 +   // region_id
        1 +   // peril
        8 +   // window_start_unix
        8 +   // window_end_unix
        1 +   // index_method
        1 +   // direction
        8 +   // threshold
        8 +   // payout_amount
        8 +   // premium_amount
        1 +   // status
        8 +   // observed_value
        1 +   // triggered
        8 +   // settled_at_unix
        32 +  // quote_hash
        8;    // created_at_unix
}

#[account]
pub struct ObservationSnapshot {
    pub region_id: u64,
    pub peril: Peril,

    pub day_start_unix: i64,
    pub day_end_unix: i64,

    /// Scaled int, e.g. mm * 100
    pub value: i64,

    pub published_at_unix: i64,

    pub oracle_authority: Pubkey,

    pub sources_bitmap: u16,
    pub agg_method: u8, // keep simple for MVP
}

impl ObservationSnapshot {
    pub const LEN: usize =
        8 +   // disc
        8 +   // region_id
        1 +   // peril
        8 +   // day_start_unix
        8 +   // day_end_unix
        8 +   // value
        8 +   // published_at_unix
        32 +  // oracle_authority
        2 +   // sources_bitmap
        1;    // agg_method
}

/// Canonical signed quote struct.
/// Off-chain: serialize this struct, sign bytes with quote_signer, include Ed25519 verify ix.
/// On-chain: compute hash + verify Ed25519 ix matches expected.
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct Quote {
    pub policy_id: u64,
    pub pool_id: u64,
    pub region_id: u64,
    pub peril: Peril,

    pub window_start_unix: i64,
    pub window_end_unix: i64,

    pub index_method: IndexMethod,
    pub direction: TriggerDirection,
    pub threshold: i64,

    pub payout_amount: u64,
    pub premium_amount: u64,

    pub quote_expiry_unix: i64,
    pub nonce: u64,
}
programs/climafi/src/errors.rs
Rust

use anchor_lang::prelude::*;

#[error_code]
pub enum ClimaFiError {
    #[msg("Unauthorized")]
    Unauthorized,

    #[msg("Protocol is paused")]
    Paused,

    #[msg("Invalid bps value")]
    InvalidBps,

    #[msg("Invalid time range")]
    InvalidTimeRange,

    #[msg("Policy duration out of bounds")]
    InvalidPolicyDuration,

    #[msg("Pool peril mismatch")]
    PoolPerilMismatch,

    #[msg("Insufficient unlocked capital in pool")]
    InsufficientUnlockedCapital,

    #[msg("Locked exposure would exceed LTV limit")]
    LtvExceeded,

    #[msg("Invalid mint")]
    InvalidMint,

    #[msg("Quote expired")]
    QuoteExpired,

    #[msg("Ed25519 signature verification instruction missing")]
    QuoteSigMissing,

    #[msg("Ed25519 signature verification failed")]
    QuoteSigInvalid,

    #[msg("Policy not active")]
    PolicyNotActive,

    #[msg("Policy cannot be cancelled after window start")]
    PolicyCancellationNotAllowed,

    #[msg("Policy window has not ended yet")]
    PolicyWindowNotEnded,

    #[msg("Policy already settled")]
    PolicyAlreadySettled,

    #[msg("Oracle unauthorized")]
    OracleUnauthorized,

    #[msg("Observation snapshot is stale")]
    ObservationStale,

    #[msg("Observation snapshot does not match policy region/peril")]
    ObservationMismatch,

    #[msg("Too many observation accounts passed")]
    TooManyObservations,

    #[msg("Math overflow")]
    MathOverflow,
}
programs/climafi/src/events.rs
Rust

use anchor_lang::prelude::*;
use crate::state::*;

#[event]
pub struct ConfigInitialized {
    pub admin: Pubkey,
    pub usdc_mint: Pubkey,
    pub quote_signer: Pubkey,
    pub oracle_authority: Pubkey,
    pub protocol_fee_bps: u16,
    pub ts: i64,
}

#[event]
pub struct PoolCreated {
    pub pool_id: u64,
    pub peril: Peril,
    pub lp_mint: Pubkey,
    pub vault_usdc_ata: Pubkey,
    pub ltv_limit_bps: u16,
    pub ts: i64,
}

#[event]
pub struct LiquidityDeposited {
    pub pool_id: u64,
    pub depositor: Pubkey,
    pub amount: u64,
    pub lp_minted: u64,
    pub ts: i64,
}

#[event]
pub struct LiquidityWithdrawn {
    pub pool_id: u64,
    pub withdrawer: Pubkey,
    pub amount: u64,
    pub lp_burned: u64,
    pub ts: i64,
}

#[event]
pub struct PolicyPurchased {
    pub policy_id: u64,
    pub pool_id: u64,
    pub owner: Pubkey,
    pub region_id: u64,
    pub peril: Peril,
    pub payout_amount: u64,
    pub premium_amount: u64,
    pub window_start_unix: i64,
    pub window_end_unix: i64,
    pub ts: i64,
}

#[event]
pub struct PolicyCancelled {
    pub policy_id: u64,
    pub owner: Pubkey,
    pub ts: i64,
}

#[event]
pub struct ObservationRecorded {
    pub region_id: u64,
    pub peril: Peril,
    pub day_start_unix: i64,
    pub value: i64,
    pub oracle_authority: Pubkey,
    pub ts: i64,
}

#[event]
pub struct PolicySettled {
    pub policy_id: u64,
    pub pool_id: u64,
    pub triggered: bool,
    pub observed_value: i64,
    pub payout_amount: u64,
    pub ts: i64,
}
programs/climafi/src/utils/mod.rs
Rust

pub mod ed25519;
programs/climafi/src/utils/ed25519.rs
This is the standard “verify that an Ed25519Program verify instruction exists in the same transaction” pattern.

Rust

use anchor_lang::prelude::*;
use anchor_lang::solana_program::{
    ed25519_program,
    sysvar::instructions::{load_instruction_at_checked, ID as IX_SYSVAR_ID},
};
use crate::errors::ClimaFiError;

/// Verifies that instruction `ix_index` is an ed25519 verify instruction
/// for (pubkey, message, signature). Use ix_index = 0 or 1 depending on your client ordering.
///
/// Client requirement:
/// - Add ed25519 verify ix BEFORE calling the program instruction.
/// - Ensure the message bytes match exactly `message`.
pub fn verify_ed25519_ix(
    instructions_sysvar: &AccountInfo,
    ix_index: u8,
    pubkey: &[u8; 32],
    message: &[u8],
    signature: &[u8; 64],
) -> Result<()> {
    require_keys_eq!(instructions_sysvar.key(), IX_SYSVAR_ID, ClimaFiError::QuoteSigMissing);

    let ix = load_instruction_at_checked(ix_index as usize, instructions_sysvar)
        .map_err(|_| error!(ClimaFiError::QuoteSigMissing))?;

    require_keys_eq!(ix.program_id, ed25519_program::ID, ClimaFiError::QuoteSigMissing);

    // Ed25519Program instruction data layout:
    // [u8 num_signatures][u8 padding]
    // then N times:
    //   u16 sig_offset, u16 sig_ix_idx,
    //   u16 pubkey_offset, u16 pubkey_ix_idx,
    //   u16 msg_offset, u16 msg_size, u16 msg_ix_idx
    // followed by the actual signature/pubkey/message bytes in the same ix data.
    let data = ix.data;

    require!(data.len() >= 2, ClimaFiError::QuoteSigInvalid);
    let n = data[0] as usize;
    require!(n == 1, ClimaFiError::QuoteSigInvalid);

    // Offsets start at byte 2
    let header_start = 2;
    let header_len = 14; // for one signature
    require!(data.len() >= header_start + header_len, ClimaFiError::QuoteSigInvalid);

    let read_u16 = |i: usize| -> u16 {
        u16::from_le_bytes([data[i], data[i + 1]])
    };

    let sig_offset = read_u16(header_start) as usize;
    let _sig_ix = read_u16(header_start + 2);

    let pub_offset = read_u16(header_start + 4) as usize;
    let _pub_ix = read_u16(header_start + 6);

    let msg_offset = read_u16(header_start + 8) as usize;
    let msg_size = read_u16(header_start + 10) as usize;
    let _msg_ix = read_u16(header_start + 12);

    require!(msg_size == message.len(), ClimaFiError::QuoteSigInvalid);
    require!(sig_offset + 64 <= data.len(), ClimaFiError::QuoteSigInvalid);
    require!(pub_offset + 32 <= data.len(), ClimaFiError::QuoteSigInvalid);
    require!(msg_offset + msg_size <= data.len(), ClimaFiError::QuoteSigInvalid);

    require!(&data[sig_offset..sig_offset + 64] == signature, ClimaFiError::QuoteSigInvalid);
    require!(&data[pub_offset..pub_offset + 32] == pubkey, ClimaFiError::QuoteSigInvalid);
    require!(&data[msg_offset..msg_offset + msg_size] == message, ClimaFiError::QuoteSigInvalid);

    Ok(())
}
programs/climafi/src/lib.rs
Rust

use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{self, Burn, Mint, MintTo, Token, TokenAccount, Transfer},
};

pub mod constants;
pub mod errors;
pub mod events;
pub mod state;
pub mod utils;

use constants::*;
use errors::*;
use events::*;
use state::*;

declare_id!("CLiMaFi1111111111111111111111111111111111"); // replace

#[program]
pub mod climafi {
    use super::*;

    // ---------------------------
    // Admin
    // ---------------------------

    pub fn initialize_config(
        ctx: Context<InitializeConfig>,
        protocol_fee_bps: u16,
        max_oracle_staleness_secs: u32,
        min_policy_duration_secs: u32,
        max_policy_duration_secs: u32,
        quote_signer: Pubkey,
        oracle_authority: Pubkey,
    ) -> Result<()> {
        let cfg = &mut ctx.accounts.config;
        cfg.admin = ctx.accounts.admin.key();
        cfg.paused = false;
        cfg.usdc_mint = ctx.accounts.usdc_mint.key();
        cfg.protocol_fee_bps = protocol_fee_bps;
        cfg.treasury_usdc_ata = ctx.accounts.treasury_usdc_ata.key();
        cfg.max_oracle_staleness_secs = max_oracle_staleness_secs;
        cfg.quote_signer = quote_signer;
        cfg.oracle_authority = oracle_authority;
        cfg.min_policy_duration_secs = min_policy_duration_secs;
        cfg.max_policy_duration_secs = max_policy_duration_secs;
        cfg.version = 1;

        emit!(ConfigInitialized {
            admin: cfg.admin,
            usdc_mint: cfg.usdc_mint,
            quote_signer,
            oracle_authority,
            protocol_fee_bps,
            ts: Clock::get()?.unix_timestamp,
        });
        Ok(())
    }

    pub fn set_paused(ctx: Context<SetPaused>, paused: bool) -> Result<()> {
        let cfg = &mut ctx.accounts.config;
        require_keys_eq!(cfg.admin, ctx.accounts.admin.key(), ClimaFiError::Unauthorized);
        cfg.paused = paused;
        Ok(())
    }

    pub fn create_pool(
        ctx: Context<CreatePool>,
        pool_id: u64,
        peril: Peril,
        region_set_hash: [u8; 32],
        max_tenor_secs: u32,
        ltv_limit_bps: u16,
    ) -> Result<()> {
        let cfg = &ctx.accounts.config;
        require!(!cfg.paused, ClimaFiError::Paused);
        require_keys_eq!(cfg.admin, ctx.accounts.admin.key(), ClimaFiError::Unauthorized);
        require!(ltv_limit_bps <= 10_000, ClimaFiError::InvalidBps);

        let pool = &mut ctx.accounts.pool;
        pool.pool_id = pool_id;
        pool.peril = peril;
        pool.region_set_hash = region_set_hash;
        pool.max_tenor_secs = max_tenor_secs;
        pool.ltv_limit_bps = ltv_limit_bps;
        pool.capital = 0;
        pool.locked = 0;
        pool.lp_mint = ctx.accounts.lp_mint.key();
        pool.vault_usdc_ata = ctx.accounts.pool_vault_usdc_ata.key();
        pool.created_at_unix = Clock::get()?.unix_timestamp;

        emit!(PoolCreated {
            pool_id,
            peril,
            lp_mint: pool.lp_mint,
            vault_usdc_ata: pool.vault_usdc_ata,
            ltv_limit_bps,
            ts: pool.created_at_unix,
        });

        Ok(())
    }

    // ---------------------------
    // Underwriter
    // ---------------------------

    pub fn deposit_liquidity(ctx: Context<DepositLiquidity>, amount: u64) -> Result<()> {
        let cfg = &ctx.accounts.config;
        require!(!cfg.paused, ClimaFiError::Paused);

        // Transfer USDC into pool vault
        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.depositor_usdc_ata.to_account_info(),
                    to: ctx.accounts.pool_vault_usdc_ata.to_account_info(),
                    authority: ctx.accounts.depositor.to_account_info(),
                },
            ),
            amount,
        )?;

        // Mint LP (placeholder: 1:1 for MVP, replace with proportional formula)
        let lp_amount = amount;

        let pool_id = ctx.accounts.pool.pool_id;
        let signer_seeds: &[&[&[u8]]] = &[&[
            LP_MINT_SEED,
            &pool_id.to_le_bytes(),
            &[ctx.bumps.lp_mint],
        ]];

        token::mint_to(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                MintTo {
                    mint: ctx.accounts.lp_mint.to_account_info(),
                    to: ctx.accounts.depositor_lp_ata.to_account_info(),
                    authority: ctx.accounts.lp_mint.to_account_info(), // NOTE: replace if using separate mint authority PDA
                },
                signer_seeds,
            ),
            lp_amount,
        )?;

        let pool = &mut ctx.accounts.pool;
        pool.capital = pool.capital.checked_add(amount).ok_or(ClimaFiError::MathOverflow)?;

        emit!(LiquidityDeposited {
            pool_id: pool.pool_id,
            depositor: ctx.accounts.depositor.key(),
            amount,
            lp_minted: lp_amount,
            ts: Clock::get()?.unix_timestamp,
        });

        Ok(())
    }

    pub fn withdraw_liquidity(ctx: Context<WithdrawLiquidity>, lp_amount: u64) -> Result<()> {
        let cfg = &ctx.accounts.config;
        require!(!cfg.paused, ClimaFiError::Paused);

        // Placeholder math: 1:1 LP => USDC
        let amount = lp_amount;

        let pool = &mut ctx.accounts.pool;
        let unlocked = pool.capital.checked_sub(pool.locked).ok_or(ClimaFiError::MathOverflow)?;
        require!(unlocked >= amount, ClimaFiError::InsufficientUnlockedCapital);

        // Burn LP
        token::burn(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Burn {
                    mint: ctx.accounts.lp_mint.to_account_info(),
                    from: ctx.accounts.depositor_lp_ata.to_account_info(),
                    authority: ctx.accounts.depositor.to_account_info(),
                },
            ),
            lp_amount,
        )?;

        // Transfer USDC out of vault via vault_auth PDA
        let pool_id = pool.pool_id;
        let signer_seeds: &[&[&[u8]]] = &[&[
            VAULT_AUTH_SEED,
            &pool_id.to_le_bytes(),
            &[ctx.bumps.vault_auth],
        ]];

        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.pool_vault_usdc_ata.to_account_info(),
                    to: ctx.accounts.depositor_usdc_ata.to_account_info(),
                    authority: ctx.accounts.vault_auth.to_account_info(),
                },
                signer_seeds,
            ),
            amount,
        )?;

        pool.capital = pool.capital.checked_sub(amount).ok_or(ClimaFiError::MathOverflow)?;

        emit!(LiquidityWithdrawn {
            pool_id: pool.pool_id,
            withdrawer: ctx.accounts.depositor.key(),
            amount,
            lp_burned: lp_amount,
            ts: Clock::get()?.unix_timestamp,
        });

        Ok(())
    }

    // ---------------------------
    // Policyholder
    // ---------------------------

    pub fn buy_policy(
        ctx: Context<BuyPolicy>,
        quote: Quote,
        signature: [u8; 64],
        ed25519_ix_index: u8,
    ) -> Result<()> {
        let cfg = &ctx.accounts.config;
        require!(!cfg.paused, ClimaFiError::Paused);

        // Time bounds
        let now = Clock::get()?.unix_timestamp;
        require!(quote.quote_expiry_unix >= now, ClimaFiError::QuoteExpired);

        // Verify quote sig exists in tx
        let msg = quote.try_to_vec()?;
        utils::ed25519::verify_ed25519_ix(
            &ctx.accounts.instructions_sysvar.to_account_info(),
            ed25519_ix_index,
            cfg.quote_signer.as_ref(),
            &msg,
            &signature,
        )?;

        // Transfer premium from buyer to vault
        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.buyer_usdc_ata.to_account_info(),
                    to: ctx.accounts.pool_vault_usdc_ata.to_account_info(),
                    authority: ctx.accounts.buyer.to_account_info(),
                },
            ),
            quote.premium_amount,
        )?;

        // Pool exposure checks (MVP simple)
        let pool = &mut ctx.accounts.pool;
        require!(pool.peril as u8 == quote.peril as u8, ClimaFiError::PoolPerilMismatch);

        let new_capital = pool.capital
            .checked_add(quote.premium_amount)
            .ok_or(ClimaFiError::MathOverflow)?;
        let new_locked = pool.locked
            .checked_add(quote.payout_amount)
            .ok_or(ClimaFiError::MathOverflow)?;

        let max_locked = (new_capital as u128)
            .checked_mul(pool.ltv_limit_bps as u128).ok_or(ClimaFiError::MathOverflow)?
            .checked_div(10_000).ok_or(ClimaFiError::MathOverflow)? as u64;

        require!(new_locked <= max_locked, ClimaFiError::LtvExceeded);

        pool.capital = new_capital;
        pool.locked = new_locked;

        // Create policy
        let policy = &mut ctx.accounts.policy;
        policy.policy_id = quote.policy_id;
        policy.owner = ctx.accounts.buyer.key();
        policy.pool_id = quote.pool_id;
        policy.pool = pool.key();
        policy.region_id = quote.region_id;
        policy.peril = quote.peril;
        policy.window_start_unix = quote.window_start_unix;
        policy.window_end_unix = quote.window_end_unix;
        policy.index_method = quote.index_method;
        policy.direction = quote.direction;
        policy.threshold = quote.threshold;
        policy.payout_amount = quote.payout_amount;
        policy.premium_amount = quote.premium_amount;
        policy.status = PolicyStatus::Active;
        policy.observed_value = 0;
        policy.triggered = false;
        policy.settled_at_unix = 0;
        policy.quote_hash = anchor_lang::solana_program::hash::hash(&msg).to_bytes();
        policy.created_at_unix = now;

        emit!(PolicyPurchased {
            policy_id: policy.policy_id,
            pool_id: policy.pool_id,
            owner: policy.owner,
            region_id: policy.region_id,
            peril: policy.peril,
            payout_amount: policy.payout_amount,
            premium_amount: policy.premium_amount,
            window_start_unix: policy.window_start_unix,
            window_end_unix: policy.window_end_unix,
            ts: now,
        });

        Ok(())
    }

    pub fn cancel_policy(ctx: Context<CancelPolicy>) -> Result<()> {
        let cfg = &ctx.accounts.config;
        require!(!cfg.paused, ClimaFiError::Paused);

        let now = Clock::get()?.unix_timestamp;
        let policy = &mut ctx.accounts.policy;

        require_keys_eq!(policy.owner, ctx.accounts.owner.key(), ClimaFiError::Unauthorized);
        require!(policy.status == PolicyStatus::Active, ClimaFiError::PolicyNotActive);
        require!(now < policy.window_start_unix, ClimaFiError::PolicyCancellationNotAllowed);

        // Unlock pool exposure; (refund policy premium omitted here; add if desired)
        let pool = &mut ctx.accounts.pool;
        pool.locked = pool.locked.checked_sub(policy.payout_amount).ok_or(ClimaFiError::MathOverflow)?;

        policy.status = PolicyStatus::Cancelled;

        emit!(PolicyCancelled {
            policy_id: policy.policy_id,
            owner: policy.owner,
            ts: now,
        });

        Ok(())
    }

    // ---------------------------
    // Oracle snapshot
    // ---------------------------

    pub fn record_observation(
        ctx: Context<RecordObservation>,
        region_id: u64,
        peril: Peril,
        day_start_unix: i64,
        day_end_unix: i64,
        value: i64,
        published_at_unix: i64,
        sources_bitmap: u16,
        agg_method: u8,
    ) -> Result<()> {
        let cfg = &ctx.accounts.config;
        require!(!cfg.paused, ClimaFiError::Paused);

        // MVP: only oracle_authority (or admin)
        let signer = ctx.accounts.oracle.to_account_info().key();
        require!(
            signer == cfg.oracle_authority || signer == cfg.admin,
            ClimaFiError::OracleUnauthorized
        );

        let obs = &mut ctx.accounts.observation;
        obs.region_id = region_id;
        obs.peril = peril;
        obs.day_start_unix = day_start_unix;
        obs.day_end_unix = day_end_unix;
        obs.value = value;
        obs.published_at_unix = published_at_unix;
        obs.oracle_authority = signer;
        obs.sources_bitmap = sources_bitmap;
        obs.agg_method = agg_method;

        emit!(ObservationRecorded {
            region_id,
            peril,
            day_start_unix,
            value,
            oracle_authority: signer,
            ts: Clock::get()?.unix_timestamp,
        });

        Ok(())
    }

    // ---------------------------
    // Settlement (evaluate + pay/unlock)
    // ---------------------------

    pub fn settle_policy(ctx: Context<SettlePolicy>) -> Result<()> {
        let cfg = &ctx.accounts.config;
        require!(!cfg.paused, ClimaFiError::Paused);

        let now = Clock::get()?.unix_timestamp;
        let policy = &mut ctx.accounts.policy;
        require!(policy.status == PolicyStatus::Active, ClimaFiError::PolicyNotActive);
        require!(now >= policy.window_end_unix, ClimaFiError::PolicyWindowNotEnded);

        // Implement:
        // - iterate remaining obs accounts
        // - validate region/peril/day ranges + staleness
        // - compute index
        // - set triggered
        // - if triggered: transfer payout from pool vault to owner
        // - unlock pool.locked either way
        //
        // Placeholder sets expired:
        let pool = &mut ctx.accounts.pool;
        pool.locked = pool.locked.checked_sub(policy.payout_amount).ok_or(ClimaFiError::MathOverflow)?;

        policy.status = PolicyStatus::SettledExpired;
        policy.observed_value = 0;
        policy.triggered = false;
        policy.settled_at_unix = now;

        emit!(PolicySettled {
            policy_id: policy.policy_id,
            pool_id: policy.pool_id,
            triggered: policy.triggered,
            observed_value: policy.observed_value,
            payout_amount: if policy.triggered { policy.payout_amount } else { 0 },
            ts: now,
        });

        Ok(())
    }
}

// ============================================================
// Contexts
// ============================================================

#[derive(Accounts)]
pub struct InitializeConfig<'info> {
    #[account(
        init,
        payer = admin,
        space = GlobalConfig::LEN,
        seeds = [CONFIG_SEED],
        bump
    )]
    pub config: Account<'info, GlobalConfig>,

    pub usdc_mint: Account<'info, Mint>,

    /// Treasury USDC ATA (must be for usdc_mint; owned by treasury owner off-chain)
    pub treasury_usdc_ata: Account<'info, TokenAccount>,

    #[account(mut)]
    pub admin: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SetPaused<'info> {
    #[account(mut, seeds = [CONFIG_SEED], bump)]
    pub config: Account<'info, GlobalConfig>,
    pub admin: Signer<'info>,
}

#[derive(Accounts)]
#[instruction(pool_id: u64)]
pub struct CreatePool<'info> {
    #[account(seeds = [CONFIG_SEED], bump)]
    pub config: Account<'info, GlobalConfig>,

    #[account(
        init,
        payer = admin,
        space = Pool::LEN,
        seeds = [POOL_SEED, &pool_id.to_le_bytes()],
        bump
    )]
    pub pool: Account<'info, Pool>,

    /// Vault authority PDA for this pool
    /// CHECK: PDA only
    #[account(
        seeds = [VAULT_AUTH_SEED, &pool_id.to_le_bytes()],
        bump
    )]
    pub vault_auth: UncheckedAccount<'info>,

    #[account(
        init,
        payer = admin,
        seeds = [LP_MINT_SEED, &pool_id.to_le_bytes()],
        bump,
        mint::decimals = 6,
        mint::authority = vault_auth,
        mint::freeze_authority = vault_auth
    )]
    pub lp_mint: Account<'info, Mint>,

    #[account(
        init_if_needed,
        payer = admin,
        associated_token::mint = usdc_mint,
        associated_token::authority = vault_auth
    )]
    pub pool_vault_usdc_ata: Account<'info, TokenAccount>,

    pub usdc_mint: Account<'info, Mint>,

    #[account(mut)]
    pub admin: Signer<'info>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct DepositLiquidity<'info> {
    #[account(seeds = [CONFIG_SEED], bump)]
    pub config: Account<'info, GlobalConfig>,

    #[account(mut)]
    pub pool: Account<'info, Pool>,

    /// CHECK: PDA
    #[account(
        seeds = [VAULT_AUTH_SEED, &pool.pool_id.to_le_bytes()],
        bump
    )]
    pub vault_auth: UncheckedAccount<'info>,

    #[account(mut)]
    pub lp_mint: Account<'info, Mint>,

    #[account(mut)]
    pub depositor: Signer<'info>,

    #[account(
        mut,
        constraint = depositor_usdc_ata.mint == config.usdc_mint @ ClimaFiError::InvalidMint,
        constraint = depositor_usdc_ata.owner == depositor.key() @ ClimaFiError::Unauthorized
    )]
    pub depositor_usdc_ata: Account<'info, TokenAccount>,

    #[account(mut, address = pool.vault_usdc_ata)]
    pub pool_vault_usdc_ata: Account<'info, TokenAccount>,

    #[account(
        init_if_needed,
        payer = depositor,
        associated_token::mint = lp_mint,
        associated_token::authority = depositor
    )]
    pub depositor_lp_ata: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct WithdrawLiquidity<'info> {
    #[account(seeds = [CONFIG_SEED], bump)]
    pub config: Account<'info, GlobalConfig>,

    #[account(mut)]
    pub pool: Account<'info, Pool>,

    /// CHECK: PDA
    #[account(
        seeds = [VAULT_AUTH_SEED, &pool.pool_id.to_le_bytes()],
        bump
    )]
    pub vault_auth: UncheckedAccount<'info>,

    #[account(mut, address = pool.lp_mint)]
    pub lp_mint: Account<'info, Mint>,

    #[account(mut)]
    pub depositor: Signer<'info>,

    #[account(
        mut,
        constraint = depositor_usdc_ata.mint == config.usdc_mint @ ClimaFiError::InvalidMint,
        constraint = depositor_usdc_ata.owner == depositor.key() @ ClimaFiError::Unauthorized
    )]
    pub depositor_usdc_ata: Account<'info, TokenAccount>,

    #[account(mut, address = pool.vault_usdc_ata)]
    pub pool_vault_usdc_ata: Account<'info, TokenAccount>,

    #[account(
        mut,
        associated_token::mint = lp_mint,
        associated_token::authority = depositor
    )]
    pub depositor_lp_ata: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
#[instruction(quote: Quote)]
pub struct BuyPolicy<'info> {
    #[account(seeds = [CONFIG_SEED], bump)]
    pub config: Account<'info, GlobalConfig>,

    #[account(mut, seeds = [POOL_SEED, &quote.pool_id.to_le_bytes()], bump)]
    pub pool: Account<'info, Pool>,

    /// CHECK: PDA
    #[account(
        seeds = [VAULT_AUTH_SEED, &quote.pool_id.to_le_bytes()],
        bump
    )]
    pub vault_auth: UncheckedAccount<'info>,

    #[account(mut, address = pool.vault_usdc_ata)]
    pub pool_vault_usdc_ata: Account<'info, TokenAccount>,

    #[account(
        init,
        payer = buyer,
        space = Policy::LEN,
        seeds = [POLICY_SEED, &quote.policy_id.to_le_bytes()],
        bump
    )]
    pub policy: Account<'info, Policy>,

    #[account(mut)]
    pub buyer: Signer<'info>,

    #[account(
        mut,
        constraint = buyer_usdc_ata.mint == config.usdc_mint @ ClimaFiError::InvalidMint,
        constraint = buyer_usdc_ata.owner == buyer.key() @ ClimaFiError::Unauthorized
    )]
    pub buyer_usdc_ata: Account<'info, TokenAccount>,

    /// CHECK: instructions sysvar used to verify ed25519 ix
    #[account(address = anchor_lang::solana_program::sysvar::instructions::ID)]
    pub instructions_sysvar: UncheckedAccount<'info>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CancelPolicy<'info> {
    #[account(seeds = [CONFIG_SEED], bump)]
    pub config: Account<'info, GlobalConfig>,

    #[account(mut)]
    pub pool: Account<'info, Pool>,

    #[account(mut)]
    pub policy: Account<'info, Policy>,

    pub owner: Signer<'info>,
}

#[derive(Accounts)]
#[instruction(region_id: u64, peril: Peril, day_start_unix: i64)]
pub struct RecordObservation<'info> {
    #[account(seeds = [CONFIG_SEED], bump)]
    pub config: Account<'info, GlobalConfig>,

    #[account(
        init,
        payer = oracle,
        space = ObservationSnapshot::LEN,
        seeds = [
            OBS_SEED,
            &region_id.to_le_bytes(),
            &[peril as u8],
            &day_start_unix.to_le_bytes()
        ],
        bump
    )]
    pub observation: Account<'info, ObservationSnapshot>,

    #[account(mut)]
    pub oracle: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SettlePolicy<'info> {
    #[account(seeds = [CONFIG_SEED], bump)]
    pub config: Account<'info, GlobalConfig>,

    #[account(mut)]
    pub pool: Account<'info, Pool>,

    /// CHECK: PDA
    #[account(
        seeds = [VAULT_AUTH_SEED, &pool.pool_id.to_le_bytes()],
        bump
    )]
    pub vault_auth: UncheckedAccount<'info>,

    #[account(mut, address = pool.vault_usdc_ata)]
    pub pool_vault_usdc_ata: Account<'info, TokenAccount>,

    #[account(mut)]
    pub policy: Account<'info, Policy>,

    /// Receiver for payout (policy owner). For payout transfer you’ll use this to derive ATA.
    /// CHECK: validated in handler against policy.owner
    pub policy_owner: UncheckedAccount<'info>,

    /// Payout destination ATA for policy owner
    /// CHECK: validate ATA in handler
    #[account(mut)]
    pub policy_owner_usdc_ata: UncheckedAccount<'info>,

    pub token_program: Program<'info, Token>,
}




PDA Seed Conventions (quick reference)
ClimaFi
config PDA: [b"config"]
pool PDA: [b"pool", pool_id_le]
vault_auth PDA: [b"vault_auth", pool_id_le]
lp_mint PDA: [b"lp_mint", pool_id_le]
policy PDA: [b"policy", policy_id_le]
observation PDA: [b"obs", region_id_le, peril_u8, day_start_unix_le]



mplementation notes you’ll want to follow immediately (so this spec “just works”)
ClimaFi ed25519 quote verification (client-side requirement)
In your client/SDK, you must:

compute message = quote.try_to_vec() (Anchor serialization)
add Ed25519Program verify instruction to the transaction before buy_policy
pass ed25519_ix_index pointing to that instruction index



Chunked distribution is intentional
The design uses:

execute_distribution_sol
execute_distribution_spl(asset_index)
finalize_distribution so you don’t blow compute limits in one transaction.




So minting LP tokens must be signed by vault_auth seeds, not by lp_mint seeds.

Add helper math + index calc
Create:

programs/climafi/src/utils/math.rs
Rust

use anchor_lang::prelude::*;
use crate::errors::ClimaFiError;

/// mul_div floor: (a*b)/denom using u128 to avoid overflow.
pub fn mul_div_u64(a: u64, b: u64, denom: u64) -> Result<u64> {
    require!(denom != 0, ClimaFiError::MathOverflow);
    let v = (a as u128)
        .checked_mul(b as u128)
        .ok_or(ClimaFiError::MathOverflow)?
        .checked_div(denom as u128)
        .ok_or(ClimaFiError::MathOverflow)?;
    Ok(v as u64)
}

pub fn checked_add_i128(a: i128, b: i128) -> Result<i128> {
    a.checked_add(b).ok_or_else(|| error!(ClimaFiError::MathOverflow))
}
And wire it:

programs/climafi/src/utils/mod.rs
Rust

pub mod ed25519;
pub mod math;
A2) LP mint/burn math (deposit + withdraw)
Replace the bodies of deposit_liquidity and withdraw_liquidity with the following implementations.

deposit_liquidity (proportional LP minting)
Rust

pub fn deposit_liquidity(ctx: Context<DepositLiquidity>, amount: u64) -> Result<()> {
    let cfg = &ctx.accounts.config;
    require!(!cfg.paused, ClimaFiError::Paused);

    let pool = &mut ctx.accounts.pool;

    // Snapshot pre-state
    let capital_before = pool.capital;
    let lp_supply_before = ctx.accounts.lp_mint.supply;

    // Transfer USDC from depositor -> pool vault
    token::transfer(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.depositor_usdc_ata.to_account_info(),
                to: ctx.accounts.pool_vault_usdc_ata.to_account_info(),
                authority: ctx.accounts.depositor.to_account_info(),
            },
        ),
        amount,
    )?;

    // LP mint amount:
    // - if first deposit: 1 LP == 1 USDC base unit
    // - else: lp_minted = amount * lp_supply / capital_before
    let lp_minted = if lp_supply_before == 0 || capital_before == 0 {
        amount
    } else {
        crate::utils::math::mul_div_u64(amount, lp_supply_before, capital_before)?
    };

    // Mint LP to depositor signed by vault_auth PDA
    let pool_id = pool.pool_id;
    let signer_seeds: &[&[&[u8]]] = &[&[
        VAULT_AUTH_SEED,
        &pool_id.to_le_bytes(),
        &[ctx.bumps.vault_auth],
    ]];

    token::mint_to(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            MintTo {
                mint: ctx.accounts.lp_mint.to_account_info(),
                to: ctx.accounts.depositor_lp_ata.to_account_info(),
                authority: ctx.accounts.vault_auth.to_account_info(),
            },
            signer_seeds,
        ),
        lp_minted,
    )?;

    // Update pool accounting (capital increases by deposit)
    pool.capital = pool.capital.checked_add(amount).ok_or(ClimaFiError::MathOverflow)?;

    emit!(LiquidityDeposited {
        pool_id: pool.pool_id,
        depositor: ctx.accounts.depositor.key(),
        amount,
        lp_minted,
        ts: Clock::get()?.unix_timestamp,
    });

    Ok(())
}
withdraw_liquidity (proportional USDC out)
Rust

pub fn withdraw_liquidity(ctx: Context<WithdrawLiquidity>, lp_amount: u64) -> Result<()> {
    let cfg = &ctx.accounts.config;
    require!(!cfg.paused, ClimaFiError::Paused);

    let pool = &mut ctx.accounts.pool;

    let lp_supply = ctx.accounts.lp_mint.supply;
    require!(lp_supply > 0, ClimaFiError::MathOverflow);

    // amount_out = lp_amount * pool.capital / lp_supply
    let amount_out = crate::utils::math::mul_div_u64(lp_amount, pool.capital, lp_supply)?;

    // Must not violate locked constraint
    let unlocked = pool.capital.checked_sub(pool.locked).ok_or(ClimaFiError::MathOverflow)?;
    require!(unlocked >= amount_out, ClimaFiError::InsufficientUnlockedCapital);

    // Burn LP from withdrawer
    token::burn(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Burn {
                mint: ctx.accounts.lp_mint.to_account_info(),
                from: ctx.accounts.depositor_lp_ata.to_account_info(),
                authority: ctx.accounts.depositor.to_account_info(),
            },
        ),
        lp_amount,
    )?;

    // Transfer USDC out signed by vault_auth PDA
    let pool_id = pool.pool_id;
    let signer_seeds: &[&[&[u8]]] = &[&[
        VAULT_AUTH_SEED,
        &pool_id.to_le_bytes(),
        &[ctx.bumps.vault_auth],
    ]];

    token::transfer(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.pool_vault_usdc_ata.to_account_info(),
                to: ctx.accounts.depositor_usdc_ata.to_account_info(),
                authority: ctx.accounts.vault_auth.to_account_info(),
            },
            signer_seeds,
        ),
        amount_out,
    )?;

    pool.capital = pool.capital.checked_sub(amount_out).ok_or(ClimaFiError::MathOverflow)?;

    emit!(LiquidityWithdrawn {
        pool_id: pool.pool_id,
        withdrawer: ctx.accounts.depositor.key(),
        amount: amount_out,
        lp_burned: lp_amount,
        ts: Clock::get()?.unix_timestamp,
    });

    Ok(())
}
A3) Premium fee split (optional but recommended)
If you want protocol fees now, update buy_policy to do:

fee = premium * fee_bps / 10_000
transfer fee to treasury ATA
transfer premium - fee to pool vault
pool.capital increases by net premium (or by full premium if you want fee to remain in pool)
Here’s the exact transfer logic:

Rust

let fee = crate::utils::math::mul_div_u64(quote.premium_amount, cfg.protocol_fee_bps as u64, 10_000)?;
let net_premium = quote.premium_amount.checked_sub(fee).ok_or(ClimaFiError::MathOverflow)?;

// fee -> treasury
if fee > 0 {
    token::transfer(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.buyer_usdc_ata.to_account_info(),
                to: ctx.accounts.treasury_usdc_ata.to_account_info(),
                authority: ctx.accounts.buyer.to_account_info(),
            },
        ),
        fee,
    )?;
}

// net -> pool
token::transfer(
    CpiContext::new(
        ctx.accounts.token_program.to_account_info(),
        Transfer {
            from: ctx.accounts.buyer_usdc_ata.to_account_info(),
            to: ctx.accounts.pool_vault_usdc_ata.to_account_info(),
            authority: ctx.accounts.buyer.to_account_info(),
        },
    ),
    net_premium,
)?;
You’ll need to add treasury_usdc_ata: Account<TokenAccount> to the BuyPolicy context and constrain it to config.treasury_usdc_ata.

A4) Settlement engine (deterministic observation coverage + trigger + payout)
Add a helper to compute expected day count + validate observation schedule
Create:

programs/climafi/src/utils/settlement.rs
Rust

use anchor_lang::prelude::*;
use crate::{errors::ClimaFiError, state::*};

pub const DAY_SECS: i64 = 86_400;

/// Requires windows aligned on day boundaries for MVP.
pub fn expected_days(window_start_unix: i64, window_end_unix: i64) -> Result<u16> {
    require!(window_end_unix > window_start_unix, ClimaFiError::InvalidTimeRange);
    let dur = window_end_unix - window_start_unix;
    // Require integer number of days
    require!(dur % DAY_SECS == 0, ClimaFiError::InvalidTimeRange);

    let days = (dur / DAY_SECS) as i64;
    require!(days > 0, ClimaFiError::InvalidTimeRange);
    require!(days <= crate::constants::MAX_WINDOW_DAYS as i64, ClimaFiError::TooManyObservations);
    Ok(days as u16)
}

pub fn eval_trigger(direction: TriggerDirection, observed: i64, threshold: i64) -> bool {
    match direction {
        TriggerDirection::LessThan => observed <= threshold,
        TriggerDirection::GreaterThan => observed >= threshold,
    }
}

pub fn compute_index(method: IndexMethod, values: &[i64]) -> Result<i64> {
    require!(!values.is_empty(), ClimaFiError::TooManyObservations);

    match method {
        IndexMethod::Sum => {
            let mut s: i128 = 0;
            for v in values {
                s = s.checked_add(*v as i128).ok_or(ClimaFiError::MathOverflow)?;
            }
            Ok(s as i64)
        }
        IndexMethod::Mean => {
            let mut s: i128 = 0;
            for v in values {
                s = s.checked_add(*v as i128).ok_or(ClimaFiError::MathOverflow)?;
            }
            let n = values.len() as i128;
            Ok((s / n) as i64)
        }
        IndexMethod::Max => {
            let mut m = values[0];
            for v in values.iter().skip(1) {
                if *v > m { m = *v; }
            }
            Ok(m)
        }
    }
}
Wire:

programs/climafi/src/utils/mod.rs
Rust

pub mod ed25519;
pub mod math;
pub mod settlement;
Implement settle_policy fully
This version:

requires full day coverage (no missing days)
validates each observation:
correct region/peril
correct day_start sequence
oracle authority matches config (MVP)
published_at is within staleness window relative to day_end
computes index and sets policy as Paid or Expired
transfers payout on trigger
updates pool.capital and pool.locked correctly
Replace settle_policy body:

Rust

pub fn settle_policy(ctx: Context<SettlePolicy>) -> Result<()> {
    let cfg = &ctx.accounts.config;
    require!(!cfg.paused, ClimaFiError::Paused);

    let now = Clock::get()?.unix_timestamp;

    let policy = &mut ctx.accounts.policy;
    require!(policy.status == PolicyStatus::Active, ClimaFiError::PolicyNotActive);
    require!(now >= policy.window_end_unix, ClimaFiError::PolicyWindowNotEnded);

    // Ensure policy_owner matches
    require_keys_eq!(policy.owner, ctx.accounts.policy_owner.key(), ClimaFiError::Unauthorized);

    // Expected observation accounts must cover each day in the window
    let days = crate::utils::settlement::expected_days(policy.window_start_unix, policy.window_end_unix)?;
    require!(ctx.remaining_accounts.len() == days as usize, ClimaFiError::TooManyObservations);

    // Load snapshots in order and validate
    let mut values: Vec<i64> = Vec::with_capacity(days as usize);

    for i in 0..days as usize {
        let ai = &ctx.remaining_accounts[i];
        let obs: Account<ObservationSnapshot> = Account::try_from(ai)?;

        // region/peril match
        require!(obs.region_id == policy.region_id, ClimaFiError::ObservationMismatch);
        require!(obs.peril as u8 == policy.peril as u8, ClimaFiError::ObservationMismatch);

        // expected day schedule
        let expected_day_start =
            policy.window_start_unix + (i as i64) * crate::utils::settlement::DAY_SECS;
        require!(obs.day_start_unix == expected_day_start, ClimaFiError::ObservationMismatch);

        // Oracle authority match (MVP)
        require_keys_eq!(obs.oracle_authority, cfg.oracle_authority, ClimaFiError::OracleUnauthorized);

        // Staleness rule: published must be after day_end, and not too late
        require!(obs.published_at_unix >= obs.day_end_unix, ClimaFiError::ObservationStale);
        require!(
            obs.published_at_unix <= obs.day_end_unix + cfg.max_oracle_staleness_secs as i64,
            ClimaFiError::ObservationStale
        );

        values.push(obs.value);
    }

    // Compute index + trigger
    let observed_value = crate::utils::settlement::compute_index(policy.index_method, &values)?;
    let triggered = crate::utils::settlement::eval_trigger(policy.direction, observed_value, policy.threshold);

    // Always unlock reserved exposure
    let pool = &mut ctx.accounts.pool;
    pool.locked = pool.locked.checked_sub(policy.payout_amount).ok_or(ClimaFiError::MathOverflow)?;

    // If triggered, payout from vault -> owner's USDC ATA
    if triggered {
        // Validate destination token account on-chain (strongly recommended)
        let owner_ata: Account<TokenAccount> = Account::try_from(&ctx.accounts.policy_owner_usdc_ata)?;
        require!(owner_ata.mint == cfg.usdc_mint, ClimaFiError::InvalidMint);
        require!(owner_ata.owner == policy.owner, ClimaFiError::Unauthorized);

        // Transfer payout signed by vault_auth
        let pool_id = pool.pool_id;
        let signer_seeds: &[&[&[u8]]] = &[&[
            VAULT_AUTH_SEED,
            &pool_id.to_le_bytes(),
            &[ctx.bumps.vault_auth],
        ]];

        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.pool_vault_usdc_ata.to_account_info(),
                    to: owner_ata.to_account_info(),
                    authority: ctx.accounts.vault_auth.to_account_info(),
                },
                signer_seeds,
            ),
            policy.payout_amount,
        )?;

        // Pool capital decreases by payout
        pool.capital = pool.capital.checked_sub(policy.payout_amount).ok_or(ClimaFiError::MathOverflow)?;

        policy.status = PolicyStatus::SettledPaid;
    } else {
        policy.status = PolicyStatus::SettledExpired;
    }

    policy.observed_value = observed_value;
    policy.triggered = triggered;
    policy.settled_at_unix = now;

    emit!(PolicySettled {
        policy_id: policy.policy_id,
        pool_id: policy.pool_id,
        triggered,
        observed_value,
        payout_amount: if triggered { policy.payout_amount } else { 0 },
        ts: now,
    });

    Ok(())
}
Update SettlePolicy context types (recommended)
Change policy_owner_usdc_ata to a typed TokenAccount so you can Account::<TokenAccount>::try_from without Unchecked:

Rust

#[account(mut)]
pub policy_owner_usdc_ata: Account<'info, TokenAccount>,
And ensure your client passes the real ATA.




TypeScript client mini-SDK
This is a practical set of files you can drop into sdk/ (or your app) to reliably build transactions.

Assumptions:

You’re using @coral-xyz/anchor + @solana/web3.js
You have IDLs generated for both programs (Anchor does this)
You can import the program objects from Anchor
C1) PDA helpers
sdk/pdas.ts
TypeScript

import { PublicKey } from "@solana/web3.js";

export const CLIMAFI_SEEDS = {
  CONFIG: Buffer.from("config"),
  POOL: Buffer.from("pool"),
  VAULT_AUTH: Buffer.from("vault_auth"),
  LP_MINT: Buffer.from("lp_mint"),
  POLICY: Buffer.from("policy"),
  OBS: Buffer.from("obs"),
};

export const LEGACY_SEEDS = {
  CONFIG: Buffer.from("config"),
  VAULT: Buffer.from("vault"),
  VAULT_AUTH: Buffer.from("vault_auth"),
  GUARDIANS: Buffer.from("guardians"),
  BENEFICIARIES: Buffer.from("beneficiaries"),
  ASSETS: Buffer.from("assets"),
  UNLOCK: Buffer.from("unlock"),
};

export function u64LE(n: bigint) {
  const b = Buffer.alloc(8);
  b.writeBigUInt64LE(n);
  return b;
}

export function i64LE(n: bigint) {
  const b = Buffer.alloc(8);
  b.writeBigInt64LE(n);
  return b;
}

// --------------------
// ClimaFi PDAs
// --------------------
export function climafiConfigPda(programId: PublicKey) {
  return PublicKey.findProgramAddressSync([CLIMAFI_SEEDS.CONFIG], programId);
}

export function climafiPoolPda(programId: PublicKey, poolId: bigint) {
  return PublicKey.findProgramAddressSync(
    [CLIMAFI_SEEDS.POOL, u64LE(poolId)],
    programId
  );
}

export function climafiVaultAuthPda(programId: PublicKey, poolId: bigint) {
  return PublicKey.findProgramAddressSync(
    [CLIMAFI_SEEDS.VAULT_AUTH, u64LE(poolId)],
    programId
  );
}

export function climafiLpMintPda(programId: PublicKey, poolId: bigint) {
  return PublicKey.findProgramAddressSync(
    [CLIMAFI_SEEDS.LP_MINT, u64LE(poolId)],
    programId
  );
}

export function climafiPolicyPda(programId: PublicKey, policyId: bigint) {
  return PublicKey.findProgramAddressSync(
    [CLIMAFI_SEEDS.POLICY, u64LE(policyId)],
    programId
  );
}

export function climafiObsPda(
  programId: PublicKey,
  regionId: bigint,
  perilU8: number,
  dayStartUnix: bigint
) {
  return PublicKey.findProgramAddressSync(
    [CLIMAFI_SEEDS.OBS, u64LE(regionId), Buffer.from([perilU8]), i64LE(dayStartUnix)],
    programId
  );
}

// --------------------
// LegacyVault PDAs
// --------------------
export function legacyConfigPda(programId: PublicKey) {
  return PublicKey.findProgramAddressSync([LEGACY_SEEDS.CONFIG], programId);
}

export function legacyVaultPda(programId: PublicKey, owner: PublicKey, vaultId: bigint) {
  return PublicKey.findProgramAddressSync(
    [LEGACY_SEEDS.VAULT, owner.toBuffer(), u64LE(vaultId)],
    programId
  );
}

export function legacyVaultAuthPda(programId: PublicKey, vault: PublicKey) {
  return PublicKey.findProgramAddressSync([LEGACY_SEEDS.VAULT_AUTH, vault.toBuffer()], programId);
}

export function legacyGuardiansPda(programId: PublicKey, vault: PublicKey) {
  return PublicKey.findProgramAddressSync([LEGACY_SEEDS.GUARDIANS, vault.toBuffer()], programId);
}

export function legacyBeneficiariesPda(programId: PublicKey, vault: PublicKey) {
  return PublicKey.findProgramAddressSync([LEGACY_SEEDS.BENEFICIARIES, vault.toBuffer()], programId);
}

export function legacyAssetsPda(programId: PublicKey, vault: PublicKey) {
  return PublicKey.findProgramAddressSync([LEGACY_SEEDS.ASSETS, vault.toBuffer()], programId);
}

export function legacyUnlockPda(programId: PublicKey, vault: PublicKey, nonce: bigint) {
  return PublicKey.findProgramAddressSync([LEGACY_SEEDS.UNLOCK, vault.toBuffer(), u64LE(nonce)], programId);
}
C2) ClimaFi quote serialization + signing + ed25519 ix
Key point: your on-chain program uses quote.try_to_vec() (Anchor/Borsh). Your TS must serialize the quote exactly the same way.

sdk/climafiQuote.ts
TypeScript

import nacl from "tweetnacl";
import { Ed25519Program, PublicKey, TransactionInstruction } from "@solana/web3.js";
import * as borsh from "@coral-xyz/borsh";
import BN from "bn.js";

// Mirror your Rust enums as u8
export enum Peril { Rainfall = 0, Temperature = 1, WindSpeed = 2 }
export enum IndexMethod { Sum = 0, Mean = 1, Max = 2 }
export enum TriggerDirection { LessThan = 0, GreaterThan = 1 }

export type Quote = {
  policyId: BN;            // u64
  poolId: BN;              // u64
  regionId: BN;            // u64
  peril: Peril;            // u8
  windowStartUnix: BN;     // i64
  windowEndUnix: BN;       // i64
  indexMethod: IndexMethod;// u8
  direction: TriggerDirection;// u8
  threshold: BN;           // i64
  payoutAmount: BN;        // u64
  premiumAmount: BN;       // u64
  quoteExpiryUnix: BN;     // i64
  nonce: BN;               // u64
};

// Borsh layout matching Rust Quote field order and types exactly
const QuoteLayout = borsh.struct([
  borsh.u64("policyId"),
  borsh.u64("poolId"),
  borsh.u64("regionId"),
  borsh.u8("peril"),
  borsh.i64("windowStartUnix"),
  borsh.i64("windowEndUnix"),
  borsh.u8("indexMethod"),
  borsh.u8("direction"),
  borsh.i64("threshold"),
  borsh.u64("payoutAmount"),
  borsh.u64("premiumAmount"),
  borsh.i64("quoteExpiryUnix"),
  borsh.u64("nonce"),
]);

export function serializeQuote(q: Quote): Buffer {
  const buf = Buffer.alloc(QuoteLayout.span);
  QuoteLayout.encode(q, buf);
  return buf;
}

export function signQuoteMessage(message: Buffer, signerSecretKey: Uint8Array): Uint8Array {
  return nacl.sign.detached(message, signerSecretKey);
}

export function ed25519VerifyIx(params: {
  publicKey: Uint8Array; // 32 bytes
  message: Buffer;
  signature: Uint8Array; // 64 bytes
}): TransactionInstruction {
  return Ed25519Program.createInstructionWithPublicKey({
    publicKey: params.publicKey,
    message: params.message,
    signature: params.signature,
  });
}

export function toPubkeyBytes(pk: PublicKey): Uint8Array {
  return new Uint8Array(pk.toBytes());
}
C3) Build buyPolicy transaction correctly (ed25519 ix index management)
sdk/climafiTx.ts
TypeScript

import { PublicKey, Transaction } from "@solana/web3.js";
import { Program } from "@coral-xyz/anchor";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import BN from "bn.js";
import { ed25519VerifyIx, serializeQuote, signQuoteMessage, toPubkeyBytes, Quote } from "./climafiQuote";
import { climafiConfigPda, climafiPoolPda, climafiPolicyPda, climafiVaultAuthPda } from "./pdas";

export async function buildBuyPolicyTx(args: {
  program: Program;                 // Anchor Program<Climafi>
  buyer: PublicKey;
  usdcMint: PublicKey;
  quote: Quote;
  quoteSignerPubkey: PublicKey;     // matches on-chain config.quote_signer
  quoteSignerSecretKey: Uint8Array; // only for your quote service; in demo you can embed
}): Promise<Transaction> {
  const { program, buyer, usdcMint, quote, quoteSignerPubkey, quoteSignerSecretKey } = args;

  const [configPda] = climafiConfigPda(program.programId);
  const [poolPda] = climafiPoolPda(program.programId, BigInt(quote.poolId.toString()));
  const [vaultAuthPda] = climafiVaultAuthPda(program.programId, BigInt(quote.poolId.toString()));
  const [policyPda] = climafiPolicyPda(program.programId, BigInt(quote.policyId.toString()));

  const buyerUsdcAta = getAssociatedTokenAddressSync(usdcMint, buyer);
  // pool vault ATA is derived in-program via ATA(vaultAuthPda, usdcMint), but you can compute too:
  const poolVaultUsdcAta = getAssociatedTokenAddressSync(usdcMint, vaultAuthPda, true);

  // 1) serialize quote message exactly as Rust does
  const msg = serializeQuote(quote);

  // 2) sign it (your quote service would do this; client only needs sig + pubkey)
  const sig = signQuoteMessage(msg, quoteSignerSecretKey);

  // 3) create ed25519 verify ix and add before buyPolicy
  const verifyIx = ed25519VerifyIx({
    publicKey: toPubkeyBytes(quoteSignerPubkey),
    message: msg,
    signature: sig,
  });

  // ed25519 ix is instruction 0 in this tx, so ed25519_ix_index = 0
  const buyIx = await program.methods
    .buyPolicy(quote, Array.from(sig) as any, 0) // (quote, signature[64], ed25519_ix_index)
    .accounts({
      config: configPda,
      pool: poolPda,
      vaultAuth: vaultAuthPda,
      poolVaultUsdcAta,
      policy: policyPda,
      buyer,
      buyerUsdcAta,
      instructionsSysvar: PublicKey.default, // Anchor will override if you set correct address in accounts; better:
      // pass the real sysvar:
      // instructionsSysvar: SYSVAR_INSTRUCTIONS_PUBKEY
      tokenProgram: /* TOKEN_PROGRAM_ID */ undefined as any,
      systemProgram: /* SystemProgram.programId */ undefined as any,
    })
    .instruction();

  const tx = new Transaction();
  tx.add(verifyIx);
  tx.add(buyIx);
  return tx;
}
You must fill in TOKEN_PROGRAM_ID, SystemProgram.programId, and SYSVAR_INSTRUCTIONS_PUBKEY correctly in your app (I left placeholders to keep the snippet focused).



Practical “wiring checklist” (so you don’t lose hours)
ClimaFi
Quote signing service must serialize the quote with the exact same Borsh layout as Rust.
Client tx must add:
Ed25519Program verify ix first
then buyPolicy(…, ed25519_ix_index=0)
Settlement must pass observation accounts in strict day order:
exactly days = (window_end - window_start)/86400 accounts
one per day, with day_start = window_start + i*86400



