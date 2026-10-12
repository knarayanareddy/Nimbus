import assert from 'node:assert/strict'
import { fetchCompletedDailyRainfall } from '../lib/weather-observation'

// Synthetic transport fixture; these values are test vectors, not weather evidence.
const fixture = () => ({ latitude: -1.25, longitude: 36.75, utc_offset_seconds: 0,
  daily_units: { precipitation_sum: 'mm' }, daily: { time: ['2026-09-01'], precipitation_sum: [1.23] } })
const mockFetch = (body: unknown) => (async (input: any) => {
  assert.equal(new URL(String(input)).hostname, 'archive-api.open-meteo.com')
  return new Response(JSON.stringify(body))
}) as typeof fetch

describe('Completed-day oracle ingestion', () => {
  it('converts a real numeric completed-day reading into integer hundredths', async () => {
    assert.equal(await fetchCompletedDailyRainfall(-1.2921, 36.8219, '2026-09-01', mockFetch(fixture())), 123)
  })
  it('rejects absent, null, negative and nonnumeric rainfall', async () => {
    for (const value of [null, undefined, -1, '0']) {
      const body = fixture() as any; body.daily.precipitation_sum = [value]
      await assert.rejects(fetchCompletedDailyRainfall(-1.2921, 36.8219, '2026-09-01', mockFetch(body)), /refusing zero/)
    }
  })
  it('rejects incomplete days before making a network request', async () => {
    let calls = 0
    const fetcher = (async () => { calls++; return new Response('{}') }) as typeof fetch
    await assert.rejects(fetchCompletedDailyRainfall(0, 0, '2026-10-12', fetcher, Date.UTC(2026, 9, 12, 12)), /completed/)
    assert.equal(calls, 0)
  })
  it('rejects mismatched dates, units, grids and failed provider responses', async () => {
    for (const mutate of [(b: any) => { b.daily.time[0] = '2026-09-02' }, (b: any) => { b.daily_units.precipitation_sum = 'inch' },
      (b: any) => { b.latitude = 20 }, (b: any) => { b.utc_offset_seconds = 1 }]) {
      const body = fixture(); mutate(body)
      await assert.rejects(fetchCompletedDailyRainfall(-1.2921, 36.8219, '2026-09-01', mockFetch(body)))
    }
    await assert.rejects(fetchCompletedDailyRainfall(0, 0, '2026-09-01', (async () => new Response('', { status: 502 })) as typeof fetch), /HTTP 502/)
  })
})
