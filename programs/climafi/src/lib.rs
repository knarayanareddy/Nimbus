use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Mint, Transfer, MintTo, Burn};
use anchor_spl::associated_token::AssociatedToken;
use solana_program::sysvar::instructions::load_instruction_at_checked;

declare_id!("CLiMaFi1111111111111111111111111111111111111");

pub mod state;
pub mod constants;
pub mod errors;
pub mod risk;
pub mod switchboard;
pub mod timelock;
pub mod nonce;
pub mod reentrancy;
pub mod economic_safety;
pub mod compute;

use state::*;
use constants::*;
use errors::ClimaFiError;
use economic_safety::*;
use reentrancy::assert_no_cpi_in_transaction;
use nonce::{QuoteNonce, QUOTE_NONCE_SEED, validate_and_increment_nonce};
use timelock::{Timelock, AdminOperation, PendingOperation, MIN_TIMELOCK_DELAY};

#[program]
pub mod climafi {
    use super::*;

    // ==================== ADMIN ====================

    pub fn initialize_config(
        ctx: Context<InitializeConfig>,
        protocol_fee_bps: u16,
        max_oracle_staleness_secs: u32,
        min_policy_duration_secs: u32,
        max_policy_duration_secs: u32,
        quote_signer: Pubkey,
        oracle_authority: Pubkey,
    ) -> Result<()> {
        require!(protocol_fee_bps <= 500, ClimaFiError::InvalidBps);

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
        cfg.last_used_nonce = 0;

        Ok(())
    }

    pub fn set_paused(ctx: Context<SetPaused>, paused: bool) -> Result<()> {
        let config = &mut ctx.accounts.config;
        require!(ctx.accounts.admin.key() == config.admin, ClimaFiError::Unauthorized);
        config.paused = paused;
        Ok(())
    }

