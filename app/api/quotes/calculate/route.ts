import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  // M-05 fix: validate inputs
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Request body must be a JSON object' }, { status: 400 })
  }

  const payout = Number(body.payoutAmount)
  if (!Number.isFinite(payout) || payout <= 0 || payout > 1_000_000_000_000) {
    return NextResponse.json({ error: 'payoutAmount must be a positive number' }, { status: 400 })
  }

  // MVP pricing formula from design doc
  const purePremium = Math.floor(payout * 0.035)
  const surcharge = Math.floor(payout * 0.01)
  const fee = Math.floor((purePremium + surcharge) * 0.05)
  const total = purePremium + surcharge + fee

  return NextResponse.json({
    premiumAmount: total,
    breakdown: {
      purePremium,
      utilizationSurcharge: surcharge,
      protocolFee: fee,
    },
    quoteValiditySecs: 120,
  })
}
