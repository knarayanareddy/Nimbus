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
    #[msg("Observation snapshot does not match policy region/peril/day")]
    ObservationMismatch,
    #[msg("Invalid number of observation accounts passed")]
    InvalidObservationCount,
    #[msg("Math overflow")]
    MathOverflow,

    #[msg("Invalid quote signer")]
    InvalidQuoteSigner,
    
    #[msg("Account ownership mismatch")]
    AccountOwnershipMismatch,

    #[msg("Quote nonce already used (replay protection)")]
    NonceAlreadyUsed,

    #[msg("Timelock delay not elapsed")]
    TimelockNotReady,

    #[msg("Timelock has pending operation")]
    TimelockBusy,

    #[msg("No pending timelock operation")]
    TimelockEmpty,

    #[msg("Timelock operation already executed")]
    TimelockAlreadyExecuted,
}