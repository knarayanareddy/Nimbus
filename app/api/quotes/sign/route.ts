import { NextResponse } from 'next/server'
import nacl from 'tweetnacl'
import bs58 from 'bs58'
import { PersistentRateLimiter } from '../../../offchain/rate-limiter'

// Use environment variable - NEVER hardcode secrets
const QUOTE_SIGNER_SECRET = process.env.QUOTE_SIGNER_SECRET_KEY
if (!QUOTE_SIGNER_SECRET) {
  throw new Error('QUOTE_SIGNER_SECRET_KEY environment variable is required')
}

const QUOTE_SIGNER = nacl.sign.keyPair.fromSecretKey(bs58.decode(QUOTE_SIGNER_SECRET))

/**
 * Write a u64 as 8-byte little-endian buffer (matches Borsh serialization)
 */
function writeU64LE(value: bigint): Buffer {
  const buf = Buffer.alloc(8)
  buf.writeBigUInt64LE(value)
  return buf
}

/**
 * Write an i64 as 8-byte little-endian buffer (matches Borsh serialization)
 */
function writeI64LE(value: bigint): Buffer {
  const buf = Buffer.alloc(8)
  buf.writeBigInt64LE(value)
  return buf
}

export async function POST(request: Request) {
  const limiter = new PersistentRateLimiter(process.env.REDIS_URL || 'redis://localhost:6379')
  const ip = request.headers.get('x-forwarded-for') || 'unknown'
  
  const allowed = await limiter.isAllowed(ip)
  if (!allowed) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
  }

  const body = await request.json()

  const quote = {
    policy_id: BigInt(body.policyId || Date.now()),
    pool_id: BigInt(body.poolId || 1),
    region_id: BigInt(body.regionId || 0),
    peril: 0, // Rainfall
    window_start_unix: BigInt(body.windowStartUnix),
    window_end_unix: BigInt(body.windowEndUnix),
    index_method: 0, // Sum
    direction: body.direction === 'GT' ? 1 : 0,
    threshold: BigInt(Math.floor(body.thresholdMm * 100)),
    payout_amount: BigInt(body.payoutAmount),
    premium_amount: BigInt(body.premiumAmount),
    quote_expiry_unix: BigInt(Math.floor(Date.now() / 1000) + 120),
    nonce: BigInt(Date.now()),
  }

  // Borsh-compatible serialization: all integers as little-endian,
  // enums as single u8 byte. This matches Anchor's try_to_vec() output.
  const message = Buffer.concat([
    writeU64LE(quote.policy_id),
    writeU64LE(quote.pool_id),
    writeU64LE(quote.region_id),
    Buffer.from([quote.peril]),           // Peril enum (u8)
    writeI64LE(quote.window_start_unix),
    writeI64LE(quote.window_end_unix),
    Buffer.from([quote.index_method]),    // IndexMethod enum (u8)
    Buffer.from([quote.direction]),       // TriggerDirection enum (u8)
    writeI64LE(quote.threshold),
    writeU64LE(quote.payout_amount),
    writeU64LE(quote.premium_amount),
    writeI64LE(quote.quote_expiry_unix),
    writeU64LE(quote.nonce),
  ])

  const signature = nacl.sign.detached(message, QUOTE_SIGNER.secretKey)

  return NextResponse.json({
    quote: {
      policy_id: quote.policy_id.toString(),
      pool_id: quote.pool_id.toString(),
      region_id: quote.region_id.toString(),
      peril: { rainfall: {} },
      window_start_unix: quote.window_start_unix.toString(),
      window_end_unix: quote.window_end_unix.toString(),
      index_method: { sum: {} },
      direction: quote.direction === 1 ? { greaterThan: {} } : { lessThan: {} },
      threshold: quote.threshold.toString(),
      payout_amount: quote.payout_amount.toString(),
      premium_amount: quote.premium_amount.toString(),
      quote_expiry_unix: quote.quote_expiry_unix.toString(),
      nonce: quote.nonce.toString(),
    },
    signature: Buffer.from(signature).toString('base64'),
    quoteSignerPubkey: bs58.encode(QUOTE_SIGNER.publicKey),
    expiresUnix: Number(quote.quote_expiry_unix),
  })
}