    // ==================== POOL MANAGEMENT ====================

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
        require!(ctx.accounts.admin.key() == cfg.admin, ClimaFiError::Unauthorized);
        require!(ltv_limit_bps <= BPS_DENOMINATOR, ClimaFiError::InvalidBps);

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
        Ok(())
    }

    // ==================== LIQUIDITY ====================

    pub fn deposit_liquidity(ctx: Context<DepositLiquidity>, amount: u64) -> Result<()> {
        let cfg = &ctx.accounts.config;
        require!(!cfg.paused, ClimaFiError::Paused);

        // M-02 fix: minimum deposit to prevent inflation attacks
        require!(amount >= MIN_DEPOSIT_AMOUNT, ClimaFiError::InvalidBps);

        let pool = &mut ctx.accounts.pool;
        let capital_before = pool.capital;
        let lp_supply_before = ctx.accounts.lp_mint.supply;

        // Transfer USDC into pool vault
        let cpi_accounts = Transfer {
            from: ctx.accounts.depositor_usdc_ata.to_account_info(),
            to: ctx.accounts.pool_vault_usdc_ata.to_account_info(),
            authority: ctx.accounts.depositor.to_account_info(),
        };
        let cpi_ctx = CpiContext::new(ctx.accounts.token_program.to_account_info(), cpi_accounts);
        token::transfer(cpi_ctx, amount)?;

        // LP mint amount: 1:1 on first deposit, proportional thereafter
        let lp_minted = if lp_supply_before == 0 || capital_before == 0 {
            amount
        } else {
            (amount as u128)
                .checked_mul(lp_supply_before as u128)
                .ok_or(ClimaFiError::MathOverflow)?
                .checked_div(capital_before as u128)
                .ok_or(ClimaFiError::MathOverflow)? as u64
        };

        // Mint LP tokens to depositor via vault_auth PDA
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

        pool.capital = pool.capital.checked_add(amount).ok_or(ClimaFiError::MathOverflow)?;

        emit!(LiquidityDeposited {
            pool_id: pool.pool_id,
            depositor: ctx.accounts.depositor.key(),
            usdc_amount: amount,
            lp_minted,
            ts: Clock::get()?.unix_timestamp,
        });

        Ok(())
    }

    pub fn withdraw_liquidity(ctx: Context<WithdrawLiquidity>, lp_amount: u64) -> Result<()> {
        let cfg = &ctx.accounts.config;
        require!(!cfg.paused, ClimaFiError::Paused);

        let pool = &mut ctx.accounts.pool;
        let lp_supply = ctx.accounts.lp_mint.supply;
        require!(lp_supply > 0, ClimaFiError::MathOverflow);

        // amount_out = lp_amount * pool.capital / lp_supply
        let amount_out = (lp_amount as u128)
            .checked_mul(pool.capital as u128)
            .ok_or(ClimaFiError::MathOverflow)?
            .checked_div(lp_supply as u128)
            .ok_or(ClimaFiError::MathOverflow)? as u64;

        let unlocked = pool.capital.checked_sub(pool.locked).ok_or(ClimaFiError::MathOverflow)?;
        require!(unlocked >= amount_out, ClimaFiError::InsufficientUnlockedCapital);

        // Burn LP tokens
        token::burn(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Burn {
                    mint: ctx.accounts.lp_mint.to_account_info(),
                    from: ctx.accounts.withdrawer_lp_ata.to_account_info(),
                    authority: ctx.accounts.withdrawer.to_account_info(),
                },
            ),
            lp_amount,
        )?;

        // Transfer USDC out via vault_auth PDA
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
                    to: ctx.accounts.withdrawer_usdc_ata.to_account_info(),
                    authority: ctx.accounts.vault_auth.to_account_info(),
                },
                signer_seeds,
            ),
            amount_out,
        )?;

        pool.capital = pool.capital.checked_sub(amount_out).ok_or(ClimaFiError::MathOverflow)?;
        assert_capital_solvency(pool)?;

        emit!(LiquidityWithdrawn {
            pool_id: pool.pool_id,
            withdrawer: ctx.accounts.withdrawer.key(),
            usdc_amount: amount_out,
            lp_burned: lp_amount,
            ts: Clock::get()?.unix_timestamp,
        });

        Ok(())
    }

    // ==================== NONCE ====================

    pub fn init_quote_nonce(ctx: Context<InitQuoteNonce>) -> Result<()> {
        let nonce_account = &mut ctx.accounts.quote_nonce;
        nonce_account.signer = ctx.accounts.buyer.key();
        nonce_account.last_nonce = 0;
        Ok(())
    }

    // ==================== POLICY ====================

    pub fn buy_policy(
        ctx: Context<BuyPolicy>,
        quote: Quote,
        signature: [u8; 64],
        ed25519_ix_index: u8,
    ) -> Result<()> {
        let cfg = &ctx.accounts.config;
        require!(!cfg.paused, ClimaFiError::Paused);

        let now = Clock::get()?.unix_timestamp;
        require!(quote.quote_expiry_unix >= now, ClimaFiError::QuoteExpired);
        require!(quote.premium_amount > 0, ClimaFiError::InvalidBps);

        // Per-signer nonce replay protection (prevents DoS via global nonce griefing)
        validate_and_increment_nonce(
            &mut ctx.accounts.buyer_nonce,
            &ctx.accounts.buyer.key(),
            quote.nonce,
        )?;

        // Ed25519 signature verification
        let msg = quote.try_to_vec()?;
        verify_ed25519_ix(
            &ctx.accounts.instructions_sysvar,
            ed25519_ix_index,
            cfg.quote_signer.as_ref(),
            &msg,
            &signature,
        )?;

        // Reentrancy protection
        assert_no_cpi_in_transaction(&ctx.accounts.instructions_sysvar)?;

        // Protocol fee split: fee goes to treasury, remainder to pool
        let protocol_fee = (quote.premium_amount as u128)
            .checked_mul(cfg.protocol_fee_bps as u128)
            .ok_or(ClimaFiError::MathOverflow)?
            .checked_div(BPS_DENOMINATOR as u128)
            .ok_or(ClimaFiError::MathOverflow)? as u64;
        let pool_premium = quote.premium_amount
            .checked_sub(protocol_fee)
            .ok_or(ClimaFiError::MathOverflow)?;

        // Transfer pool's share to vault
        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.buyer_usdc_ata.to_account_info(),
                    to: ctx.accounts.pool_vault_usdc_ata.to_account_info(),
                    authority: ctx.accounts.buyer.to_account_info(),
                },
            ),
            pool_premium,
        )?;

        // Transfer protocol fee to treasury
        if protocol_fee > 0 {
            token::transfer(
                CpiContext::new(
                    ctx.accounts.token_program.to_account_info(),
                    Transfer {
                        from: ctx.accounts.buyer_usdc_ata.to_account_info(),
                        to: ctx.accounts.treasury_usdc_ata.to_account_info(),
                        authority: ctx.accounts.buyer.to_account_info(),
                    },
                ),
                protocol_fee,
            )?;
        }

        // Pool exposure checks
        let pool = &mut ctx.accounts.pool;
        require!(pool.peril as u8 == quote.peril as u8, ClimaFiError::PoolPerilMismatch);

        let new_capital = pool.capital
            .checked_add(pool_premium)
            .ok_or(ClimaFiError::MathOverflow)?;
        let new_locked = pool.locked
            .checked_add(quote.payout_amount)
            .ok_or(ClimaFiError::MathOverflow)?;

        // LTV compliance: new_locked <= new_capital * ltv_limit_bps / 10_000
        let max_locked = (new_capital as u128)
            .checked_mul(pool.ltv_limit_bps as u128)
            .ok_or(ClimaFiError::MathOverflow)?
            .checked_div(BPS_DENOMINATOR as u128)
            .ok_or(ClimaFiError::MathOverflow)? as u64;

        require!(new_locked <= max_locked, ClimaFiError::LtvExceeded);

        // Circuit breaker
        if should_trigger_circuit_breaker(pool) {
            return Err(ClimaFiError::LtvExceeded.into());
        }

        pool.capital = new_capital;
        pool.locked = new_locked;

        // Create policy account
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
            policy_id: quote.policy_id,
            buyer: ctx.accounts.buyer.key(),
            pool_id: quote.pool_id,
            premium_amount: quote.premium_amount,
            payout_amount: quote.payout_amount,
            protocol_fee,
            ts: now,
        });

        Ok(())
    }

    pub fn cancel_policy(ctx: Context<CancelPolicy>) -> Result<()> {
        let now = Clock::get()?.unix_timestamp;
        let policy = &mut ctx.accounts.policy;
        require!(policy.status == PolicyStatus::Active, ClimaFiError::PolicyNotActive);
        require!(ctx.accounts.owner.key() == policy.owner, ClimaFiError::Unauthorized);
        require!(now < policy.window_start_unix, ClimaFiError::PolicyCancellationNotAllowed);

        // H-06 fix: minimum hold period (5 minutes) to prevent gaming
        require!(
            now >= policy.created_at_unix + MIN_HOLD_SECONDS,
            ClimaFiError::PolicyCancellationNotAllowed
        );

        // Unlock pool exposure
        let pool = &mut ctx.accounts.pool;
        pool.locked = pool.locked.checked_sub(policy.payout_amount).ok_or(ClimaFiError::MathOverflow)?;

        // Pro-rata premium refund: refund based on unused time proportion
        // refund = premium * (window_start - now) / (window_end - window_start) 
        // If cancel is before window start, full premium refund minus protocol fee
        let total_window = policy.window_end_unix
            .checked_sub(policy.window_start_unix)
            .ok_or(ClimaFiError::MathOverflow)? as u64;
        let unused_time = policy.window_start_unix
            .checked_sub(now)
            .ok_or(ClimaFiError::MathOverflow)? as u64;

        // Refund proportional to unused time (cancel before window = full refund of pool portion)
        let pool_premium = (policy.premium_amount as u128)
            .checked_mul((BPS_DENOMINATOR - ctx.accounts.config.protocol_fee_bps) as u128)
            .ok_or(ClimaFiError::MathOverflow)?
            .checked_div(BPS_DENOMINATOR as u128)
            .ok_or(ClimaFiError::MathOverflow)? as u64;

        let refund_amount = if unused_time >= total_window {
            pool_premium
        } else {
            (pool_premium as u128)
                .checked_mul(unused_time as u128)
                .ok_or(ClimaFiError::MathOverflow)?
                .checked_div(total_window as u128)
                .ok_or(ClimaFiError::MathOverflow)? as u64
        };

        if refund_amount > 0 {
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
                        to: ctx.accounts.owner_usdc_ata.to_account_info(),
                        authority: ctx.accounts.vault_auth.to_account_info(),
                    },
                    signer_seeds,
                ),
                refund_amount,
            )?;

            pool.capital = pool.capital.checked_sub(refund_amount).ok_or(ClimaFiError::MathOverflow)?;
        }

        policy.status = PolicyStatus::Cancelled;

        emit!(PolicyCancelled {
            policy_id: policy.policy_id,
            owner: ctx.accounts.owner.key(),
            refund_amount,
            ts: now,
        });

        Ok(())
    }

    // ==================== ORACLE ====================

    pub fn record_observation(
        ctx: Context<RecordObservation>,
        region_id: u64,
        peril: Peril,
        day_start_unix: i64,
        value: i64,
        sources_bitmap: u16,
    ) -> Result<()> {
        let cfg = &ctx.accounts.config;
        require!(!cfg.paused, ClimaFiError::Paused);

        let signer = ctx.accounts.oracle.key();
        require!(
            signer == cfg.oracle_authority,
            ClimaFiError::OracleUnauthorized
        );

        // Day alignment: day_start_unix must be midnight-aligned
        require!(day_start_unix % DAY_SECS == 0, ClimaFiError::InvalidTimeRange);

        // No future observations beyond 1 day ahead
        let now = Clock::get()?.unix_timestamp;
        require!(day_start_unix <= now + DAY_SECS, ClimaFiError::InvalidTimeRange);

        let obs = &mut ctx.accounts.observation;
        obs.region_id = region_id;
        obs.peril = peril;
        obs.day_start_unix = day_start_unix;
        obs.day_end_unix = day_start_unix + DAY_SECS;
        obs.value = value;
        obs.published_at_unix = now;
        obs.oracle_authority = signer;
        obs.sources_bitmap = sources_bitmap;
        obs.agg_method = 0;

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

    pub fn record_observation_switchboard(
        ctx: Context<RecordObservationSwitchboard>,
        region_id: u64,
        peril: Peril,
        day_start_unix: i64,
    ) -> Result<()> {
        switchboard::record_observation_switchboard(ctx, region_id, peril, day_start_unix)
    }

    // ==================== SETTLEMENT ====================

    pub fn settle_policy(ctx: Context<SettlePolicy>) -> Result<()> {
        let cfg = &ctx.accounts.config;
        require!(!cfg.paused, ClimaFiError::Paused);

        assert_no_cpi_in_transaction(&ctx.accounts.instructions_sysvar)?;

        let policy = &mut ctx.accounts.policy;
        require!(policy.status == PolicyStatus::Active, ClimaFiError::PolicyNotActive);

        let now = Clock::get()?.unix_timestamp;
        require!(now >= policy.window_end_unix, ClimaFiError::PolicyWindowNotEnded);

        // Validate policy owner is the signer (C-01 fix)
        require!(ctx.accounts.policy_owner.key() == policy.owner, ClimaFiError::Unauthorized);

        let pool = &mut ctx.accounts.pool;
        assert_capital_solvency(pool)?;

        // Read and validate remaining accounts (daily observation snapshots)
        let remaining = ctx.remaining_accounts;
        let num_days = ((policy.window_end_unix - policy.window_start_unix) / DAY_SECS) as usize;
        require!(remaining.len() == num_days, ClimaFiError::InvalidObservationCount);

        let program_id = crate::ID;
        let mut sum: i64 = 0;
        let mut max_val: i64 = i64::MIN;

        for (i, acc) in remaining.iter().enumerate() {
            // Account owner validation: must be owned by this program
            require!(acc.owner == &program_id, ClimaFiError::AccountOwnershipMismatch);

            let obs = ObservationSnapshot::try_deserialize(&mut &acc.data.borrow()[..])?;

            // Region and peril must match
            require!(
                obs.region_id == policy.region_id && obs.peril == policy.peril,
                ClimaFiError::ObservationMismatch
            );

            // Day alignment: each account must correspond to the correct day
            let expected_day = policy.window_start_unix + (i as i64 * DAY_SECS);
            require!(obs.day_start_unix == expected_day, ClimaFiError::ObservationMismatch);

            // Staleness check
            let staleness_limit = obs.day_end_unix + cfg.max_oracle_staleness_secs as i64;
            require!(obs.published_at_unix <= staleness_limit, ClimaFiError::ObservationStale);

            sum = sum.checked_add(obs.value).ok_or(ClimaFiError::MathOverflow)?;
            if obs.value > max_val {
                max_val = obs.value;
            }
        }

        // Compute aggregate index based on method (M-06 fix: single pass)
        let index_value = match policy.index_method {
            IndexMethod::Sum => sum,
            IndexMethod::Mean => {
                if num_days == 0 {
                    0
                } else {
                    sum.checked_div(num_days as i64).ok_or(ClimaFiError::MathOverflow)?
                }
            },
            IndexMethod::Max => max_val,
        };

        // Evaluate trigger
        let triggered = match policy.direction {
            TriggerDirection::LessThan => index_value <= policy.threshold,
            TriggerDirection::GreaterThan => index_value >= policy.threshold,
        };

        policy.observed_value = index_value;
        policy.triggered = triggered;
        policy.settled_at_unix = now;
        policy.status = if triggered { PolicyStatus::SettledPaid } else { PolicyStatus::SettledExpired };

        // Transfer payout if triggered
        if triggered {
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
                        to: ctx.accounts.policy_owner_usdc_ata.to_account_info(),
                        authority: ctx.accounts.vault_auth.to_account_info(),
                    },
                    signer_seeds,
                ),
                policy.payout_amount,
            )?;
        }

        // Unlock pool exposure regardless of trigger outcome
        pool.locked = pool.locked.checked_sub(policy.payout_amount).ok_or(ClimaFiError::MathOverflow)?;

        emit!(PolicySettled {
            policy_id: policy.policy_id,
            owner: policy.owner,
            triggered,
            observed_value: index_value,
            index_method: policy.index_method,
            payout_amount: if triggered { policy.payout_amount } else { 0 },
            ts: now,
        });

        Ok(())
    }

    // ==================== TIMELOCK ====================

    pub fn init_timelock(ctx: Context<InitTimelockCtx>, delay_seconds: u32) -> Result<()> {
        // H-05 fix: enforce minimum timelock delay
        require!(delay_seconds >= MIN_TIMELOCK_DELAY, ClimaFiError::InvalidTimeRange);

        let cfg = &ctx.accounts.config;
        require!(ctx.accounts.admin.key() == cfg.admin, ClimaFiError::Unauthorized);

        let tl = &mut ctx.accounts.timelock;
        tl.admin = ctx.accounts.admin.key();
        tl.delay_seconds = delay_seconds;
        tl.pending_operation = None;
        Ok(())
    }

    pub fn schedule_admin_operation(
        ctx: Context<ScheduleOperationCtx>,
        operation: AdminOperation,
    ) -> Result<()> {
        let tl = &mut ctx.accounts.timelock;
        require!(
            ctx.accounts.admin.key() == tl.admin,
            ClimaFiError::Unauthorized
        );
        require!(tl.pending_operation.is_none(), ClimaFiError::TimelockBusy);

        let now = Clock::get()?.unix_timestamp;
        let desc = operation.description().to_string();

        tl.pending_operation = Some(PendingOperation {
            operation,
            scheduled_at: now,
            executed: false,
        });

        emit!(TimelockScheduled {
            operation_type: desc,
            admin: ctx.accounts.admin.key(),
            scheduled_at: now,
            execute_after: now + tl.delay_seconds as i64,
        });

        Ok(())
    }

    pub fn execute_admin_operation(ctx: Context<ExecuteOperationCtx>) -> Result<()> {
        let tl = &mut ctx.accounts.timelock;
        require!(
            ctx.accounts.admin.key() == tl.admin,
            ClimaFiError::Unauthorized
        );

        let delay = tl.delay_seconds;
        let pending = tl.pending_operation.as_ref().ok_or(ClimaFiError::TimelockEmpty)?;
        require!(!pending.executed, ClimaFiError::TimelockAlreadyExecuted);

        let now = Clock::get()?.unix_timestamp;
        require!(
            now >= pending.scheduled_at + delay as i64,
            ClimaFiError::TimelockNotReady
        );

        let operation = pending.operation.clone();
        let cfg = &mut ctx.accounts.config;
        let mut new_tl_admin: Option<Pubkey> = None;
        match &operation {
            AdminOperation::SetPaused { paused } => {
                cfg.paused = *paused;
            }
            AdminOperation::UpdateQuoteSigner { new_signer } => {
                cfg.quote_signer = *new_signer;
            }
            AdminOperation::UpdateOracleAuthority { new_authority } => {
                cfg.oracle_authority = *new_authority;
            }
            AdminOperation::UpdateAdmin { new_admin } => {
                cfg.admin = *new_admin;
                new_tl_admin = Some(*new_admin);
            }
        }

        if let Some(admin) = new_tl_admin {
            tl.admin = admin;
        }
        tl.pending_operation.as_mut().unwrap().executed = true;
        Ok(())
    }

    pub fn cancel_admin_operation(ctx: Context<CancelOperationCtx>) -> Result<()> {
        let tl = &mut ctx.accounts.timelock;
        require!(
            ctx.accounts.admin.key() == tl.admin,
            ClimaFiError::Unauthorized
        );
        require!(tl.pending_operation.is_some(), ClimaFiError::TimelockEmpty);

        tl.pending_operation = None;
        Ok(())
    }
}

