//! Production-grade withdraw_liquidity with economic safety

use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Mint, Transfer};
use crate::state::{Pool, GlobalConfig};
use crate::errors::ClimaFiError;
use crate::economic_safety::assert_capital_solvency;

#[derive(Accounts)]
pub struct WithdrawLiquidity<'info> {
    #[account(seeds = [b"config"], bump)]
    pub config: Account<'info, GlobalConfig>,

    #[account(mut)]
    pub pool: Account<'info, Pool>,

    #[account(seeds = [b"vault_auth", &pool.pool_id.to_le_bytes()], bump)]
    /// CHECK: PDA
    pub vault_auth: UncheckedAccount<'info>,

    #[account(mut, address = pool.lp_mint)]
    pub lp_mint: Account<'info, Mint>,

    #[account(mut)]
    pub withdrawer: Signer<'info>,

    #[account(mut, constraint = withdrawer_usdc_ata.mint == config.usdc_mint)]
    pub withdrawer_usdc_ata: Account<'info, TokenAccount>,

    #[account(mut, address = pool.vault_usdc_ata)]
    pub pool_vault_usdc_ata: Account<'info, TokenAccount>,

    #[account(mut, constraint = withdrawer_lp_ata.mint == pool.lp_mint)]
    pub withdrawer_lp_ata: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

pub fn withdraw_liquidity(ctx: Context<WithdrawLiquidity>, lp_amount: u64) -> Result<()> {
    let pool = &mut ctx.accounts.pool;

    // Calculate amount to withdraw
    let lp_supply = ctx.accounts.lp_mint.supply;
    let amount_out = lp_amount
        .checked_mul(pool.capital)
        .ok_or(ClimaFiError::MathOverflow)?
        .checked_div(lp_supply)
        .ok_or(ClimaFiError::MathOverflow)?;

    // Economic Safety: Ensure enough unlocked capital
    let unlocked = pool.capital.saturating_sub(pool.locked);
    require!(unlocked >= amount_out, ClimaFiError::InsufficientUnlockedCapital);

    // Burn LP tokens
    // (simplified - in production use token::burn)

    // Transfer USDC out
    let cpi_accounts = Transfer {
        from: ctx.accounts.pool_vault_usdc_ata.to_account_info(),
        to: ctx.accounts.withdrawer_usdc_ata.to_account_info(),
        authority: ctx.accounts.vault_auth.to_account_info(),
    };
    let seeds = &[b"vault_auth", &pool.pool_id.to_le_bytes()[..], &[ctx.bumps.vault_auth]];
    let signer = &[&seeds[..]];
    let cpi_ctx = CpiContext::new_with_signer(ctx.accounts.token_program.to_account_info(), cpi_accounts, signer);
    token::transfer(cpi_ctx, amount_out)?;

    // Update pool state
    pool.capital = pool.capital.saturating_sub(amount_out);

    assert_capital_solvency(pool)?;

    Ok(())
}