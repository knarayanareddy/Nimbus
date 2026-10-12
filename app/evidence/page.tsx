'use client'

import { FormEvent, useRef, useState } from 'react'
import Link from 'next/link'
import Nav from '../../components/Nav'
import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import { anchorReceipt } from '../../lib/receipt-anchor'
import { REGIONS } from '../../lib/regions'
import { ArrowRight, Download, FileUp, FlaskConical, ShieldCheck } from 'lucide-react'

type Reading = { date: string; rainMmX100: number }
type Receipt = {
  schema: string; mode: string
  terms: { region: { id: string; regionId: number; name: string; country: string; lat: number; lon: number }; startDate: string; endDate: string; indexMethod: 'Sum' | 'Mean' | 'Max'; direction: 'LT' | 'GT'; thresholdMmX100: number; payoutMicroUsdc: string }
  evidence: { source: string; model: string; sourceUrl: string; fetchedAt: string; latitude: number; longitude: number; gridLatitude: number; gridLongitude: number; timezone: string; unit: string; daily: Reading[]; provenance: 'live-archive' | 'captured-archive' }
  result: { observedMmX100: number; triggered: boolean; payoutMicroUsdc: string; dayCount: number }
}
type Envelope = { receipt: Receipt; digest: string }
type FormValues = { regionId: string; startDate: string; endDate: string; indexMethod: 'Sum' | 'Mean' | 'Max'; direction: 'LT' | 'GT'; thresholdMm: number; payoutUsdc: number }
const initial: FormValues = { regionId: 'KEN-NRB-001', startDate: '2026-09-01', endDate: '2026-09-15', indexMethod: 'Sum', direction: 'LT', thresholdMm: 80, payoutUsdc: 500 }
const mm = (v: number) => (v / 100).toFixed(2)
const usdc = (v: string) => (Number(v) / 1_000_000).toLocaleString(undefined, { maximumFractionDigits: 2 })

