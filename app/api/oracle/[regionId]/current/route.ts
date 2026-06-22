import { NextResponse } from 'next/server'

export async function GET(
  request: Request,
  { params }: { params: { regionId: string } }
) {
  // In production: query TimescaleDB for latest reading
  return NextResponse.json({
    regionId: params.regionId,
    rain_mm: 12.4,
    timestamp: new Date().toISOString(),
    sources: ['open-meteo', 'noaa'],
  })
}