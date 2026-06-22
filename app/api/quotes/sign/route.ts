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

// Singleton rate limiter (M-09 fix: avoid creating per-request)
const rateLimiter = new PersistentRateLimiter(
  process.env.REDIS_URL || 'redis://localhost:6379'
)

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

/**
 * M-05 fix: Validate and sanitize request body
 */
function validateQuoteRequest(body: any): { valid: boolean; error?: string } {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Request body must be a JSON object' }
  }

  const requiredNumeric = ['windowStartUnix', 'windowEndUnix', 'payoutAmount', 'premiumAmount', 'thresholdMm']
  for (const field of requiredNumeric) {
    if (body[field] === undefined || body[field] === null) {
      return { valid: false, error: `Missing required field: ${field}` }
    }
    const num = Number(body[field])
    if (!Number.isFinite(num) || num < 0) {
      return { valid: false, error: `Invalid value for ${field}: must be a non-negative number` }
    }
  }

  const windowStart = Number(body.windowStartUnix)
  const windowEnd = Number(body.windowEndUnix)
  const now = Math.floor(Date.now() / 1000)

  if (windowEnd <= windowStart) {
    return { valid: false, error: 'windowEndUnix must be after windowStartUnix' }
  }

  if (windowStart < now) {
    return { valid: false, error: 'windowStartUnix must be in the future' }
  }

  const durationDays = (windowEnd - windowStart) / 86400
  if (durationDays < 1 || durationDays > 31) {
    return { valid: false, error: 'Policy duration must be between 1 and 31 days' }
  }

  if (Number(body.payoutAmount) === 0) {
    return { valid: false, error: 'payoutAmount must be greater than 0' }
  }

  if (Number(body.premiumAmount) === 0) {
    return { valid: false, error: 'premiumAmount must be greater than 0' }
  }

  if (body.direction && !['LT', 'GT'].includes(body.direction)) {
    return { valid: false, error: 'direction must be "LT" or "GT"' }
  }

  return { valid: true }
}

/**
 * L-04 fix: Extract real client IP from trusted proxy headers
 * In production, configure this based on your reverse proxy setup
 */
function getClientIp(request: Request): string {
  // Prefer Cloudflare/Vercel headers (set by the edge, not spoofable)
  const cfIp = request.headers.get('cf-connecting-ip')
  if (cfIp) return cfIp

  const vercelIp = request.headers.get('x-real-ip')
  if (vercelIp) return vercelIp

  // Fallback: take the LAST entry in x-forwarded-for (closest proxy)
  const xff = request.headers.get('x-forwarded-for')
  if (xff) {
    const parts = xff.split(',').map(s => s.trim())
    return parts[parts.length - 1] || 'unknown'
  }

  return 'unknown'
}

export async function POST(request: Request) {
  const ip = getClientIp(request)

  const allowed = await rateLimiter.isAllowed(ip)
  if (!allowed) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
  }

  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  // M-05 fix: validate all inputs
  const validation = validateQuoteRequest(body)
  if (!validation.valid) {
    return NextResponse.json({ error: validation.error }, { status: 400 })
  }

  const quote = {
    policy_id: BigInt(body.policyId || Date.now()),
    pool_id: BigInt(body.poolId || 1),
    region_id: BigInt(body.regionId || 0),
    peril: 0, // Rainfall
    window_start_unix: BigInt(Math.floor(Number(body.windowStartUnix))),
    window_end_unix: BigInt(Math.floor(Number(body.windowEndUnix))),
    index_method: 0, // Sum
    direction: body.direction === 'GT' ? 1 : 0,
    threshold: BigInt(Math.floor(Number(body.thresholdMm) * 100)),
    payout_amount: BigInt(Math.floor(Number(body.payoutAmount))),
    premium_amount: BigInt(Math.floor(Number(body.premiumAmount))),
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
