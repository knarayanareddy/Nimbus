import { createHash } from 'node:crypto'
import { getRegionById, type Region } from './regions'

export const RECEIPT_SCHEMA = 'nimbus-rainfall-receipt/v1' as const
const DAY_MS = 86_400_000
export type ReplayMethod = 'Sum' | 'Mean' | 'Max'
export type ReplayDirection = 'LT' | 'GT'
export interface ReplayRequest {
  regionId: string
  startDate: string
  endDate: string // Exclusive; UTC day boundaries.
  indexMethod: ReplayMethod
  direction: ReplayDirection
  thresholdMm: number
  payoutUsdc: number
}
export interface ReplayTerms {
  region: Region
  startDate: string
  endDate: string
  indexMethod: ReplayMethod
  direction: ReplayDirection
  thresholdMmX100: number
  payoutMicroUsdc: string
}
export interface RainfallEvidence {
  source: 'Open-Meteo Historical Weather API'
  model: 'era5'
  sourceUrl: string
  fetchedAt: string
  latitude: number
  longitude: number
  gridLatitude: number
  gridLongitude: number
  timezone: 'GMT'
  unit: 'mm'
  daily: { date: string; rainMmX100: number }[]
  provenance: 'live-archive' | 'captured-archive'
  rawResponse: unknown
  responseSha256: string
}
export interface ReplayReceipt {
  schema: typeof RECEIPT_SCHEMA
  mode: 'historical-replay'
  terms: ReplayTerms
  evidence: RainfallEvidence
  result: {
    observedMmX100: number
    triggered: boolean
    payoutMicroUsdc: string
    dayCount: number
  }
}
export interface ReceiptEnvelope { receipt: ReplayReceipt; digest: string }
export class EvidenceError extends Error {}

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new EvidenceError('Expected a JSON object')
  return value as Record<string, unknown>
}
export function dateUnixMs(value: unknown): number {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new EvidenceError('Dates must be YYYY-MM-DD')
  const ms = Date.parse(`${value}T00:00:00Z`)
  if (!Number.isFinite(ms) || new Date(ms).toISOString().slice(0, 10) !== value) throw new EvidenceError('Invalid calendar date')
  return ms
}
function fixedAmount(value: unknown, scale: number, max: number, name: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > max) throw new EvidenceError(`Invalid ${name}`)
  const scaled = Math.round(value * scale)
  if (!Number.isSafeInteger(scaled) || Math.abs(value * scale - scaled) > 0.000001) throw new EvidenceError(`${name} exceeds supported precision`)
  return scaled
}
export function validateReplayRequest(input: unknown, now = Date.now()): ReplayTerms {
  const r = record(input)
  const allowed = ['regionId', 'startDate', 'endDate', 'indexMethod', 'direction', 'thresholdMm', 'payoutUsdc']
  if (Object.keys(r).some(k => !allowed.includes(k))) throw new EvidenceError('Unexpected request field')
  const region = typeof r.regionId === 'string' ? getRegionById(r.regionId) : undefined
  if (!region) throw new EvidenceError('Unknown region')
  const start = dateUnixMs(r.startDate)
  const end = dateUnixMs(r.endDate)
  const days = (end - start) / DAY_MS
  if (days < 1 || days > 31 || !Number.isInteger(days)) throw new EvidenceError('Window must contain 1 to 31 complete UTC days; end date is exclusive')
  if (start < Date.UTC(1940, 0, 1)) throw new EvidenceError('Historical data starts in 1940')
  // ERA5 has publication lag. Never use an in-progress day/forecast as settlement evidence.
  if (end > Math.floor(now / DAY_MS) * DAY_MS - 5 * DAY_MS) throw new EvidenceError('Use a historical window ending at least five days before today')
  if (!['Sum', 'Mean', 'Max'].includes(r.indexMethod as string)) throw new EvidenceError('Invalid index method')
  if (!['LT', 'GT'].includes(r.direction as string)) throw new EvidenceError('Invalid direction')
  const thresholdMmX100 = fixedAmount(r.thresholdMm, 100, 1_000_000, 'thresholdMm')
  const payout = fixedAmount(r.payoutUsdc, 1_000_000, 1_000_000, 'payoutUsdc')
  if (payout === 0) throw new EvidenceError('Payout must be positive')
  return { region: { ...region }, startDate: r.startDate as string, endDate: r.endDate as string,
    indexMethod: r.indexMethod as ReplayMethod, direction: r.direction as ReplayDirection,
    thresholdMmX100, payoutMicroUsdc: String(payout) }
}
export function archiveUrl(terms: ReplayTerms): string {
  const lastDate = new Date(dateUnixMs(terms.endDate) - DAY_MS).toISOString().slice(0, 10)
  const params = new URLSearchParams({ latitude: String(terms.region.lat), longitude: String(terms.region.lon),
    start_date: terms.startDate, end_date: lastDate, daily: 'precipitation_sum', timezone: 'UTC', models: 'era5' })
  return `https://archive-api.open-meteo.com/v1/archive?${params}`
}