// ============================================================
// Ed25519 Verification Helper
// ============================================================

/// Verifies that instruction at `ix_index` is an Ed25519 program verify instruction
/// matching the expected pubkey, message, and signature.
///
/// The Ed25519 program instruction data layout:
/// [u8 num_signatures][u8 padding]
/// Then for each signature:
///   u16 sig_offset, u16 sig_ix_idx,
///   u16 pubkey_offset, u16 pubkey_ix_idx,
///   u16 msg_offset, u16 msg_size, u16 msg_ix_idx
/// Followed by actual signature, pubkey, message bytes.
fn verify_ed25519_ix(
    instructions_sysvar: &AccountInfo,
    ix_index: u8,
    pubkey: &[u8],
    message: &[u8],
    signature: &[u8; 64],
) -> Result<()> {
    let ix = load_instruction_at_checked(ix_index as usize, instructions_sysvar)
        .map_err(|_| error!(ClimaFiError::QuoteSigMissing))?;

    require!(
        ix.program_id == solana_program::ed25519_program::ID,
        ClimaFiError::QuoteSigMissing
    );

    let data = &ix.data;
    require!(data.len() >= 2, ClimaFiError::QuoteSigInvalid);

    let n = data[0] as usize;
    require!(n == 1, ClimaFiError::QuoteSigInvalid);

    let header_start = 2usize;
    let header_len = 14usize;
    require!(data.len() >= header_start + header_len, ClimaFiError::QuoteSigInvalid);

    let read_u16 = |i: usize| -> u16 {
        u16::from_le_bytes([data[i], data[i + 1]])
    };

    let sig_offset = read_u16(header_start) as usize;
    let sig_ix_idx = read_u16(header_start + 2);
    let pub_offset = read_u16(header_start + 4) as usize;
    let pub_ix_idx = read_u16(header_start + 6);
    let msg_offset = read_u16(header_start + 8) as usize;
    let msg_size = read_u16(header_start + 10) as usize;
    let msg_ix_idx = read_u16(header_start + 12);

    // H-04 fix: validate all ix_idx fields point to same instruction (0xFFFF = embedded)
    require!(sig_ix_idx == 0xFFFF, ClimaFiError::QuoteSigInvalid);
    require!(pub_ix_idx == 0xFFFF, ClimaFiError::QuoteSigInvalid);
    require!(msg_ix_idx == 0xFFFF, ClimaFiError::QuoteSigInvalid);

    require!(msg_size == message.len(), ClimaFiError::QuoteSigInvalid);
    require!(sig_offset + 64 <= data.len(), ClimaFiError::QuoteSigInvalid);
    require!(pub_offset + 32 <= data.len(), ClimaFiError::QuoteSigInvalid);
    require!(msg_offset + msg_size <= data.len(), ClimaFiError::QuoteSigInvalid);

    require!(&data[sig_offset..sig_offset + 64] == signature, ClimaFiError::QuoteSigInvalid);
    require!(&data[pub_offset..pub_offset + 32] == pubkey, ClimaFiError::QuoteSigInvalid);
    require!(&data[msg_offset..msg_offset + msg_size] == message, ClimaFiError::QuoteSigInvalid);

    Ok(())
}

