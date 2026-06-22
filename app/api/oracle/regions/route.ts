import { NextResponse } from 'next/server'

const REGIONS = [
  { region_id: 'KEN-NRB-001', region_id_u64: 1234567890123456789, name: 'Nairobi, Kenya', risk_tier: 3 },
  { region_id: 'IND-MH-002', region_id_u64: 9876543210987654321, name: 'Maharashtra, India', risk_tier: 4 },
]

export async function GET() {
  return NextResponse.json(REGIONS)
}