export default function EvidencePage() {
  const [form, setForm] = useState(initial)
  const [result, setResult] = useState<Envelope | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const fileInput = useRef<HTMLInputElement>(null)
  const { connection } = useConnection()
  const wallet = useWallet()
  const update = (key: keyof FormValues, value: string) => setForm((old) => ({ ...old, [key]: key === 'thresholdMm' || key === 'payoutUsdc' ? Number(value) : value } as FormValues))

  async function replay(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(''); setNotice(''); setResult(null)
    if (form.endDate <= form.startDate) { setError('End date must be after the start date; the end date is exclusive.'); setBusy(false); return }
    try {
      const response = await fetch('/api/evidence', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || `Replay failed (${response.status})`)
      if (!data.receipt || !/^[a-f0-9]{64}$/.test(data.digest)) throw new Error('The API returned an invalid receipt envelope.')
      setResult(data)
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to retrieve historical evidence.') }
    finally { setBusy(false) }
  }

  async function loadSample() {
    setBusy(true); setError(''); setNotice(''); setResult(null)
    try {
      const response = await fetch('/api/evidence/sample')
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || `Sample unavailable (${response.status})`)
      if (!data.receipt || data.receipt.evidence?.provenance !== 'captured-archive' || !/^[a-f0-9]{64}$/.test(data.digest)) throw new Error('The sample endpoint did not return a valid captured-archive receipt.')
      setForm({ regionId: data.receipt.terms.region.id, startDate: data.receipt.terms.startDate, endDate: data.receipt.terms.endDate, indexMethod: data.receipt.terms.indexMethod, direction: data.receipt.terms.direction, thresholdMm: data.receipt.terms.thresholdMmX100 / 100, payoutUsdc: Number(data.receipt.terms.payoutMicroUsdc) / 1_000_000 })
      setResult(data)
      setNotice('Offline recorded evidence · captured archive sample. This is not a live replay.')
    } catch (err) { setError(err instanceof Error ? err.message : 'Captured sample unavailable.') }
    finally { setBusy(false) }
  }

  function download() {
    if (!result) return
    const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = `nimbus-receipt-${result.digest.slice(0, 12)}.json`; link.click(); URL.revokeObjectURL(url)
  }

  async function importReceipt(file?: File) {
    if (!file || busy) return
    setBusy(true)
    setError(''); setNotice('Verifying imported receipt…')
    try {
      if (file.size > 64_000) throw new Error('Receipt file exceeds 64000 bytes')
      const envelope = JSON.parse(await file.text())
      const response = await fetch('/api/evidence/verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(envelope) })
      const data = await response.json()
      if (!response.ok || data.valid !== true) throw new Error(data.error || 'Receipt verification failed.')
      setResult(envelope); setNotice(`Receipt verified · SHA-256 ${data.digest}`)
    } catch (err) { setResult(null); setError(err instanceof Error ? err.message : 'Could not verify this receipt.') }
    finally { setBusy(false); if (fileInput.current) fileInput.current.value = '' }
  }

  async function anchor() {
    if (!result || !wallet.publicKey) return
    setBusy(true); setError(''); setNotice('')
    try {
      const anchored = await anchorReceipt(connection, { publicKey: wallet.publicKey, sendTransaction: wallet.sendTransaction }, result.digest)
      setNotice(`Anchored in Solana devnet slot ${anchored.slot}. Signature: ${anchored.signature} · ${anchored.explorerUrl}`)
    } catch (err) { setError(err instanceof Error ? err.message : 'Devnet anchoring failed.') }
    finally { setBusy(false) }
  }

  const terms = result?.receipt.terms
  const evidence = result?.receipt.evidence
  const comparison = terms?.direction === 'LT' ? '≤' : '≥'
  const triggered = result?.receipt.result.triggered
  const buyHref = terms ? `/buy?region=${encodeURIComponent(terms.region.id)}&direction=${terms.direction}&indexMethod=${terms.indexMethod}&days=${result.receipt.result.dayCount}&threshold=${terms.thresholdMmX100 / 100}&payout=${Number(terms.payoutMicroUsdc) / 1_000_000}` : '/buy'

  return <main className="min-h-screen bg-surface-0 noise"><Nav /><div className="section py-10 lg:py-16"><div className="max-w-5xl mx-auto">
    <div className="mb-8"><div className="badge-muted mb-4"><FlaskConical className="w-3.5 h-3.5" /> Historical evidence · test tokens only</div><h1 className="heading-md text-white mb-3">Rainfall Evidence Lab</h1><p className="body-md max-w-3xl">Replay completed historical rainfall data, inspect the calculation, and export a verifiable receipt. No wallet is needed to run or verify evidence.</p><p className="text-sm text-status-triggered mt-3">Historical reanalysis is not a forecast or a live observation. It can differ from conditions at a specific farm (basis risk); results are hypothetical and do not create coverage or a payout.</p></div>
    <form className="card space-y-6" onSubmit={replay}>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        <div><label className="label block mb-2" htmlFor="regionId">Region</label><select className="input" id="regionId" value={form.regionId} onChange={e => update('regionId', e.target.value)}>{REGIONS.map(r => <option key={r.id} value={r.id}>{r.name} · {r.id}</option>)}</select></div>
        <div><label className="label block mb-2" htmlFor="startDate">Start date (UTC)</label><input className="input" id="startDate" type="date" required value={form.startDate} onChange={e => update('startDate', e.target.value)} /></div>
        <div><label className="label block mb-2" htmlFor="endDate">End date (UTC, exclusive)</label><input className="input" id="endDate" type="date" required value={form.endDate} onChange={e => update('endDate', e.target.value)} /></div>
        <div><label className="label block mb-2" htmlFor="indexMethod">Index method</label><select className="input" id="indexMethod" value={form.indexMethod} onChange={e => update('indexMethod', e.target.value)}><option>Sum</option><option>Mean</option><option>Max</option></select></div>
        <div><label className="label block mb-2" htmlFor="direction">Trigger direction</label><select className="input" id="direction" value={form.direction} onChange={e => update('direction', e.target.value)}><option value="LT">At or below (≤)</option><option value="GT">At or above (≥)</option></select></div>
        <div><label className="label block mb-2" htmlFor="thresholdMm">Threshold (mm)</label><input className="input" id="thresholdMm" type="number" min="0.01" max="10000" step="0.01" required value={form.thresholdMm} onChange={e => update('thresholdMm', e.target.value)} /></div>
        <div><label className="label block mb-2" htmlFor="payoutUsdc">Hypothetical payout (test USDC)</label><input className="input" id="payoutUsdc" type="number" min="0.01" max="1000000" step="0.01" required value={form.payoutUsdc} onChange={e => update('payoutUsdc', e.target.value)} /></div>
      </div>
      <p className="text-xs text-white/40">End date is exclusive and interpreted at 00:00 UTC. Every displayed payout is hypothetical test-USDC arithmetic only.</p>
      <div className="flex flex-wrap gap-3"><button className="btn-primary" type="submit" disabled={busy}>{busy ? 'Loading evidence…' : 'Replay historical rainfall'}</button><button className="btn-secondary" type="button" disabled={busy} onClick={loadSample}>Load captured sample</button><button className="btn-secondary inline-flex items-center gap-2" type="button" disabled={busy} onClick={() => fileInput.current?.click()}><FileUp className="w-4 h-4" />Verify imported receipt</button><input ref={fileInput} className="sr-only" type="file" accept="application/json,.json" aria-label="Choose receipt JSON to verify" onChange={e => importReceipt(e.target.files?.[0])} /></div>
    </form>
    {(error || notice) && <div className={`mt-5 p-4 rounded-xl border text-sm break-words ${error ? 'border-status-danger/30 bg-status-danger/10 text-status-danger' : 'border-status-active/30 bg-status-active/10 text-status-active'}`} role={error ? 'alert' : 'status'}>{error || notice}</div>}
    {result && terms && evidence && <section className="mt-8 space-y-5" aria-label="Rainfall replay result">
      <div className="card"><div className="flex flex-wrap justify-between gap-4 items-start"><div><span className="badge-muted">{evidence.provenance === 'captured-archive' ? 'Offline recorded evidence · captured archive' : 'Live historical archive reanalysis'}</span><h2 className="heading-sm text-white mt-3">{terms.region.name} · {terms.startDate} to {terms.endDate} (exclusive)</h2><p className="text-sm text-white/50 mt-2">{terms.indexMethod} index {comparison} {mm(terms.thresholdMmX100)} mm</p></div><div className="text-right"><div className={`badge ${triggered ? 'badge-triggered' : 'badge-active'}`}>{triggered ? 'Threshold met' : 'Threshold not met'}</div><div className="data-value mt-2">{mm(result.receipt.result.observedMmX100)} <span className="text-sm text-white/40">mm</span></div><div className="text-xs text-white/40">Hypothetical payout: {triggered ? usdc(result.receipt.result.payoutMicroUsdc) : '0'} test USDC</div></div></div>
        <div className="mt-5 overflow-x-auto"><table className="w-full text-left text-sm"><caption className="sr-only">Daily historical rainfall included in this receipt</caption><thead><tr className="text-white/40 border-b border-white/10"><th className="py-3 pr-4">Date (UTC)</th><th className="py-3 pr-4">Rainfall (mm)</th></tr></thead><tbody>{evidence.daily.map(day => <tr key={day.date} className="border-b border-white/[0.05]"><td className="py-3 pr-4 font-mono">{day.date}</td><td className="py-3 pr-4">{mm(day.rainMmX100)}</td></tr>)}</tbody></table></div>
      </div>
      <div className="card"><h3 className="heading-sm text-white mb-4">Evidence provenance</h3><dl className="grid sm:grid-cols-2 gap-4 text-sm"><div><dt className="label">Source / model</dt><dd className="text-white/70 mt-1">{evidence.source} · {evidence.model}</dd></div><div><dt className="label">Fetched at</dt><dd className="text-white/70 mt-1">{evidence.fetchedAt}</dd></div><div><dt className="label">Queried coordinates</dt><dd className="text-white/70 mt-1 font-mono">{evidence.latitude}, {evidence.longitude}</dd></div><div><dt className="label">Grid coordinates · timezone · units</dt><dd className="text-white/70 mt-1 font-mono">{evidence.gridLatitude}, {evidence.gridLongitude} · {evidence.timezone} · {evidence.unit}</dd></div><div className="sm:col-span-2"><dt className="label">Source URL</dt><dd className="mt-1 break-all"><a className="text-nimbus-300 underline" href={evidence.sourceUrl} target="_blank" rel="noreferrer">{evidence.sourceUrl}</a></dd></div><div className="sm:col-span-2"><dt className="label">SHA-256 receipt digest</dt><dd className="text-white/80 mt-1 font-mono break-all">{result.digest}</dd></div></dl>
        <div className="mt-5 flex flex-wrap gap-3"><button type="button" className="btn-secondary inline-flex items-center gap-2" onClick={download}><Download className="w-4 h-4" />Download receipt</button><button type="button" className="btn-secondary" onClick={anchor} disabled={!wallet.publicKey || busy}><ShieldCheck className="inline w-4 h-4 mr-2" />Anchor receipt on Solana devnet</button><Link href={buyHref} className="btn-secondary inline-flex items-center gap-2">Continue to buy settings <ArrowRight className="w-4 h-4" /></Link></div><p className="text-xs text-white/40 mt-3">Anchoring requires a connected wallet. A devnet memo records the digest only; it does not prove weather truth, purchase a policy, or authorize a payout. Buy settings are prefilled separately; historical dates are not transferred into a purchase.</p>
      </div>
    </section>}
  </div></div></main>
}
