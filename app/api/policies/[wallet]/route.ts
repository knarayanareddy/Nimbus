import { NextResponse } from 'next/server'

export async function GET(
  request: Request,
  { params }: { params: { wallet: string } }
) {
  // In production: query policies_index table
  return NextResponse.json([
    {
      policy_id: 1001,
      owner: params.wallet,
      status: 'Active',
      region_id: 'KEN-NRB-001',
      payout_amount: 500000000,
    },
  ])
}