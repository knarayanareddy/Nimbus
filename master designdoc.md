# Nimbus — masterdesigndoc.md (Single Source of Truth)
**Version:** 1.0   
**Date:** 2026-05-04  
**Target:** Frontier Hackathon submission by 2026-05-11  
**Primary Chain:** Solana  
**Core Currency:** USDC (SPL)  
**Core Product:** Parametric climate risk cover (MVP: rainfall index) with deterministic oracle snapshots + automatic payout.

---

## Table of Contents
1. Product summary
2. MVP scope, goals, non-goals
3. System architecture (on-chain + off-chain)
4. Oracle design (multi-source, daily snapshots)
5. Quote + pricing design (signed quotes)
6. On-chain program spec (Anchor)
   - PDA seed conventions (canonical)
   - Account model + exact structs
   - Instructions + exact contexts
   - Error codes
   - Events
   - Remaining-accounts conventions
   - Math, invariants, and settlement rules
7. Off-chain services (oracle, API, monitoring)
8. Database schema (Postgres + TimescaleDB)
9. API contract (HTTP)
10. Frontend build spec
11. Security & threat model
12. Testing plan (unit, integration, e2e)
13. Deployment plan + ops runbook
14. Hackathon execution plan (May 4 → May 11)

---

# 1) Product Summary
Nimbus is a Solana-native protocol for **parametric climate cover**:
- A user buys a policy defined by:
  - **Region** (bucketed geography)
  - **Peril** (MVP: rainfall)
  - **Observation window** (7/14/30 days; day-aligned)
  - **Index method** (MVP: SUM)
  - **Trigger** (<= threshold for drought, >= threshold for flood proxy)
  - **Payout** amount (USDC)
- The protocol:
  - locks exposure in an underwriter pool
  - consumes deterministic **daily ObservationSnapshot** accounts posted by an oracle publisher
  - settles automatically with a single on-chain instruction, paying out if triggered.

---

# 2) MVP Scope, Goals, Non-goals

## 2.1 MVP Scope
### Perils
- ✅ Rainfall only (daily totals)

### Trigger types
- ✅ Drought proxy: `SUM(rainfall_daily_mm) <= threshold_mm` over window
- ✅ Flood proxy: `SUM(rainfall_daily_mm) >= threshold_mm` over window

### Regions
- ✅ Pilot regions only (curated list). Region IDs stored off-chain as strings and mapped on-chain as `u64`.

### Window rules (determinism)
- ✅ Windows are aligned to UTC day boundaries (00:00 UTC)
- ✅ Window duration is 1–31 days
- ✅ Oracle must have posted a daily snapshot for every day in the window

### Currency
- ✅ USDC only (SPL mint configured in GlobalConfig)

### Oracle posting
- ✅ Permissioned oracle authority for MVP (`config.oracle_authority`)
- Later: permissionless (Switchboard / staking / slashing)

## 2.2 Goals
- Deterministic settlement: any observer can recompute the index and get the same result.
- Hard anti-tampering: signed quotes prevent premium/payout edits client-side.
- Capital safety: pool exposure cannot exceed LTV limit.
- Easy demo: monitoring job settles matured policies automatically.

## 2.3 Non-goals (MVP)
- Legal/regulatory insurance compliance across jurisdictions
- Full actuarial pricing
- Intraday triggers (72-hour rolling windows)
- Multi-peril bundles
- Cross-chain settlement

---

# 3) System Architecture (On-chain + Off-chain)

## 3.1 On-chain (Anchor Program: `nimbus`)
Single Anchor program that manages:
- Global config
- Pools (capital, locked exposure, vaults)
- LP tokens (pro-rata shares)
- Policies (quotes, states, settlement)
- Daily observation snapshots
- Settlement payouts in USDC

## 3.2 Off-chain
### Services
1. **Oracle Aggregator Service**
   - Polls multiple sources (WeatherXM, Open-Meteo, NOAA as examples)
   - Stores raw observations in TimescaleDB
   - Computes daily totals per region
   - Posts daily snapshot to Solana via `record_observation(...)`

2. **Quote + Pricing API**
   - `POST /quotes/calculate`: preview premium breakdown
   - `POST /quotes/sign`: returns on-chain Quote + Ed25519 signature

3. **Policy Monitor Job**
   - Every 5 minutes:
     - finds matured policies (window_end passed)
     - builds `settle_policy` tx with required ObservationSnapshot PDAs
     - submits tx (or prompts admin in demo mode)

### Data stores
- Postgres + TimescaleDB (oracle raw + aggregates + policy metadata)
- Redis (hot cache: latest region readings, computed quotes)

---

