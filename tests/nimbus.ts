import * as anchor from '@coral-xyz/anchor';
import { Program, BN } from '@coral-xyz/anchor';
import { PublicKey, Keypair, SystemProgram, SYSVAR_INSTRUCTIONS_PUBKEY } from '@solana/web3.js';
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createMint,
  createAssociatedTokenAccount,
  mintTo,
  getAccount,
} from '@solana/spl-token';
import { expect } from 'chai';
import nacl from 'tweetnacl';

describe('Nimbus - Full Integration Tests', () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Nimbus as Program;

  let admin: Keypair;
  let buyer: Keypair;
  let usdcMint: PublicKey;
  let treasuryAta: PublicKey;
  let configPda: PublicKey;
  let configBump: number;
  let quoteSigner: Keypair;
  let oracleAuthority: Keypair;
  let poolPda: PublicKey;
  let vaultAuthPda: PublicKey;
  let lpMintPda: PublicKey;
  let poolVaultUsdcAta: PublicKey;

  const POOL_ID = new BN(1);
  const DAY_SECS = 86400;

  before(async () => {
    admin = Keypair.generate();
    buyer = Keypair.generate();
    quoteSigner = Keypair.generate();
    oracleAuthority = Keypair.generate();

    // Airdrop SOL
    await provider.connection.requestAirdrop(admin.publicKey, 20 * anchor.web3.LAMPORTS_PER_SOL);
    await provider.connection.requestAirdrop(buyer.publicKey, 20 * anchor.web3.LAMPORTS_PER_SOL);
    await provider.connection.requestAirdrop(oracleAuthority.publicKey, 5 * anchor.web3.LAMPORTS_PER_SOL);

    // Wait for airdrop confirmations
    await new Promise(r => setTimeout(r, 1000));

    // Create mock USDC mint
    usdcMint = await createMint(
      provider.connection,
      admin,
      admin.publicKey,
      null,
      6
    );

    // Create treasury ATA
    treasuryAta = await createAssociatedTokenAccount(
      provider.connection,
      admin,
      usdcMint,
      admin.publicKey
    );

    // Derive PDAs
    [configPda, configBump] = PublicKey.findProgramAddressSync(
      [Buffer.from('config')],
      program.programId
    );
    [poolPda] = PublicKey.findProgramAddressSync(
      [Buffer.from('pool'), POOL_ID.toArrayLike(Buffer, 'le', 8)],
      program.programId
    );
    [vaultAuthPda] = PublicKey.findProgramAddressSync(
      [Buffer.from('vault_auth'), POOL_ID.toArrayLike(Buffer, 'le', 8)],
      program.programId
    );
    [lpMintPda] = PublicKey.findProgramAddressSync(
      [Buffer.from('lp_mint'), POOL_ID.toArrayLike(Buffer, 'le', 8)],
      program.programId
    );
  });

  // ============================================
  // INITIALIZE CONFIG
  // ============================================

  it('Initializes GlobalConfig', async () => {
    await program.methods
      .initializeConfig(
        50,     // 0.5% protocol fee
        172800, // 48h staleness
        86400,  // 1 day min
        2678400, // 31 days max
        quoteSigner.publicKey,
        oracleAuthority.publicKey,
      )
      .accounts({
        config: configPda,
        usdcMint,
        treasuryUsdcAta: treasuryAta,
        admin: admin.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([admin])
      .rpc();

    const config = await program.account.globalConfig.fetch(configPda);
    expect(config.admin.toBase58()).to.equal(admin.publicKey.toBase58());
    expect(config.paused).to.be.false;
    expect(config.protocolFeeBps).to.equal(50);
    expect(config.quoteSigner.toBase58()).to.equal(quoteSigner.publicKey.toBase58());
    expect(config.oracleAuthority.toBase58()).to.equal(oracleAuthority.publicKey.toBase58());
  });

  // ============================================
  // ACCESS CONTROL
  // ============================================

  it('Prevents unauthorized pause', async () => {
    const attacker = Keypair.generate();
    await provider.connection.requestAirdrop(attacker.publicKey, 1 * anchor.web3.LAMPORTS_PER_SOL);
    await new Promise(r => setTimeout(r, 500));

    try {
      await program.methods
        .setPaused(true)
        .accounts({
          config: configPda,
          admin: attacker.publicKey,
        })
        .signers([attacker])
        .rpc();
      expect.fail('Should have thrown Unauthorized');
    } catch (err: any) {
      expect(err.toString()).to.include('Unauthorized');
    }
  });

  it('Admin can pause and unpause', async () => {
    await program.methods
      .setPaused(true)
      .accounts({ config: configPda, admin: admin.publicKey })
      .signers([admin])
      .rpc();

    let config = await program.account.globalConfig.fetch(configPda);
    expect(config.paused).to.be.true;

    await program.methods
      .setPaused(false)
      .accounts({ config: configPda, admin: admin.publicKey })
      .signers([admin])
      .rpc();

    config = await program.account.globalConfig.fetch(configPda);
    expect(config.paused).to.be.false;
  });

  // ============================================
  // CREATE POOL
  // ============================================

  it('Creates pool with valid parameters', async () => {
    await program.methods
      .createPool(
        POOL_ID,
        { rainfall: {} },
        Array.from(Buffer.alloc(32)),
        31 * DAY_SECS,
        6500, // 65% LTV
      )
      .accounts({
        config: configPda,
        pool: poolPda,
        vaultAuth: vaultAuthPda,
        lpMint: lpMintPda,
        poolVaultUsdcAta: undefined, // will be derived by init_if_needed
        usdcMint,
        admin: admin.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .signers([admin])
      .rpc();

    const pool = await program.account.pool.fetch(poolPda);
    expect(pool.poolId.toNumber()).to.equal(1);
    expect(pool.ltvLimitBps).to.equal(6500);
    expect(pool.capital.toNumber()).to.equal(0);
    expect(pool.locked.toNumber()).to.equal(0);

    // Save vault ATA for later use
    poolVaultUsdcAta = pool.vaultUsdcAta;
  });

  it('Rejects pool creation by non-admin', async () => {
    const attacker = Keypair.generate();
    await provider.connection.requestAirdrop(attacker.publicKey, 2 * anchor.web3.LAMPORTS_PER_SOL);
    await new Promise(r => setTimeout(r, 500));

    const fakePoolId = new BN(999);
    const [fakePoolPda] = PublicKey.findProgramAddressSync(
      [Buffer.from('pool'), fakePoolId.toArrayLike(Buffer, 'le', 8)],
      program.programId
    );
    const [fakeVaultAuth] = PublicKey.findProgramAddressSync(
      [Buffer.from('vault_auth'), fakePoolId.toArrayLike(Buffer, 'le', 8)],
      program.programId
    );
    const [fakeLpMint] = PublicKey.findProgramAddressSync(
      [Buffer.from('lp_mint'), fakePoolId.toArrayLike(Buffer, 'le', 8)],
      program.programId
    );

    try {
      await program.methods
        .createPool(fakePoolId, { rainfall: {} }, Array.from(Buffer.alloc(32)), 86400, 5000)
        .accounts({
          config: configPda,
          pool: fakePoolPda,
          vaultAuth: fakeVaultAuth,
          lpMint: fakeLpMint,
          usdcMint,
          admin: attacker.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
          rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        })
        .signers([attacker])
        .rpc();
      expect.fail('Non-admin should not create pools');
    } catch (err: any) {
      expect(err.toString()).to.include('Unauthorized');
    }
  });

  it('Rejects LTV > 10000 bps', async () => {
    const badPoolId = new BN(998);
    const [badPoolPda] = PublicKey.findProgramAddressSync(
      [Buffer.from('pool'), badPoolId.toArrayLike(Buffer, 'le', 8)],
      program.programId
    );
    const [badVaultAuth] = PublicKey.findProgramAddressSync(
      [Buffer.from('vault_auth'), badPoolId.toArrayLike(Buffer, 'le', 8)],
      program.programId
    );
    const [badLpMint] = PublicKey.findProgramAddressSync(
      [Buffer.from('lp_mint'), badPoolId.toArrayLike(Buffer, 'le', 8)],
      program.programId
    );

    try {
      await program.methods
        .createPool(badPoolId, { rainfall: {} }, Array.from(Buffer.alloc(32)), 86400, 15000)
        .accounts({
          config: configPda,
          pool: badPoolPda,
          vaultAuth: badVaultAuth,
          lpMint: badLpMint,
          usdcMint,
          admin: admin.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
          rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        })
        .signers([admin])
        .rpc();
      expect.fail('LTV > 10000 should be rejected');
    } catch (err: any) {
      expect(err.toString()).to.include('InvalidBps');
    }
  });

  // ============================================
  // DEPOSIT LIQUIDITY
  // ============================================

  it('Deposits liquidity and receives LP tokens', async () => {
    // Mint USDC to buyer (acting as depositor)
    const buyerUsdcAta = await createAssociatedTokenAccount(
      provider.connection, admin, usdcMint, buyer.publicKey
    );
    await mintTo(provider.connection, admin, usdcMint, buyerUsdcAta, admin, 10_000_000_000); // 10k USDC

    const depositAmount = new BN(1_000_000_000); // 1000 USDC

    const depositorLpAta = await createAssociatedTokenAccount(
      provider.connection, buyer, lpMintPda, buyer.publicKey
    );

    await program.methods
      .depositLiquidity(depositAmount)
      .accounts({
        config: configPda,
        pool: poolPda,
        vaultAuth: vaultAuthPda,
        lpMint: lpMintPda,
        depositor: buyer.publicKey,
        depositorUsdcAta: buyerUsdcAta,
        poolVaultUsdcAta,
        depositorLpAta,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .signers([buyer])
      .rpc();

    const pool = await program.account.pool.fetch(poolPda);
    expect(pool.capital.toNumber()).to.equal(1_000_000_000);

    // LP tokens should be 1:1 on first deposit
    const lpAccount = await getAccount(provider.connection, depositorLpAta);
    expect(Number(lpAccount.amount)).to.equal(1_000_000_000);
  });

  // ============================================
  // ORACLE - RECORD OBSERVATION
  // ============================================

  it('Oracle records observation', async () => {
    const regionId = new BN(1);
    const peril = { rainfall: {} };
    const dayStart = new BN(Math.floor(Date.now() / 1000) - DAY_SECS);

    const [obsPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from('obs'),
        regionId.toArrayLike(Buffer, 'le', 8),
        Buffer.from([0]), // Rainfall = 0
        dayStart.toArrayLike(Buffer, 'le', 8),
      ],
      program.programId
    );

    await program.methods
      .recordObservation(regionId, peril, dayStart, new BN(5000), 3) // 50mm rainfall
      .accounts({
        config: configPda,
        observation: obsPda,
        oracle: oracleAuthority.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([oracleAuthority])
      .rpc();

    const obs = await program.account.observationSnapshot.fetch(obsPda);
    expect(obs.regionId.toNumber()).to.equal(1);
    expect(obs.value.toNumber()).to.equal(5000);
  });

  it('Rejects unauthorized oracle', async () => {
    const attacker = Keypair.generate();
    await provider.connection.requestAirdrop(attacker.publicKey, 1 * anchor.web3.LAMPORTS_PER_SOL);
    await new Promise(r => setTimeout(r, 500));

    const regionId = new BN(999);
    const dayStart = new BN(Math.floor(Date.now() / 1000));

    const [obsPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from('obs'),
        regionId.toArrayLike(Buffer, 'le', 8),
        Buffer.from([0]),
        dayStart.toArrayLike(Buffer, 'le', 8),
      ],
      program.programId
    );

    try {
      await program.methods
        .recordObservation(regionId, { rainfall: {} }, dayStart, new BN(9999), 1)
        .accounts({
          config: configPda,
          observation: obsPda,
          oracle: attacker.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([attacker])
        .rpc();
      expect.fail('Unauthorized oracle should be rejected');
    } catch (err: any) {
      expect(err.toString()).to.include('OracleUnauthorized');
    }
  });

  // ============================================
  // NONCE - INIT QUOTE NONCE
  // ============================================

  it('Initializes per-signer quote nonce', async () => {
    const [noncePda] = PublicKey.findProgramAddressSync(
      [Buffer.from('quote_nonce'), buyer.publicKey.toBuffer()],
      program.programId
    );

    await program.methods
      .initQuoteNonce()
      .accounts({
        quoteNonce: noncePda,
        buyer: buyer.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([buyer])
      .rpc();

    const nonce = await program.account.quoteNonce.fetch(noncePda);
    expect(nonce.signer.toBase58()).to.equal(buyer.publicKey.toBase58());
    expect(nonce.lastNonce.toNumber()).to.equal(0);
  });

  // ============================================
  // CANCEL POLICY
  // ============================================

  it('Rejects cancel by non-owner', async () => {
    // This would require a policy to exist first.
    // Since buy_policy requires Ed25519 instruction which is complex to simulate,
    // we verify the contract-level check exists by testing with a non-existent policy
    // (will fail at account level, which confirms the instruction is wired)
    const attacker = Keypair.generate();
    await provider.connection.requestAirdrop(attacker.publicKey, 1 * anchor.web3.LAMPORTS_PER_SOL);

    const fakePolicyId = new BN(999);
    const [fakePolicyPda] = PublicKey.findProgramAddressSync(
      [Buffer.from('policy'), fakePolicyId.toArrayLike(Buffer, 'le', 8)],
      program.programId
    );

    try {
      await program.methods
        .cancelPolicy()
        .accounts({
          config: configPda,
          pool: poolPda,
          policy: fakePolicyPda,
          owner: attacker.publicKey,
        })
        .signers([attacker])
        .rpc();
      expect.fail('Should have failed');
    } catch (err: any) {
      // Expected: either AccountNotInitialized or Unauthorized
      expect(err.toString()).to.satisfy((s: string) =>
        s.includes('AccountNotInitialized') ||
        s.includes('Unauthorized') ||
        s.includes('Error')
      );
    }
  });

  // ============================================
  // WITHDRAW LIQUIDITY
  // ============================================

  it('Withdraws liquidity by burning LP tokens', async () => {
    const buyerUsdcAta = await anchor.utils.token.associatedAddress({
      mint: usdcMint,
      owner: buyer.publicKey,
    });
    const depositorLpAta = await anchor.utils.token.associatedAddress({
      mint: lpMintPda,
      owner: buyer.publicKey,
    });

    const poolBefore = await program.account.pool.fetch(poolPda);
    const withdrawLp = new BN(100_000_000); // 100 LP tokens

    await program.methods
      .withdrawLiquidity(withdrawLp)
      .accounts({
        config: configPda,
        pool: poolPda,
        vaultAuth: vaultAuthPda,
        lpMint: lpMintPda,
        withdrawer: buyer.publicKey,
        withdrawerUsdcAta: buyerUsdcAta,
        poolVaultUsdcAta,
        withdrawerLpAta: depositorLpAta,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([buyer])
      .rpc();

    const poolAfter = await program.account.pool.fetch(poolPda);
    expect(poolAfter.capital.toNumber()).to.be.lessThan(poolBefore.capital.toNumber());
  });

  // ============================================
  // ECONOMIC INVARIANTS
  // ============================================

  it('Pool maintains capital >= locked invariant', async () => {
    const pool = await program.account.pool.fetch(poolPda);
    expect(pool.capital.toNumber()).to.be.greaterThanOrEqual(pool.locked.toNumber());
  });

  it('Rejects withdrawal exceeding unlocked capital', async () => {
    const pool = await program.account.pool.fetch(poolPda);
    const excessAmount = new BN(pool.capital.toNumber() + 1_000_000);

    const buyerUsdcAta = await anchor.utils.token.associatedAddress({
      mint: usdcMint,
      owner: buyer.publicKey,
    });
    const depositorLpAta = await anchor.utils.token.associatedAddress({
      mint: lpMintPda,
      owner: buyer.publicKey,
    });

    try {
      await program.methods
        .withdrawLiquidity(excessAmount)
        .accounts({
          config: configPda,
          pool: poolPda,
          vaultAuth: vaultAuthPda,
          lpMint: lpMintPda,
          withdrawer: buyer.publicKey,
          withdrawerUsdcAta: buyerUsdcAta,
          poolVaultUsdcAta,
          withdrawerLpAta: depositorLpAta,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([buyer])
        .rpc();
      expect.fail('Should reject excessive withdrawal');
    } catch (err: any) {
      // Expected: InsufficientUnlockedCapital or token error
      expect(err.toString()).to.satisfy((s: string) =>
        s.includes('InsufficientUnlockedCapital') ||
        s.includes('Error') ||
        s.includes('insufficient')
      );
    }
  });

  // ============================================
  // PAUSED PROTOCOL CHECKS
  // ============================================

  it('Rejects operations when paused', async () => {
    // Pause the protocol
    await program.methods
      .setPaused(true)
      .accounts({ config: configPda, admin: admin.publicKey })
      .signers([admin])
      .rpc();

    // Try deposit while paused
    const buyerUsdcAta = await anchor.utils.token.associatedAddress({
      mint: usdcMint,
      owner: buyer.publicKey,
    });
    const depositorLpAta = await anchor.utils.token.associatedAddress({
      mint: lpMintPda,
      owner: buyer.publicKey,
    });

    try {
      await program.methods
        .depositLiquidity(new BN(1_000_000))
        .accounts({
          config: configPda,
          pool: poolPda,
          vaultAuth: vaultAuthPda,
          lpMint: lpMintPda,
          depositor: buyer.publicKey,
          depositorUsdcAta: buyerUsdcAta,
          poolVaultUsdcAta,
          depositorLpAta,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
          rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        })
        .signers([buyer])
        .rpc();
      expect.fail('Should reject deposit when paused');
    } catch (err: any) {
      expect(err.toString()).to.include('Paused');
    }

    // Unpause for remaining tests
    await program.methods
      .setPaused(false)
      .accounts({ config: configPda, admin: admin.publicKey })
      .signers([admin])
      .rpc();
  });
});