// ============================================================
// Account Contexts
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

    /// CHECK: PDA only
    #[account(seeds = [VAULT_AUTH_SEED, &pool_id.to_le_bytes()], bump)]
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
    #[account(seeds = [VAULT_AUTH_SEED, &pool.pool_id.to_le_bytes()], bump)]
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
    #[account(seeds = [VAULT_AUTH_SEED, &pool.pool_id.to_le_bytes()], bump)]
    pub vault_auth: UncheckedAccount<'info>,

    #[account(mut, address = pool.lp_mint)]
    pub lp_mint: Account<'info, Mint>,

    #[account(mut)]
    pub withdrawer: Signer<'info>,

    #[account(
        mut,
        constraint = withdrawer_usdc_ata.mint == config.usdc_mint @ ClimaFiError::InvalidMint,
        constraint = withdrawer_usdc_ata.owner == withdrawer.key() @ ClimaFiError::Unauthorized
    )]
    pub withdrawer_usdc_ata: Account<'info, TokenAccount>,

    #[account(mut, address = pool.vault_usdc_ata)]
    pub pool_vault_usdc_ata: Account<'info, TokenAccount>,

    #[account(
        mut,
        associated_token::mint = lp_mint,
        associated_token::authority = withdrawer
    )]
    pub withdrawer_lp_ata: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct InitQuoteNonce<'info> {
    #[account(
        init,
        payer = buyer,
        space = QuoteNonce::LEN,
        seeds = [QUOTE_NONCE_SEED, buyer.key().as_ref()],
        bump
    )]
    pub quote_nonce: Account<'info, QuoteNonce>,

    #[account(mut)]
    pub buyer: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(quote: Quote)]
