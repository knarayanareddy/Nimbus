import { NextResponse } from 'next/server'
import { getRegionById, getRegionByU64 } from '../../../../../lib/regions'
import { fetchCompletedDailyRainfall } from '../../../../../lib/weather-observation'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ regionId: string }> }
) {
  const { regionId } = await params
  const id = regionId
  const region = getRegionById(id) ?? getRegionByU64(Number(id))
  if (!region) {
    return NextResponse.json({ error: `Unknown region: ${id}` }, { status: 404 })
  }

  try {
    const today = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10)
    const rainfall = await fetchCompletedDailyRainfall(region.lat, region.lon, today)
    const mm = rainfall / 100

    return NextResponse.json({
      regionId: region.id,
      region_id_u64: region.regionId,
      name: region.name,
      date: today,
      rain_mm: mm,
      rain_mm_x100: Math.round(mm * 100),
      source: 'open-meteo-historical-archive',
      observationStatus: 'completed-utc-day-reanalysis',
    })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 502 })
  }
}
