'use client'

import { useState, useEffect, Suspense } from 'react'
import { useWallet, useConnection } from '@solana/wallet-adapter-react'
import { useWalletModal } from '@solana/wallet-adapter-react-ui'
import { useSearchParams, useRouter } from 'next/navigation'
import Nav from '../../components/Nav'
import ErrorBoundary from '../../components/ErrorBoundary'
import TransactionStatus, { TxState } from '../../components/TransactionStatus'
import { createBuyPolicyTransaction, getConfigPda, deserializeGlobalConfig, PROGRAM_ID } from '../../lib/climafi'
import { PublicKey } from '@solana/web3.js'

const REGIONS = [
  { id: 'KEN-NRB-001', numericId: 1, label: 'Nairobi, Kenya', country: 'KE' },
  { id: 'IND-MH-002', numericId: 2, label: 'Maharashtra, India', country: 'IN' },
  { id: 'BRA-SP-003', numericId: 3, label: 'Sao Paulo, Brazil', country: 'BR' },
]

type Step = 'configure' | 'quote' | 'confirm'

function BuyPolicyInner() {
  const { publicKey, sendTransaction, connected } = useWallet()
  const { connection } = useConnection()
  const { setVisible: setWalletModalVisible } = useWalletModal()
  const searchParams = useSearchParams()
  const router = useRouter()

  const [step, setStep] = useState<Step>('configure')
  const [region, setRegion] = useState(REGIONS[0])
  const [direction, setDirection] = useState<'LT' | 'GT'>('LT')
  const [windowDays, setWindowDays] = useState(14)
  const [threshold, setThreshold] = useState(80)
  const [payout, setPayout] = useState(500)
  const [quote, setQuote] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [txState, setTxState] = useState<TxState>('idle')
  const [txMessage, setTxMessage] = useState('')
  const [txSig, setTxSig] = useState('')
  const [quoteError, setQuoteError] = useState('')

  // Restore state from URL params on mount
  useEffect(() => {
    const r = searchParams.get('region')
    const d = searchParams.get('direction')
    const w = searchParams.get('days')
    const t = searchParams.get('threshold')
    const p = searchParams.get('payout')
    if (r) { const found = REGIONS.find(reg => reg.id === r); if (found) setRegion(found) }
    if (d === 'LT' || d === 'GT') setDirection(d)
    if (w) setWindowDays(Number(w))
    if (t) setThreshold(Number(t))
    if (p) setPayout(Number(p))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Persist state to URL params on change
  useEffect(() => {
    const params = new URLSearchParams()
    params.set('region', region.id)
    params.set('direction', direction)
    params.set('days', String(windowDays))
    params.set('threshold', String(threshold))
    params.set('payout', String(payout))
    router.replace(`/buy?${params.toString()}`, { scroll: false })
  }, [region, direction, windowDays, threshold, payout]) // eslint-disable-line react-hooks/exhaustive-deps

  const windowStartUnix = Math.floor(Date.now() / 1000) + 86400 // starts tomorrow
  const windowEndUnix = windowStartUnix + windowDays * 86400

  const calculateQuote = async () => {
    if (payout <= 0) {
      setQuoteError('Payout must be greater than 0')
      return
    }
    setLoading(true)
    setQuoteError('')
    try {
      const res = await fetch('/api/quotes/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          poolId: 1,
          regionId: region.id,
          windowStartUnix,
          windowEndUnix,
          thresholdMm: threshold,
          direction,
          payoutAmount: payout * 1_000_000,
        })
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Quote service unavailable' }))
        setQuoteError(err.error || `Server error (${res.status})`)
        return
      }
      const data = await res.json()
      setQuote(data)
      setStep('quote')
    } catch (err: any) {
      setQuoteError(err.message || 'Failed to fetch quote')
    } finally {
      setLoading(false)
    }
  }

  const buyPolicy = async () => {
    if (!publicKey || !quote) return

    setTxState('signing')
    setTxMessage('Please approve in your wallet')
    try {
      const signRes = await fetch('/api/quotes/sign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          poolId: 1,
          regionId: region.numericId,
          windowStartUnix,
          windowEndUnix,
          thresholdMm: threshold,
          direction,
          payoutAmount: payout * 1_000_000,
          premiumAmount: quote.premiumAmount,
        }),
      })
      if (!signRes.ok) throw new Error('Failed to get signed quote')
      const { quote: signedQuote, signature: sigBase64 } = await signRes.json()
      const signature = new Uint8Array(Buffer.from(sigBase64, 'base64'))

      const configPda = getConfigPda()
      const configAccount = await connection.getAccountInfo(configPda)
      if (!configAccount) throw new Error('Config account not found on-chain')
      const globalConfig = deserializeGlobalConfig(configAccount.data as Buffer, configAccount.owner)
      const treasuryUsdcAta = globalConfig.treasuryUsdcAta

      const tx = await createBuyPolicyTransaction(
        connection,
        { publicKey },
        signedQuote,
        signature,
        0,
        treasuryUsdcAta,
      )

      setTxState('confirming')
      setTxMessage('Confirming on Solana...')
      const txSignature = await sendTransaction(tx, connection)
      await connection.confirmTransaction(txSignature, 'confirmed')
      setTxSig(txSignature)
      setTxState('success')
      setTxMessage('Policy purchased successfully!')
    } catch (err: any) {
      setTxState('error')
      setTxMessage(err.message || 'Transaction failed')
    }
  }

  const resetFlow = () => {
    setStep('configure')
    setQuote(null)
    setTxState('idle')
    setTxSig('')
    setTxMessage('')
  }

  const steps = [
    { key: 'configure', label: 'Configure' },
    { key: 'quote', label: 'Review Quote' },
    { key: 'confirm', label: 'Purchase' },
  ]

  return (
    <div className="min-h-screen">
      <Nav />
      <ErrorBoundary>
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
          <h1 className="text-3xl sm:text-4xl font-semibold mb-2">Buy Rainfall Cover</h1>
          <p className="text-white/50 mb-8">Protect against drought or flood events with parametric coverage.</p>

          {/* Step indicator */}
          <div className="flex items-center gap-2 mb-8" role="progressbar" aria-valuenow={steps.findIndex(s => s.key === step) + 1} aria-valuemin={1} aria-valuemax={3}>
            {steps.map((s, i) => {
              const current = steps.findIndex(st => st.key === step)
              const state = i < current ? 'complete' : i === current ? 'active' : 'pending'
              return (
                <div key={s.key} className="flex items-center gap-2 flex-1">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold step-${state}`}>
                    {state === 'complete' ? (
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                    ) : i + 1}
                  </div>
                  <span className={`text-xs hidden sm:inline ${state === 'active' ? 'text-white' : 'text-white/40'}`}>{s.label}</span>
                  {i < steps.length - 1 && <div className={`flex-1 h-px ${state === 'complete' ? 'bg-emerald-500' : 'bg-white/10'}`} />}
                </div>
              )
            })}
          </div>

          {/* Step 1: Configure */}
          {step === 'configure' && (
            <div className="card space-y-6 animate-in">
              <div>
                <label htmlFor="region-select" className="label">Region</label>
                <select
                  id="region-select"
                  value={region.id}
                  onChange={e => setRegion(REGIONS.find(r => r.id === e.target.value) || REGIONS[0])}
                  className="input"
                >
                  {REGIONS.map(r => (
                    <option key={r.id} value={r.id}>{r.label} ({r.id})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">Peril Type</label>
                  <div className="flex rounded-xl overflow-hidden border border-white/10">
                    <button
                      onClick={() => setDirection('LT')}
                      className={`flex-1 py-2.5 text-sm font-medium transition-colors ${direction === 'LT' ? 'bg-blue-600 text-white' : 'bg-zinc-900 text-white/60 hover:text-white'}`}
                      aria-pressed={direction === 'LT'}
                    >
                      Drought (&le;)
                    </button>
                    <button
                      onClick={() => setDirection('GT')}
                      className={`flex-1 py-2.5 text-sm font-medium transition-colors ${direction === 'GT' ? 'bg-blue-600 text-white' : 'bg-zinc-900 text-white/60 hover:text-white'}`}
                      aria-pressed={direction === 'GT'}
                    >
                      Flood (&ge;)
                    </button>
                  </div>
                </div>
                <div>
                  <label htmlFor="window-select" className="label">Coverage Window</label>
                  <select id="window-select" value={windowDays} onChange={e => setWindowDays(+e.target.value)} className="input">
                    <option value={7}>7 days</option>
                    <option value={14}>14 days</option>
                    <option value={30}>30 days</option>
                    <option value={60}>60 days</option>
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="threshold-range" className="label">
                  Rainfall Threshold: <span className="text-white font-mono">{threshold} mm</span>
                </label>
                <input
                  id="threshold-range"
                  type="range"
                  min="10"
                  max="300"
                  step="5"
                  value={threshold}
                  onChange={e => setThreshold(+e.target.value)}
                  className="w-full accent-blue-500 mt-1"
                  aria-valuemin={10}
                  aria-valuemax={300}
                  aria-valuenow={threshold}
                />
                <div className="flex justify-between text-xs text-white/30 mt-1">
                  <span>10mm (severe drought)</span>
                  <span>300mm (heavy flooding)</span>
                </div>
              </div>

              <div>
                <label htmlFor="payout-input" className="label">Payout Amount (USDC)</label>
                <input
                  id="payout-input"
                  type="number"
                  value={payout}
                  onChange={e => setPayout(Math.max(0, +e.target.value))}
                  className="input font-mono"
                  min="1"
                  max="100000"
                  step="100"
                />
                {payout > 10000 && (
                  <p className="text-xs text-amber-400 mt-1">Large payout — premium will be proportionally higher</p>
                )}
              </div>

              {quoteError && (
                <div className="text-sm text-red-400 bg-red-500/10 p-3 rounded-lg" role="alert">{quoteError}</div>
              )}

              <button onClick={calculateQuote} disabled={loading || payout <= 0} className="btn-primary w-full">
                {loading ? 'Calculating...' : 'Get Quote'}
              </button>
            </div>
          )}

          {/* Step 2: Review Quote */}
          {step === 'quote' && quote && (
            <div className="card space-y-6 animate-in">
              <h2 className="text-xl font-semibold">Coverage Summary</h2>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="bg-white/5 rounded-xl p-4">
                  <div className="text-white/50 text-xs">Region</div>
                  <div className="font-medium mt-1">{region.label}</div>
                </div>
                <div className="bg-white/5 rounded-xl p-4">
                  <div className="text-white/50 text-xs">Trigger</div>
                  <div className="font-medium mt-1">{direction === 'LT' ? 'Drought' : 'Flood'} &mdash; {threshold}mm</div>
                </div>
                <div className="bg-white/5 rounded-xl p-4">
                  <div className="text-white/50 text-xs">Window</div>
                  <div className="font-medium mt-1">{windowDays} days</div>
                </div>
                <div className="bg-white/5 rounded-xl p-4">
                  <div className="text-white/50 text-xs">Max Payout</div>
                  <div className="font-mono font-medium mt-1">${payout.toLocaleString()}</div>
                </div>
              </div>

              <div className="border-t border-white/5 pt-4">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="text-white/50 text-sm">Premium</div>
                    <div className="text-xs text-white/30 mt-0.5">Includes protocol fee + utilization surcharge</div>
                  </div>
                  <div className="font-mono text-2xl font-semibold">${(quote.premiumAmount / 1e6).toFixed(2)}</div>
                </div>
              </div>

              <div className="flex gap-3">
                <button onClick={() => setStep('configure')} className="btn-secondary flex-1">
                  Modify
                </button>
                {connected ? (
                  <button
                    onClick={() => setStep('confirm')}
                    className="btn-primary flex-1"
                  >
                    Proceed to Purchase
                  </button>
                ) : (
                  <button
                    onClick={() => setWalletModalVisible(true)}
                    className="btn-primary flex-1"
                  >
                    Connect Wallet to Continue
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Step 3: Confirm */}
          {step === 'confirm' && quote && (
            <div className="card space-y-6 animate-in">
              <h2 className="text-xl font-semibold">Confirm Purchase</h2>

              <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4 text-sm text-amber-200">
                <strong>Parametric coverage:</strong> Payout is determined solely by the rainfall index value.
                It does not require proof of loss. If the observed rainfall does not trigger the threshold,
                no payout is made regardless of actual damages.
              </div>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-white/50">You pay</span>
                  <span className="font-mono">${(quote.premiumAmount / 1e6).toFixed(2)} USDC</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/50">You receive if triggered</span>
                  <span className="font-mono">${payout.toLocaleString()} USDC</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/50">Network fee (est.)</span>
                  <span className="font-mono text-white/50">~0.01 SOL</span>
                </div>
              </div>

              <TransactionStatus state={txState} message={txMessage} txSignature={txSig} onDismiss={resetFlow} />

              {txState === 'idle' && (
                <div className="flex gap-3">
                  <button onClick={() => setStep('quote')} className="btn-secondary flex-1">Back</button>
                  <button onClick={buyPolicy} className="btn-primary flex-1">
                    Confirm &amp; Sign
                  </button>
                </div>
              )}

              {txState === 'success' && (
                <button onClick={resetFlow} className="btn-primary w-full">Buy Another Policy</button>
              )}
            </div>
          )}
        </div>
      </ErrorBoundary>
    </div>
  )
}

export default function BuyPolicy() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="animate-pulse text-white/40">Loading...</div></div>}>
      <BuyPolicyInner />
    </Suspense>
  )
}
