import { Program, AnchorProvider, web3, BN } from '@coral-xyz/anchor'
import { Connection, PublicKey, Transaction, TransactionInstruction } from '@solana/web3.js'
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddress } from '@solana/spl-token'
import { Buffer } from 'buffer'

export const PROGRAM_ID = new PublicKey('CLiMaFi111111111111111111111111111111111111')

// USDC mint (devnet uses a different mint - update per environment)
export const USDC_MINT = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v')

// Minimal IDL for buy_policy + init_quote_nonce + deposit/withdraw (matches updated lib.rs)
export const IDL = {
  version: '0.1.0',
  name: 'nimbus',
  instructions: [
    {
      name: 'initQuoteNonce',
      accounts: [
        { name: 'quoteNonce', isMut: true, isSigner: false },
        { name: 'buyer', isMut: true, isSigner: true },
        { name: 'systemProgram', isMut: false, isSigner: false },
      ],
      args: [],
    },
    {
      name: 'buyPolicy',
      accounts: [
        { name: 'config', isMut: false, isSigner: false },
        { name: 'pool', isMut: true, isSigner: false },
        { name: 'poolVaultUsdcAta', isMut: true, isSigner: false },
        { name: 'treasuryUsdcAta', isMut: true, isSigner: false },
        { name: 'policy', isMut: true, isSigner: false },
        { name: 'buyer', isMut: true, isSigner: true },
        { name: 'buyerNonce', isMut: true, isSigner: false },
        { name: 'buyerUsdcAta', isMut: true, isSigner: false },
        { name: 'instructionsSysvar', isMut: false, isSigner: false },
        { name: 'tokenProgram', isMut: false, isSigner: false },
        { name: 'systemProgram', isMut: false, isSigner: false },
      ],
      args: [
        { name: 'quote', type: 'defined' },
        { name: 'signature', type: { array: ['u8', 64] } },
        { name: 'ed25519IxIndex', type: 'u8' },
      ],
    },
    {
      name: 'depositLiquidity',
      accounts: [
        { name: 'config', isMut: false, isSigner: false },
        { name: 'pool', isMut: true, isSigner: false },
        { name: 'vaultAuth', isMut: false, isSigner: false },
        { name: 'lpMint', isMut: true, isSigner: false },
        { name: 'depositor', isMut: true, isSigner: true },
        { name: 'depositorUsdcAta', isMut: true, isSigner: false },
        { name: 'poolVaultUsdcAta', isMut: true, isSigner: false },
        { name: 'depositorLpAta', isMut: true, isSigner: false },
        { name: 'tokenProgram', isMut: false, isSigner: false },
        { name: 'associatedTokenProgram', isMut: false, isSigner: false },
        { name: 'systemProgram', isMut: false, isSigner: false },
        { name: 'rent', isMut: false, isSigner: false },
      ],
      args: [{ name: 'amount', type: 'u64' }],
    },
    {
      name: 'withdrawLiquidity',
      accounts: [
        { name: 'config', isMut: false, isSigner: false },
        { name: 'pool', isMut: true, isSigner: false },
        { name: 'vaultAuth', isMut: false, isSigner: false },
        { name: 'lpMint', isMut: true, isSigner: false },
        { name: 'withdrawer', isMut: true, isSigner: true },
        { name: 'withdrawerUsdcAta', isMut: true, isSigner: false },
        { name: 'poolVaultUsdcAta', isMut: true, isSigner: false },
        { name: 'withdrawerLpAta', isMut: true, isSigner: false },
        { name: 'tokenProgram', isMut: false, isSigner: false },
      ],
      args: [{ name: 'lpAmount', type: 'u64' }],
    },
  ],
  types: [
    {
      name: 'Quote',
      type: {
        kind: 'struct',
        fields: [
          { name: 'policyId', type: 'u64' },
          { name: 'poolId', type: 'u64' },
          { name: 'regionId', type: 'u64' },
          { name: 'peril', type: { defined: 'Peril' } },
          { name: 'windowStartUnix', type: 'i64' },
          { name: 'windowEndUnix', type: 'i64' },
          { name: 'indexMethod', type: { defined: 'IndexMethod' } },
          { name: 'direction', type: { defined: 'TriggerDirection' } },
          { name: 'threshold', type: 'i64' },
          { name: 'payoutAmount', type: 'u64' },
          { name: 'premiumAmount', type: 'u64' },
          { name: 'quoteExpiryUnix', type: 'i64' },
          { name: 'nonce', type: 'u64' },
        ],
      },
    },
  ],
}

