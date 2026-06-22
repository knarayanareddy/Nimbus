import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const body = await request.json()

  // MVP pricing formula from design doc
  const payout = body.payoutAmount
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