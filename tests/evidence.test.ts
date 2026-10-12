import assert from 'node:assert/strict'
import sample from '../data/colosseum/nairobi-archive.json'
import { archiveUrl, canonicalJson, createReceipt, dateUnixMs, digestJson, fetchArchive, parseArchive, replayRainfall, validateReplayRequest, verifyReceipt } from '../lib/evidence'
import { readLimitedJson } from '../lib/request-json'

const terms = () => validateReplayRequest(sample.request)
const raw = () => JSON.parse(JSON.stringify(sample.rawResponse))
const evidence = () => parseArchive(raw(), terms(), sample.fetchedAt, 'captured-archive')

describe('Historical rainfall receipt contract', () => {
  it('replays the real captured archive with exact fixed-point output', () => {
    const out = createReceipt(terms(), evidence())
    assert.deepEqual(out.receipt.result, { observedMmX100: 460, triggered: true, payoutMicroUsdc: '500000000', dayCount: 14 })
    assert.equal(verifyReceipt(out).digest, out.digest)
  })
  it('uses exclusive end date and the ERA5 archive, never a forecast', () => {
    const url = new URL(archiveUrl(terms()))
    assert.equal(url.hostname, 'archive-api.open-meteo.com')
    assert.equal(url.searchParams.get('end_date'), '2026-09-14')
    assert.equal(url.searchParams.get('models'), 'era5')
    assert.equal(url.searchParams.get('timezone'), 'UTC')
  })
  for (const indexMethod of ['Sum', 'Mean', 'Max'] as const) {
    it(`${indexMethod} matches inclusive LT and GT boundaries`, () => {
      const t = { ...terms(), indexMethod }
      const e = evidence()
      const observed = replayRainfall(t, e).observedMmX100
      assert.equal(observed, indexMethod === 'Sum' ? 460 : indexMethod === 'Mean' ? 32 : 210)
      for (const direction of ['LT', 'GT'] as const) {
        for (const delta of [-1, 0, 1]) {
          const got = replayRainfall({ ...t, direction, thresholdMmX100: observed + delta }, e)
          assert.equal(got.triggered, direction === 'LT' ? delta >= 0 : delta <= 0)
        }
      }
    })
  }
  it('roundtrips canonical receipts despite object key insertion order', () => {
    assert.equal(canonicalJson({ z: 1, a: [2, { c: true, b: false }] }), canonicalJson({ a: [2, { b: false, c: true }], z: 1 }))
  })
  it('binds payout, direction, units, source/model and readings to the digest', () => {
    const base = createReceipt(terms(), evidence())
    for (const mutate of [
      (r: any) => { r.terms.thresholdMmX100++ }, (r: any) => { r.evidence.daily[0].rainMmX100++ },
      (r: any) => { r.evidence.model = 'forecast' }, (r: any) => { r.evidence.unit = 'inch' },
      (r: any) => { r.result.payoutMicroUsdc = '0' }, (r: any) => { r.terms.region.lat = 0 },
      (r: any) => { r.evidence.sourceUrl = 'https://attacker.example' },
    ]) {
      const changed = JSON.parse(JSON.stringify(base)); mutate(changed.receipt)
      assert.notEqual(digestJson(changed.receipt), base.digest)
      assert.throws(() => verifyReceipt(changed))
    }
  })
  it('rejects a tampered result even when attacker recomputes the hash', () => {
    const changed = createReceipt(terms(), evidence()); changed.receipt.result.triggered = false
    changed.digest = digestJson(changed.receipt)
    assert.throws(() => verifyReceipt(changed), /independent replay/)
  })
  it('rejects unknown schema, invalid hash and extra envelope fields', () => {
    const base = createReceipt(terms(), evidence())
    assert.throws(() => verifyReceipt({ ...base, digest: 'A'.repeat(64) }), /SHA-256/)
    assert.throws(() => verifyReceipt({ ...base, receipt: { ...base.receipt, schema: 'v2' } }), /schema/)
    assert.throws(() => verifyReceipt({ ...base, signature: 'fake' }), /Unexpected/)
  })
  for (const [name, value] of [['null', null], ['negative', -1], ['NaN', NaN], ['string', '0'], ['infinite', Infinity]] as const) {
    it(`fails closed on ${name} rainfall instead of zero substitution`, () => {
      const r = raw(); r.daily.precipitation_sum[0] = value
      assert.throws(() => parseArchive(r, terms(), sample.fetchedAt))
    })
  }
  it('rejects missing, duplicate, unordered and out-of-window days', () => {
    for (const change of [(r: any) => r.daily.time.pop(), (r: any) => { r.daily.time[1] = r.daily.time[0] },
      (r: any) => r.daily.time.reverse(), (r: any) => { r.daily.time[0] = '2026-08-31' }]) {
      const r = raw(); change(r); assert.throws(() => parseArchive(r, terms(), sample.fetchedAt))
    }
  })
  it('rejects incorrect units, timezone and distant grid', () => {
    for (const change of [(r: any) => { r.daily_units.precipitation_sum = 'inch' },
      (r: any) => { r.utc_offset_seconds = 3600 }, (r: any) => { r.latitude = 0 }]) {
      const r = raw(); change(r); assert.throws(() => parseArchive(r, terms(), sample.fetchedAt))
    }
  })
  it('rejects invalid dates, region, enums, amount/precision, future/in-progress windows', () => {
    for (const fields of [{ regionId: 'unknown' }, { startDate: '2026-02-30' }, { endDate: '2026-09-01' },
      { endDate: '2026-11-01' }, { endDate: '2026-10-13' }, { startDate: '2026-08-01' },
      { indexMethod: 'Wrong' }, { direction: '==' }, { payoutUsdc: 0 }, { payoutUsdc: '500' },
      { thresholdMm: -1 }, { thresholdMm: 0.001 }, { payoutUsdc: 0.0000001 }, { unknown: true }]) {
      assert.throws(() => validateReplayRequest({ ...sample.request, ...fields }))
    }
  })
  it('supports a real leap day while rejecting non-leap dates', () => {
    assert.equal(dateUnixMs('2024-02-29'), Date.UTC(2024, 1, 29))
    assert.throws(() => dateUnixMs('2025-02-29'))
  })
  it('does not substitute a captured sample when the provider fails', async () => {
    await assert.rejects(fetchArchive(terms(), (async () => new Response('unavailable', { status: 503 })) as typeof fetch), /HTTP 503/)
  })
  it('rejects malformed and oversized streamed JSON', async () => {
    await assert.rejects(readLimitedJson(new Request('https://example.test', { method: 'POST', body: '{' }), 100), /Invalid JSON/)
    await assert.rejects(readLimitedJson(new Request('https://example.test', { method: 'POST', body: '{"x":"abcdefgh"}' }), 4), /exceeds/)
    assert.deepEqual(await readLimitedJson(new Request('https://example.test', { method: 'POST', body: '{"x":1}' }), 100), { x: 1 })
  })
})