// PDA helpers
export function getConfigPda(): PublicKey {
  return PublicKey.findProgramAddressSync([Buffer.from('config')], PROGRAM_ID)[0]
}

export function getPoolPda(poolId: number | BN): PublicKey {
  const id = poolId instanceof BN ? poolId : new BN(poolId)
  return PublicKey.findProgramAddressSync(
    [Buffer.from('pool'), id.toArrayLike(Buffer, 'le', 8)],
    PROGRAM_ID
  )[0]
}

export function getVaultAuthPda(poolId: number | BN): PublicKey {
  const id = poolId instanceof BN ? poolId : new BN(poolId)
  return PublicKey.findProgramAddressSync(
    [Buffer.from('vault_auth'), id.toArrayLike(Buffer, 'le', 8)],
    PROGRAM_ID
  )[0]
}

export function getLpMintPda(poolId: number | BN): PublicKey {
  const id = poolId instanceof BN ? poolId : new BN(poolId)
  return PublicKey.findProgramAddressSync(
    [Buffer.from('lp_mint'), id.toArrayLike(Buffer, 'le', 8)],
    PROGRAM_ID
  )[0]
}

export function getPolicyPda(policyId: number | BN): PublicKey {
  const id = policyId instanceof BN ? policyId : new BN(policyId)
  return PublicKey.findProgramAddressSync(
    [Buffer.from('policy'), id.toArrayLike(Buffer, 'le', 8)],
    PROGRAM_ID
  )[0]
}

export function getQuoteNoncePda(buyerPubkey: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('quote_nonce'), buyerPubkey.toBuffer()],
    PROGRAM_ID
  )[0]
}

export async function createInitQuoteNonceTransaction(
  connection: Connection,
  wallet: { publicKey: PublicKey },
): Promise<Transaction> {
  const provider = new AnchorProvider(connection, wallet as any, {})
  const program = new Program(IDL as any, PROGRAM_ID, provider)
  const noncePda = getQuoteNoncePda(wallet.publicKey)

  return program.methods
    .initQuoteNonce()
    .accounts({
      quoteNonce: noncePda,
      buyer: wallet.publicKey,
      systemProgram: web3.SystemProgram.programId,
    })
    .transaction()
}

export async function createBuyPolicyTransaction(
  connection: Connection,
  wallet: { publicKey: PublicKey },
  quote: any,
  signature: Uint8Array,
  ed25519IxIndex: number,
  treasuryUsdcAtaPubkey: PublicKey,
): Promise<Transaction> {
  const provider = new AnchorProvider(connection, wallet as any, {})
  const program = new Program(IDL as any, PROGRAM_ID, provider)

  const configPda = getConfigPda()
  const poolPda = getPoolPda(quote.poolId)
  const policyPda = getPolicyPda(quote.policyId)
  const vaultAuthPda = getVaultAuthPda(quote.poolId)
  const noncePda = getQuoteNoncePda(wallet.publicKey)

  const buyerUsdcAta = await getAssociatedTokenAddress(USDC_MINT, wallet.publicKey)
  const poolVaultUsdcAta = await getAssociatedTokenAddress(USDC_MINT, vaultAuthPda, true)

  return program.methods
    .buyPolicy(quote, Array.from(signature), ed25519IxIndex)
    .accounts({
      config: configPda,
      pool: poolPda,
      poolVaultUsdcAta,
      treasuryUsdcAta: treasuryUsdcAtaPubkey,
      policy: policyPda,
      buyer: wallet.publicKey,
      buyerNonce: noncePda,
      buyerUsdcAta,
      instructionsSysvar: web3.SYSVAR_INSTRUCTIONS_PUBKEY,
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: web3.SystemProgram.programId,
    })
    .transaction()
}