pub struct BuyPolicy<'info> {
    #[account(seeds = [CONFIG_SEED], bump)]
    pub config: Account<'info, GlobalConfig>,

    #[account(mut, seeds = [POOL_SEED, &quote.pool_id.to_le_bytes()], bump)]
    pub pool: Account<'info, Pool>,

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
        seeds = [QUOTE_NONCE_SEED, buyer.key().as_ref()],
        bump,
        constraint = buyer_nonce.signer == buyer.key() @ ClimaFiError::Unauthorized
    )]
    pub buyer_nonce: Account<'info, QuoteNonce>,

    #[account(
        mut,
        constraint = buyer_usdc_ata.mint == config.usdc_mint @ ClimaFiError::InvalidMint,
        constraint = buyer_usdc_ata.owner == buyer.key() @ ClimaFiError::Unauthorized
    )]
    pub buyer_usdc_ata: Account<'info, TokenAccount>,

    /// CHECK: instructions sysvar used to verify Ed25519 ix
    #[account(address = anchor_lang::solana_program::sysvar::instructions::ID)]
    pub instructions_sysvar: UncheckedAccount<'info>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CancelPolicy<'info> {
    #[account(seeds = [CONFIG_SEED], bump)]
    pub config: Account<'info, GlobalConfig>,

    // H-03 fix: constrain pool matches policy.pool
    #[account(mut, constraint = pool.key() == policy.pool @ ClimaFiError::PoolPerilMismatch)]
    pub pool: Account<'info, Pool>,

    /// CHECK: PDA
    #[account(seeds = [VAULT_AUTH_SEED, &pool.pool_id.to_le_bytes()], bump)]
    pub vault_auth: UncheckedAccount<'info>,

    #[account(mut, address = pool.vault_usdc_ata)]
    pub pool_vault_usdc_ata: Account<'info, TokenAccount>,

    #[account(mut)]
    pub policy: Account<'info, Policy>,

    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(
        mut,
        constraint = owner_usdc_ata.mint == config.usdc_mint @ ClimaFiError::InvalidMint,
        constraint = owner_usdc_ata.owner == owner.key() @ ClimaFiError::Unauthorized
    )]
    pub owner_usdc_ata: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
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
        seeds = [OBS_SEED, &region_id.to_le_bytes(), &[peril as u8], &day_start_unix.to_le_bytes()],
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

    // M-01 fix: constrain pool matches policy.pool
    #[account(mut, constraint = pool.key() == policy.pool @ ClimaFiError::PoolPerilMismatch)]
    pub pool: Account<'info, Pool>,

    /// CHECK: PDA
    #[account(seeds = [VAULT_AUTH_SEED, &pool.pool_id.to_le_bytes()], bump)]
    pub vault_auth: UncheckedAccount<'info>,

    #[account(mut, address = pool.vault_usdc_ata)]
    pub pool_vault_usdc_ata: Account<'info, TokenAccount>,

    #[account(mut)]
    pub policy: Account<'info, Policy>,

    // C-01 fix: policy_owner must be a Signer to prevent unauthorized settlement
    #[account(mut, constraint = policy_owner.key() == policy.owner @ ClimaFiError::Unauthorized)]
    pub policy_owner: Signer<'info>,

    #[account(mut, constraint = policy_owner_usdc_ata.owner == policy.owner @ ClimaFiError::Unauthorized)]
    pub policy_owner_usdc_ata: Account<'info, TokenAccount>,

    /// CHECK: instructions sysvar
    #[account(address = anchor_lang::solana_program::sysvar::instructions::ID)]
    pub instructions_sysvar: UncheckedAccount<'info>,

    pub token_program: Program<'info, Token>,
}

