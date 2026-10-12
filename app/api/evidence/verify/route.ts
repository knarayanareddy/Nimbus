import { NextResponse } from 'next/server'
import { verifyReceipt } from '../../../../lib/evidence'
import { readLimitedJson } from '../../../../lib/request-json'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export async function POST(request: Request) {
  try {
    const verified = verifyReceipt(await readLimitedJson(request, 64_000))
    return NextResponse.json({ valid: true, digest: verified.digest,
      scope: 'Integrity and deterministic replay only; not independent weather authenticity or policy payout proof' })
  } catch (error) {
    return NextResponse.json({ valid: false, error: error instanceof Error ? error.message : 'Invalid receipt' }, { status: 400 })
  }
}
