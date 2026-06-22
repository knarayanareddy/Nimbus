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
    pub protocol_fee_bps: u16,
    pub treasury_usdc_ata: Pubkey,
    pub max_oracle_staleness_secs: u32,
    pub quote_signer: Pubkey,
    pub oracle_authority: Pubkey,
    pub min_policy_duration_secs: u32,
    pub max_policy_duration_secs: u32,
    pub version: u16,

    /// Used for quote nonce replay protection (simple global counter for MVP)
    pub last_used_nonce: u64,
}

impl GlobalConfig {
    pub const LEN: usize =
        8 + 32 + 1 + 32 + 2 + 32 + 4 + 32 + 32 + 4 + 4 + 2 + 8;
}

#[account]
pub struct Pool {
    pub pool_id: u64,
    pub peril: Peril,
    pub region_set_hash: [u8; 32],
    pub max_tenor_secs: u32,
    pub ltv_limit_bps: u16,
    pub capital: u64,
    pub locked: u64,
    pub lp_mint: Pubkey,
    pub vault_usdc_ata: Pubkey,
    pub created_at_unix: i64,
}

impl Pool {
    pub const LEN: usize = 8 + 8 + 1 + 32 + 4 + 2 + 8 + 8 + 32 + 32 + 8;
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
    pub threshold: i64,
    pub payout_amount: u64,
    pub premium_amount: u64,
    pub status: PolicyStatus,
    pub observed_value: i64,
    pub triggered: bool,
    pub settled_at_unix: i64,
    pub quote_hash: [u8; 32],
    pub created_at_unix: i64,
}

impl Policy {
    pub const LEN: usize =
        8 + 8 + 32 + 8 + 32 + 8 + 1 + 8 + 8 + 1 + 1 + 8 + 8 + 8 + 1 + 8 + 1 + 8 + 32 + 8;
}

#[account]
pub struct ObservationSnapshot {
    pub region_id: u64,
    pub peril: Peril,
    pub day_start_unix: i64,
    pub day_end_unix: i64,
    pub value: i64,
    pub published_at_unix: i64,
    pub oracle_authority: Pubkey,
    pub sources_bitmap: u16,
    pub agg_method: u8,
}

impl ObservationSnapshot {
    pub const LEN: usize = 8 + 8 + 1 + 8 + 8 + 8 + 8 + 32 + 2 + 1;
}

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

// ============================================================
// Events
// ============================================================

#[event]
pub struct PolicyPurchased {
    pub policy_id: u64,
    pub buyer: Pubkey,
    pub pool_id: u64,
    pub premium_amount: u64,
    pub payout_amount: u64,
    pub protocol_fee: u64,
    pub ts: i64,
}

#[event]
pub struct PolicySettled {
    pub policy_id: u64,
    pub owner: Pubkey,
    pub triggered: bool,
    pub observed_value: i64,
    pub index_method: IndexMethod,
    pub payout_amount: u64,
    pub ts: i64,
}

#[event]
pub struct PolicyCancelled {
    pub policy_id: u64,
    pub owner: Pubkey,
    pub refund_amount: u64,
    pub ts: i64,
}

#[event]
pub struct LiquidityDeposited {
    pub pool_id: u64,
    pub depositor: Pubkey,
    pub usdc_amount: u64,
    pub lp_minted: u64,
    pub ts: i64,
}

#[event]
pub struct LiquidityWithdrawn {
    pub pool_id: u64,
    pub withdrawer: Pubkey,
    pub usdc_amount: u64,
    pub lp_burned: u64,
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
pub struct TimelockScheduled {
    pub operation_type: String,
    pub admin: Pubkey,
    pub scheduled_at: i64,
    pub execute_after: i64,
}