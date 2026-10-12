import { NextResponse } from 'next/server'
import { EvidenceError, validateReplayRequest, fetchArchive, createReceipt } from '../../../lib/evidence'
import { readLimitedJson } from '../../../lib/request-json'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 20
let inFlight = 0
let bucketStart = 0
let requestCount = 0

export async function POST(request: Request) {
  // Bounded prototype guard, not a distributed production rate limiter.
  const now = Date.now()
  if (now - bucketStart >= 60_000) { bucketStart = now; requestCount = 0 }
  if (requestCount >= 60 || inFlight >= 4) return NextResponse.json({ error: 'Replay capacity reached; retry shortly or explicitly load the captured sample' }, { status: 429, headers: { 'Retry-After': '60' } })
  requestCount++
  let terms
  try { terms = validateReplayRequest(await readLimitedJson(request, 4096)) }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Invalid request' }, { status: 400 }) }
  inFlight++
  try {
    const evidence = await fetchArchive(terms)
    return NextResponse.json(createReceipt(terms, evidence), { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    return NextResponse.json({ error: error instanceof EvidenceError ? error.message : 'Historical weather unavailable; no zero or forecast was substituted' }, { status: 502 })
  } finally { inFlight-- }
}