// Stable recursive JSON key order; decimals/units are already normalized in terms/readings.
export function canonicalJson(value: unknown): string {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return JSON.stringify(value)
  if (typeof value === 'number' && Number.isFinite(value)) return JSON.stringify(value)
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`
  if (value && typeof value === 'object') {
    const r = value as Record<string, unknown>
    return `{${Object.keys(r).sort().map(k => `${JSON.stringify(k)}:${canonicalJson(r[k])}`).join(',')}}`
  }
  throw new EvidenceError('Receipt contains a non-JSON value')
}
export function digestJson(value: unknown): string { return createHash('sha256').update(canonicalJson(value)).digest('hex') }

export function parseArchive(raw: unknown, terms: ReplayTerms, fetchedAt: string,
  provenance: RainfallEvidence['provenance'] = 'live-archive'): RainfallEvidence {
  const data = record(raw)
  const daily = record(data.daily)
  const units = record(data.daily_units)
  if (units.precipitation_sum !== 'mm' || data.utc_offset_seconds !== 0 || !['GMT', 'UTC'].includes(data.timezone as string)) {
    throw new EvidenceError('Weather units/timezone must be millimetres and UTC')
  }
  if (!Number.isFinite(Date.parse(fetchedAt)) || new Date(fetchedAt).toISOString() !== fetchedAt) throw new EvidenceError('Invalid retrieval timestamp')
  if (!['live-archive', 'captured-archive'].includes(provenance)) throw new EvidenceError('Invalid provenance')
  const times = daily.time
  const values = daily.precipitation_sum
  const expectedDays = (dateUnixMs(terms.endDate) - dateUnixMs(terms.startDate)) / DAY_MS
  if (!Array.isArray(times) || !Array.isArray(values) || times.length !== expectedDays || values.length !== expectedDays) {
    throw new EvidenceError('Weather response has missing or extra days')
  }
  const readings = times.map((date, i) => {
    const expected = new Date(dateUnixMs(terms.startDate) + i * DAY_MS).toISOString().slice(0, 10)
    if (date !== expected) throw new EvidenceError('Weather days must be complete, unique and ordered')
    return { date: expected, rainMmX100: fixedAmount(values[i], 100, 10_000, 'rainfall') }
  })
  if (typeof data.latitude !== 'number' || typeof data.longitude !== 'number'
      || !Number.isFinite(data.latitude) || !Number.isFinite(data.longitude)
      || Math.abs(data.latitude - terms.region.lat) > 0.5 || Math.abs(data.longitude - terms.region.lon) > 0.5) {
    throw new EvidenceError('Weather grid is outside the requested region')
  }
  return { source: 'Open-Meteo Historical Weather API', model: 'era5', sourceUrl: archiveUrl(terms), fetchedAt,
    latitude: terms.region.lat, longitude: terms.region.lon, gridLatitude: data.latitude, gridLongitude: data.longitude,
    timezone: 'GMT', unit: 'mm', daily: readings, provenance, rawResponse: raw, responseSha256: digestJson(raw) }
}
export function replayRainfall(terms: ReplayTerms, evidence: RainfallEvidence): ReplayReceipt['result'] {
  const count = evidence.daily.length
  const expected = (dateUnixMs(terms.endDate) - dateUnixMs(terms.startDate)) / DAY_MS
  if (count !== expected || count < 1 || count > 31) throw new EvidenceError('Incorrect observation count')
  let sum = 0
  let max = 0
  for (let i = 0; i < count; i++) {
    const day = evidence.daily[i]
    const expectedDate = new Date(dateUnixMs(terms.startDate) + i * DAY_MS).toISOString().slice(0, 10)
    if (day.date !== expectedDate || !Number.isSafeInteger(day.rainMmX100) || day.rainMmX100 < 0 || day.rainMmX100 > 1_000_000) {
      throw new EvidenceError('Invalid observation')
    }
    sum += day.rainMmX100
    max = Math.max(max, day.rainMmX100)
  }
  const observed = terms.indexMethod === 'Sum' ? sum : terms.indexMethod === 'Mean' ? Math.trunc(sum / count) : max
  // Existing Anchor enum names are LessThan/GreaterThan but contract semantics are inclusive.
  const triggered = terms.direction === 'LT' ? observed <= terms.thresholdMmX100 : observed >= terms.thresholdMmX100
  return { observedMmX100: observed, triggered, payoutMicroUsdc: triggered ? terms.payoutMicroUsdc : '0', dayCount: count }
}
export function createReceipt(terms: ReplayTerms, evidence: RainfallEvidence): ReceiptEnvelope {
  const receipt: ReplayReceipt = { schema: RECEIPT_SCHEMA, mode: 'historical-replay', terms, evidence, result: replayRainfall(terms, evidence) }
  return { receipt, digest: digestJson(receipt) }
}
export function verifyReceipt(input: unknown): ReceiptEnvelope {
  const envelope = record(input)
  const r = record(envelope.receipt)
  if (r.schema !== RECEIPT_SCHEMA || r.mode !== 'historical-replay') throw new EvidenceError('Unsupported receipt schema or mode')
  const t = record(r.terms)
  const region = record(t.region)
  if (typeof t.payoutMicroUsdc !== 'string' || !/^[1-9]\d{0,12}$/.test(t.payoutMicroUsdc)) throw new EvidenceError('Invalid payout base units')
  const terms = validateReplayRequest({ regionId: region.id, startDate: t.startDate, endDate: t.endDate,
    indexMethod: t.indexMethod, direction: t.direction, thresholdMm: Number(t.thresholdMmX100) / 100,
    payoutUsdc: Number(t.payoutMicroUsdc) / 1_000_000 })
  if (canonicalJson(terms) !== canonicalJson(t)) throw new EvidenceError('Receipt terms do not match region registry or normalized terms')
  const e = record(r.evidence)
  const evidence = parseArchive(e.rawResponse, terms, e.fetchedAt as string, e.provenance as RainfallEvidence['provenance'])
  if (canonicalJson(evidence) !== canonicalJson(e)) throw new EvidenceError('Receipt evidence differs from raw source response')
  const expected = createReceipt(terms, evidence)
  if (canonicalJson(expected.receipt) !== canonicalJson(r)) throw new EvidenceError('Receipt result does not match independent replay')
  if (typeof envelope.digest !== 'string' || !/^[a-f0-9]{64}$/.test(envelope.digest) || expected.digest !== envelope.digest) {
    throw new EvidenceError('Receipt SHA-256 mismatch: content has changed')
  }
  if (Object.keys(envelope).sort().join(',') !== 'digest,receipt') throw new EvidenceError('Unexpected receipt envelope field')
  return expected
}
export async function fetchArchive(terms: ReplayTerms, fetcher: typeof fetch = fetch): Promise<RainfallEvidence> {
  const response = await fetcher(archiveUrl(terms), { signal: AbortSignal.timeout(12_000), cache: 'no-store' })
  if (!response.ok) throw new EvidenceError(`Historical weather provider returned HTTP ${response.status}`)
  return parseArchive(await response.json(), terms, new Date().toISOString())
}
