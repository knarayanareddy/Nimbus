import { dateUnixMs, EvidenceError } from './evidence'

export async function fetchCompletedDailyRainfall(lat: number, lon: number, date: string,
  fetcher: typeof fetch = fetch, now = Date.now()): Promise<number> {
  if (!Number.isFinite(lat) || lat < -90 || lat > 90 || !Number.isFinite(lon) || lon < -180 || lon > 180) throw new EvidenceError('Invalid weather coordinates')
  const day = dateUnixMs(date)
  if (day + 86_400_000 > Math.floor(now / 86_400_000) * 86_400_000) throw new EvidenceError('Observation must be a completed UTC day, not a forecast')
  const url = new URL('https://archive-api.open-meteo.com/v1/archive')
  url.search = new URLSearchParams({ latitude: String(lat), longitude: String(lon), daily: 'precipitation_sum', start_date: date, end_date: date, timezone: 'UTC' }).toString()
  const res = await fetcher(url, { signal: AbortSignal.timeout(12_000), cache: 'no-store' })
  if (!res.ok) throw new EvidenceError(`Historical weather returned HTTP ${res.status}; observation not published`)
  const data = await res.json()
  const value = data?.daily?.precipitation_sum?.[0]
  if (data?.daily_units?.precipitation_sum !== 'mm' || data.utc_offset_seconds !== 0
      || data?.daily?.time?.length !== 1 || data.daily.time[0] !== date
      || data?.daily?.precipitation_sum?.length !== 1
      || typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 10_000) throw new EvidenceError('Missing or invalid completed-day rainfall; refusing zero substitution')
  if (typeof data.latitude !== 'number' || typeof data.longitude !== 'number'
      || !Number.isFinite(data.latitude) || !Number.isFinite(data.longitude)
      || Math.abs(data.latitude - lat) > 0.5 || Math.abs(data.longitude - lon) > 0.5) throw new EvidenceError('Weather grid does not match requested coordinates')
  return Math.round(value * 100)
}