export async function createDepositTransaction(
  connection: Connection,
  wallet: { publicKey: PublicKey },
  poolId: number,
  amount: number, // in USDC base units (6 decimals)
): Promise<Transaction> {
  const provider = new AnchorProvider(connection, wallet as any, {})
  const program = new Program(IDL as any, PROGRAM_ID, provider)

  const configPda = getConfigPda()
  const poolPda = getPoolPda(poolId)
  const vaultAuthPda = getVaultAuthPda(poolId)
  const lpMintPda = getLpMintPda(poolId)

  const depositorUsdcAta = await getAssociatedTokenAddress(USDC_MINT, wallet.publicKey)
  const poolVaultUsdcAta = await getAssociatedTokenAddress(USDC_MINT, vaultAuthPda, true)
  const depositorLpAta = await getAssociatedTokenAddress(lpMintPda, wallet.publicKey)

  return program.methods
    .depositLiquidity(new BN(amount))
    .accounts({
      config: configPda,
      pool: poolPda,
      vaultAuth: vaultAuthPda,
      lpMint: lpMintPda,
      depositor: wallet.publicKey,
      depositorUsdcAta,
      poolVaultUsdcAta,
      depositorLpAta,
      tokenProgram: TOKEN_PROGRAM_ID,
      associatedTokenProgram: new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL'),
      systemProgram: web3.SystemProgram.programId,
      rent: web3.SYSVAR_RENT_PUBKEY,
    })
    .transaction()
}

export async function createWithdrawTransaction(
  connection: Connection,
  wallet: { publicKey: PublicKey },
  poolId: number,
  lpAmount: number, // in LP token base units
): Promise<Transaction> {
  const provider = new AnchorProvider(connection, wallet as any, {})
  const program = new Program(IDL as any, PROGRAM_ID, provider)

  const configPda = getConfigPda()
  const poolPda = getPoolPda(poolId)
  const vaultAuthPda = getVaultAuthPda(poolId)
  const lpMintPda = getLpMintPda(poolId)

  const withdrawerUsdcAta = await getAssociatedTokenAddress(USDC_MINT, wallet.publicKey)
  const poolVaultUsdcAta = await getAssociatedTokenAddress(USDC_MINT, vaultAuthPda, true)
  const withdrawerLpAta = await getAssociatedTokenAddress(lpMintPda, wallet.publicKey)

  return program.methods
    .withdrawLiquidity(new BN(lpAmount))
    .accounts({
      config: configPda,
      pool: poolPda,
      vaultAuth: vaultAuthPda,
      lpMint: lpMintPda,
      withdrawer: wallet.publicKey,
      withdrawerUsdcAta,
      poolVaultUsdcAta,
      withdrawerLpAta,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .transaction()
}

// Re-export validated deserializers from centralized module
export {
  deserializeGlobalConfig,
  deserializeMultisigConfig,
  deserializePool,
  deserializePolicy,
  validateMultisigInvariants,
  validatePoolInvariants,
  validatePolicyInvariants,
  DeserializationError,
} from './deserialize'

export type {
  GlobalConfigData,
  MultisigConfigData,
  PoolData as PoolAccountData,
  PolicyData as PolicyAccountData,
} from './deserialize'

export function getTimelockPda(): PublicKey {
  return PublicKey.findProgramAddressSync([Buffer.from('timelock')], PROGRAM_ID)[0]
}

export function getObservationPda(
  regionId: number | BN,
  peril: number,
  dayStartUnix: number | BN,
): PublicKey {
  const rid = regionId instanceof BN ? regionId : new BN(regionId)
  const day = dayStartUnix instanceof BN ? dayStartUnix : new BN(dayStartUnix)
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from('obs'),
      rid.toArrayLike(Buffer, 'le', 8),
      Buffer.from([peril]),
      day.toArrayLike(Buffer, 'le', 8),
    ],
    PROGRAM_ID
  )[0]
}

export function buildObservationAccountKeys(
  regionId: number,
  peril: number,
  windowStartUnix: number,
  windowEndUnix: number,
): PublicKey[] {
  const daySeconds = 86400
  const keys: PublicKey[] = []
  for (let day = windowStartUnix; day < windowEndUnix; day += daySeconds) {
    keys.push(getObservationPda(regionId, peril, day))
  }
  return keys
}