# 4) Oracle Design (Multi-source + Daily Snapshots)

## 4.1 Why daily snapshots (design decision)
- 15-minute granularity is excellent for charts and confidence scoring, but too heavy for on-chain settlement.
- On-chain settlement needs fixed-size and deterministic inputs.
- Therefore: **store 15-min raw readings off-chain**; **post one daily snapshot per region** on-chain.

## 4.2 Canonical on-chain snapshot
For each (region_id_u64, peril=Rainfall, day_start_utc):
- `value`: daily total rainfall in **mm * 100** (scaled int)
- `published_at_unix`: when the snapshot was posted
- `sources_bitmap`: which providers contributed
- `agg_method`: 0=median, 1=trimmed mean, etc. (MVP: median)

## 4.3 Posting cadence
- At **00:05 UTC** each day, post the previous day’s snapshot.

## 4.4 Staleness constraints
Snapshot must satisfy:
- `published_at >= day_end`
- `published_at <= day_end + config.max_oracle_staleness_secs`

---

# 5) Quote + Pricing Design (Signed Quotes)

## 5.1 Why signed quotes
Pricing is off-chain in MVP; without signatures, users can modify:
- premium
- payout
- thresholds
- windows

Therefore:
- API signs a canonical `Quote` struct with Ed25519
- client includes Ed25519 verify instruction in the same transaction
- `buy_policy` checks that the verify instruction matches the exact message bytes

## 5.2 Quote lifecycle
1. UI builds desired policy params.
2. UI calls `POST /quotes/calculate` to show breakdown.
3. UI calls `POST /quotes/sign` to obtain:
   - Quote fields
   - signature
   - expiry timestamp
4. UI sends Solana tx:
   1) Ed25519 verify ix
   2) `buy_policy(quote, signature, ed25519_ix_index)`

---

# 6) On-chain Program Spec (Anchor)

