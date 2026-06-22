use anchor_lang::prelude::*;

pub const CONFIG_SEED: &[u8] = b"config";
pub const POOL_SEED: &[u8] = b"pool";
pub const VAULT_AUTH_SEED: &[u8] = b"vault_auth";
pub const LP_MINT_SEED: &[u8] = b"lp_mint";
pub const POLICY_SEED: &[u8] = b"policy";
pub const OBS_SEED: &[u8] = b"obs";
pub const TIMELOCK_SEED: &[u8] = b"timelock";

pub const BPS_DENOMINATOR: u16 = 10_000;
pub const MAX_WINDOW_DAYS: u32 = 31;
pub const DAY_SECS: i64 = 86_400;
pub const SCALE_RAIN_MM: i64 = 100;

// Switchboard V2 Program ID (mainnet + devnet)
// SW1TCH7qEPTdLsDHRgPuMQjbQxKdH2aBStViMFnt64f
pub const SWITCHBOARD_PROGRAM_ID: Pubkey = Pubkey::new_from_array([
    0x07, 0x01, 0xf3, 0xfa, 0x97, 0xc2, 0xad, 0x93,
    0x5a, 0x9c, 0xfe, 0x38, 0x66, 0x40, 0x64, 0x4c,
    0x85, 0xd0, 0xc0, 0x27, 0x29, 0xcc, 0xc4, 0xa1,
    0xf5, 0x8f, 0x7d, 0x78, 0x2f, 0x46, 0xba, 0xea,
]);