// ============================================================
// Timelock Contexts
// ============================================================

#[derive(Accounts)]
pub struct InitTimelockCtx<'info> {
    // H-01 fix: validate admin against config
    #[account(seeds = [CONFIG_SEED], bump)]
    pub config: Account<'info, GlobalConfig>,

    #[account(
        init,
        payer = admin,
        space = Timelock::LEN,
        seeds = [TIMELOCK_SEED],
        bump
    )]
    pub timelock: Account<'info, Timelock>,

    #[account(mut, constraint = admin.key() == config.admin @ ClimaFiError::Unauthorized)]
    pub admin: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ScheduleOperationCtx<'info> {
    #[account(mut, seeds = [TIMELOCK_SEED], bump)]
    pub timelock: Account<'info, Timelock>,

    pub admin: Signer<'info>,
}

#[derive(Accounts)]
pub struct ExecuteOperationCtx<'info> {
    #[account(mut, seeds = [TIMELOCK_SEED], bump)]
    pub timelock: Account<'info, Timelock>,

    #[account(mut, seeds = [CONFIG_SEED], bump)]
    pub config: Account<'info, GlobalConfig>,

    pub admin: Signer<'info>,
}

#[derive(Accounts)]
pub struct CancelOperationCtx<'info> {
    #[account(mut, seeds = [TIMELOCK_SEED], bump)]
    pub timelock: Account<'info, Timelock>,

    pub admin: Signer<'info>,
}

// ============================================================
// Switchboard Oracle Context
// ============================================================
#[derive(Accounts)]
#[instruction(region_id: u64, peril: Peril, day_start_unix: i64)]
pub struct RecordObservationSwitchboard<'info> {
    #[account(seeds = [CONFIG_SEED], bump)]
    pub config: Account<'info, GlobalConfig>,

    #[account(
        init,
        payer = oracle,
        space = ObservationSnapshot::LEN,
        seeds = [OBS_SEED, &region_id.to_le_bytes(), &[peril as u8], &day_start_unix.to_le_bytes()],
        bump
    )]
    pub observation: Account<'info, ObservationSnapshot>,

    #[account(constraint = switchboard_aggregator.to_account_info().owner == &SWITCHBOARD_PROGRAM_ID @ ClimaFiError::OracleUnauthorized)]
    pub switchboard_aggregator: Account<'info, switchboard::SwitchboardAggregator>,

    /// CHECK: Switchboard program ID
    #[account(address = SWITCHBOARD_PROGRAM_ID)]
    pub switchboard_program: UncheckedAccount<'info>,

    #[account(mut)]
    pub oracle: Signer<'info>,

    pub system_program: Program<'info, System>,
}