## 6.1 Canonical PDA Seed Conventions (Single Source of Truth)
```rust
CONFIG_SEED      = b"config"
POOL_SEED        = b"pool"        + pool_id_le_u64
VAULT_AUTH_SEED  = b"vault_auth"  + pool_id_le_u64
LP_MINT_SEED     = b"lp_mint"     + pool_id_le_u64
POLICY_SEED      = b"policy"      + policy_id_le_u64
OBS_SEED         = b"obs"         + region_id_le_u64 + peril_u8 + day_start_unix_le_i64
6.2 Program constants
Rust

BPS_DENOMINATOR = 10_000
MAX_WINDOW_DAYS = 31
DAY_SECS        = 86_400
SCALE_RAIN_MM   = 100  // rainfall is mm * 100 stored as i64
6.3 Exact Anchor State (Structs)
Implementation note: The following structs are intended to be used verbatim in programs/nimbus/src/state.rs.

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

    /// Protocol fee charged on premium (bps). Fee is transferred to treasury.
    pub protocol_fee_bps: u16,

    /// Treasury USDC token account for fee collection
    pub treasury_usdc_ata: Pubkey,

    /// Snapshot staleness allowance, e.g. 172800 (48h)
    pub max_oracle_staleness_secs: u32,

    /// Ed25519 public key used to sign quotes off-chain
    pub quote_signer: Pubkey,

    /// Oracle authority that can post snapshots in MVP
    pub oracle_authority: Pubkey,

    pub min_policy_duration_secs: u32,
    pub max_policy_duration_secs: u32,

    pub version: u16,
}

impl GlobalConfig {
    pub const LEN: usize =
        8  +  // disc
        32 +  // admin
        1  +  // paused
        32 +  // usdc_mint
        2  +  // protocol_fee_bps
        32 +  // treasury_usdc_ata
        4  +  // max_oracle_staleness_secs
        32 +  // quote_signer
        32 +  // oracle_authority
        4  +  // min_policy_duration_secs
        4  +  // max_policy_duration_secs
        2;    // version
}

#[account]
pub struct Pool {
    pub pool_id: u64,
    pub peril: Peril,

    /// Commitment to allowed regions (hash of list or Merkle root)
    pub region_set_hash: [u8; 32],

    pub max_tenor_secs: u32,

    /// locked <= capital * ltv_limit_bps / 10_000
    pub ltv_limit_bps: u16,

    /// Total pool capital in USDC base units
    pub capital: u64,

    /// Reserved liability for active policies (sum of payouts)
    pub locked: u64,

    /// LP token mint (mint authority = vault_auth PDA)
    pub lp_mint: Pubkey,

    /// USDC vault ATA owned by vault_auth PDA
    pub vault_usdc_ata: Pubkey,

    pub created_at_unix: i64,
}

impl Pool {
    pub const LEN: usize =
        8  + // disc
        8  + // pool_id
        1  + // peril
        32 + // region_set_hash
        4  + // max_tenor_secs
        2  + // ltv_limit_bps
        8  + // capital
        8  + // locked
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

    /// Scaled i64, e.g. rainfall_mm * 100
    pub threshold: i64,

    pub payout_amount: u64,
    pub premium_amount: u64,

    pub status: PolicyStatus,

    /// Written at settlement
    pub observed_value: i64,
    pub triggered: bool,
    pub settled_at_unix: i64,

    pub quote_hash: [u8; 32],

    pub created_at_unix: i64,
}

impl Policy {
    pub const LEN: usize =
        8  +  // disc
        8  +  // policy_id
        32 +  // owner
        8  +  // pool_id
        32 +  // pool
        8  +  // region_id
        1  +  // peril
        8  +  // window_start_unix
        8  +  // window_end_unix
        1  +  // index_method
        1  +  // direction
        8  +  // threshold
        8  +  // payout_amount
        8  +  // premium_amount
        1  +  // status
        8  +  // observed_value
        1  +  // triggered
        8  +  // settled_at_unix
        32 +  // quote_hash
        8;    // created_at_unix
}

#[account]
pub struct ObservationSnapshot {
    pub region_id: u64,
    pub peril: Peril,

    pub day_start_unix: i64,
    pub day_end_unix: i64,

    /// Scaled i64, e.g. mm * 100
    pub value: i64,

    pub published_at_unix: i64,
    pub oracle_authority: Pubkey,

    pub sources_bitmap: u16,
    pub agg_method: u8,
}

impl ObservationSnapshot {
    pub const LEN: usize =
        8  +  // disc
        8  +  // region_id
        1  +  // peril
        8  +  // day_start_unix
        8  +  // day_end_unix
        8  +  // value
        8  +  // published_at_unix
        32 +  // oracle_authority
        2  +  // sources_bitmap
        1;    // agg_method
}

/// Canonical signed quote. Off-chain signs Quote::try_to_vec().
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
6.4 Instructions (Functional Spec)
Admin
initialize_config(...)
set_paused(paused: bool)
create_pool(pool_id, peril, region_set_hash, max_tenor_secs, ltv_limit_bps)
Underwriter
deposit_liquidity(amount: u64) → pro-rata LP minting
withdraw_liquidity(lp_amount: u64) → pro-rata USDC out (must be unlocked)
Policyholder
buy_policy(quote: Quote, signature: [u8; 64], ed25519_ix_index: u8)
verifies signature
transfers premium (net to pool, fee to treasury)
locks exposure
creates Policy
cancel_policy() (optional, only before window_start; MVP can omit refunds)
Oracle
record_observation(...) → posts daily snapshot PDA (permissioned oracle)
Settlement
settle_policy()
requires policy active + window ended
reads remaining accounts: daily ObservationSnapshot PDAs for each day in the window, in order
computes index + trigger
unlocks pool exposure
transfers payout if triggered
marks policy settled
6.5 Exact Anchor Contexts (Accounts structs)
Implementation note: Use these verbatim in programs/nimbus/src/lib.rs (or contexts.rs). Requires anchor_spl features for token + ATA.

Rust

use anchor_lang::prelude::*;
use anchor_spl::{
  associated_token::AssociatedToken,
  token::{Mint, Token, TokenAccount},
};

use crate::state::*;
use crate::constants::*;
use crate::errors::NimbusError;

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

  /// Treasury USDC ATA (must match usdc mint)
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

  /// CHECK: PDA token authority
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

  /// CHECK: PDA token authority (signer for LP mint + vault transfers)
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
    constraint = depositor_usdc_ata.mint == config.usdc_mint @ NimbusError::InvalidMint,
    constraint = depositor_usdc_ata.owner == depositor.key() @ NimbusError::Unauthorized
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

  /// CHECK: PDA token authority
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
    constraint = depositor_usdc_ata.mint == config.usdc_mint @ NimbusError::InvalidMint,
    constraint = depositor_usdc_ata.owner == depositor.key() @ NimbusError::Unauthorized
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

  /// CHECK: PDA token authority
  #[account(
    seeds = [VAULT_AUTH_SEED, &quote.pool_id.to_le_bytes()],
    bump
  )]
  pub vault_auth: UncheckedAccount<'info>,

  #[account(mut, address = pool.vault_usdc_ata)]
  pub pool_vault_usdc_ata: Account<'info, TokenAccount>,

  #[account(mut, address = config.treasury_usdc_ata)]
  pub treasury_usdc_ata: Account<'info, TokenAccount>,

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
    constraint = buyer_usdc_ata.mint == config.usdc_mint @ NimbusError::InvalidMint,
    constraint = buyer_usdc_ata.owner == buyer.key() @ NimbusError::Unauthorized
  )]
  pub buyer_usdc_ata: Account<'info, TokenAccount>,

  /// CHECK: instructions sysvar used to verify ed25519 ix presence
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

  /// CHECK: PDA token authority
  #[account(
    seeds = [VAULT_AUTH_SEED, &pool.pool_id.to_le_bytes()],
    bump
  )]
  pub vault_auth: UncheckedAccount<'info>,

  #[account(mut, address = pool.vault_usdc_ata)]
  pub pool_vault_usdc_ata: Account<'info, TokenAccount>,

  #[account(mut)]
  pub policy: Account<'info, Policy>,

  /// CHECK: validated against policy.owner in handler
  pub policy_owner: UncheckedAccount<'info>,

  #[account(mut)]
  pub policy_owner_usdc_ata: Account<'info, TokenAccount>,

  pub token_program: Program<'info, Token>,
}
6.6 Error Codes (Exact)
Rust

use anchor_lang::prelude::*;

#[error_code]
pub enum NimbusError {
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

  #[msg("Observation snapshot does not match policy region/peril/day")]
  ObservationMismatch,

  #[msg("Invalid number of observation accounts passed")]
  InvalidObservationCount,

  #[msg("Math overflow")]
  MathOverflow,
}
6.7 Events (Exact)
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
6.8 Remaining-Accounts Conventions (Settlement)
settle_policy reads ctx.remaining_accounts as the complete list of daily snapshots:

Must pass exactly N accounts, where:
N = (window_end_unix - window_start_unix) / 86400
Must be in strict order:
day i account corresponds to:
day_start = window_start + i*86400
Each remaining account must deserialize into Account<ObservationSnapshot> and must match:
obs.region_id == policy.region_id
obs.peril == policy.peril
obs.day_start_unix == expected_day_start
If any snapshot missing/mismatched → settlement fails.

6.9 Core Math + Invariants
Invariants
pool.capital >= pool.locked
pool.locked <= pool.capital * ltv_limit_bps / 10_000
Policy cannot be settled more than once
Policy can only be cancelled before window_start
LP math
lp_minted = amount if first deposit
else lp_minted = amount * lp_supply / capital_before
amount_out = lp_amount * pool.capital / lp_supply
Withdraw only if pool.capital - pool.locked >= amount_out
Trigger evaluation
For rainfall SUM:
observed = SUM(obs.value[i])
triggered = observed <= threshold (drought) or >= (flood)
6.10 Ed25519 Quote Verification Requirement (Transaction-level)
Client must insert an Ed25519 verification instruction before calling buy_policy.
Program verifies that the Ed25519 instruction exists in the transaction and matches:

pubkey = config.quote_signer
message bytes = quote.try_to_vec()
signature = provided [u8; 64]
7) Off-chain Services Spec
7.1 Oracle Aggregator Service
Responsibilities:

Maintain canonical region list (regions table)
Poll sources every 15 minutes:
store raw readings (oracle_readings)
Compute daily rainfall totals after day close:
store in oracle_daily_aggregates
Publish daily on-chain snapshot:
record_observation(region_id_u64, peril=Rainfall, day_start, day_end, value_mm_x100, published_at, sources_bitmap, agg_method)
Key config:

ORACLE_KEYPAIR_PATH
SOLANA_RPC_URL
PROGRAM_ID_NIMBUS
REGION_LIST_SOURCE (DB table)
PUBLISH_TIME_UTC=00:05
7.2 Quote + Pricing API
Responsibilities:

Compute premium (MVP deterministic formula)
Sign Quote with QUOTE_SIGNER private key
Key config:

QUOTE_SIGNER_KEYPAIR
USDC_MINT
TREASURY_USDC_ATA
POOL_LTV_LIMIT_BPS (read from chain or cached)
MVP premium formula (replace later):

pure_premium = payout * base_rate_bps(region_tier, tenor_days)/10_000
utilization_surcharge = payout * util_bps(pool_util)/10_000
protocol_fee = premium * protocol_fee_bps/10_000
total_premium = pure_premium + utilization_surcharge + protocol_fee
7.3 Policy Monitor Job
Every 5 minutes:

Find active policies in DB and/or scan chain by events
For any policy with now >= window_end:
build observation PDA list for each day
submit settle_policy
8) Database Schema (Postgres + TimescaleDB)
8.1 Tables (minimum viable)
regions
region_id TEXT PRIMARY KEY
region_id_u64 BIGINT UNIQUE NOT NULL
name TEXT
lat DOUBLE PRECISION
lon DOUBLE PRECISION
bounds_json JSONB
risk_tier SMALLINT (1–5)
active BOOLEAN
oracle_readings (Timescale hypertable)
time TIMESTAMPTZ NOT NULL
region_id TEXT NOT NULL
source TEXT NOT NULL
rain_mm_x100 INTEGER NOT NULL
confidence REAL
indexes: (region_id, time desc), (source, time desc)
oracle_daily_aggregates
day_start_utc TIMESTAMPTZ NOT NULL
region_id TEXT NOT NULL
rain_mm_x100 INTEGER NOT NULL
sources_bitmap INTEGER NOT NULL
agg_method SMALLINT NOT NULL
UNIQUE(region_id, day_start_utc)
quotes
quote_hash BYTEA PRIMARY KEY
policy_id BIGINT NOT NULL
pool_id BIGINT NOT NULL
region_id_u64 BIGINT NOT NULL
window_start_unix BIGINT NOT NULL
window_end_unix BIGINT NOT NULL
premium_amount BIGINT NOT NULL
payout_amount BIGINT NOT NULL
expires_unix BIGINT NOT NULL
created_at TIMESTAMPTZ NOT NULL
policies_index
policy_id BIGINT PRIMARY KEY
owner TEXT NOT NULL
pool_id BIGINT NOT NULL
region_id TEXT NOT NULL
window_start_unix BIGINT NOT NULL
window_end_unix BIGINT NOT NULL
status TEXT NOT NULL
triggered BOOLEAN
observed_value BIGINT
tx_sig_purchase TEXT
tx_sig_settle TEXT
9) API Contract (HTTP)
9.1 Quotes
POST /v1/quotes/calculate
Request:

JSON

{
  "poolId": "1",
  "regionId": "KEN-NRB-001",
  "windowStartUnix": 1764547200,
  "windowEndUnix": 1767139200,
  "thresholdMm": 120.0,
  "direction": "LT",
  "payoutAmount": "500000000"
}
Response:

JSON

{
  "premiumAmount": "35000000",
  "breakdown": {
    "purePremium": "25000000",
    "utilizationSurcharge": "5000000",
    "protocolFee": "5000000"
  },
  "quoteValiditySecs": 120
}
POST /v1/quotes/sign
Response:

JSON

{
  "quote": { "...": "borsh-matched-fields" },
  "signature": "base64...",
  "quoteSignerPubkey": "....",
  "expiresUnix": 1764547320
}
9.2 Oracle
GET /v1/oracle/regions
GET /v1/oracle/:regionId/current
GET /v1/oracle/:regionId/history?hours=168&interval=15m
GET /v1/oracle/:regionId/daily?days=60
9.3 Policies
GET /v1/policies/:wallet
GET /v1/policies/:policyId
10) Frontend Build Spec (Next.js)
Pages
/buy policy builder:
Region selector (map + list)
Drought/Flood toggle
Window picker (7/14/30)
Threshold slider/input
Payout input
Quote panel + “Buy” button
/portfolio list policies + status
/pools underwriter dashboard: deposit/withdraw, utilization, locked/capital
/oracle transparency dashboard (charts from Timescale)
Wallet support
Phantom, Backpack via @solana/wallet-adapter
11) Security & Threat Model
Oracle manipulation
MVP mitigation: oracle is permissioned + multi-source validation off-chain
Protocol mitigation: staleness checks; deterministic daily snapshots; pause switch
Pool insolvency
Locked exposure limited by LTV
Withdrawal blocked if it would reduce unlocked capital below 0
Quote tampering
Signed quotes verified via Ed25519 instruction checks
Program safety
No unwraps
Checked math only
Strict constraints on token mints and ownership
12) Testing Plan
On-chain unit tests
deposit/withdraw pro-rata LP correctness
buy_policy:
rejects missing ed25519 ix
rejects expired quote
locks exposure and moves funds
record_observation:
rejects non-oracle authority
settle_policy:
rejects wrong count/order
triggered payout path decreases pool.capital, unlocks pool.locked
expired path unlocks pool.locked only
double settle fails
Off-chain tests
oracle aggregator merges sources deterministically
daily publishing posts correct PDAs
quote signing message matches on-chain serialization
13) Deployment + Ops
Environments
localnet: unit + integration
devnet: demo
mainnet: optional post-hackathon
Secrets
ORACLE_AUTHORITY keypair
QUOTE_SIGNER keypair
Observability
Index program events:

PolicyPurchased
ObservationRecorded
PolicySettled
