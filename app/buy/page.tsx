'use client'

import { useState } from 'react'
import { useWallet, useConnection } from '@solana/wallet-adapter-react'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import { createBuyPolicyTransaction, getConfigPda, PROGRAM_ID } from '../../lib/climafi'
import { PublicKey } from '@solana/web3.js'

export default function BuyPolicy() {
  const { publicKey, sendTransaction } = useWallet()
  const [region, setRegion] = useState('KEN-NRB-001')
  const [direction, setDirection] = useState<'LT' | 'GT'>('LT')
  const [windowDays, setWindowDays] = useState(14)
  const [threshold, setThreshold] = useState(80)
  const [payout, setPayout] = useState(500)
  const [quote, setQuote] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const calculateQuote = async () => {
    setLoading(true)
    // Call the real backend in production
    const res = await fetch('/api/quotes/calculate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        poolId: 1,
        regionId: region,
        windowStartUnix: Math.floor(Date.now() / 1000),
        windowEndUnix: Math.floor(Date.now() / 1000) + windowDays * 86400,
        thresholdMm: threshold,
        direction,
        payoutAmount: payout * 1_000_000,
      })
    })
    const data = await res.json()
    setQuote(data)
    setLoading(false)
  }

  const { connection } = useConnection()

  const buyPolicy = async () => {
    if (!publicKey || !quote) return

    try {
      // 1. Get real signed quote from backend
      const signRes = await fetch('/api/quotes/sign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          poolId: 1,
          regionId: 1234567890123456789,
          windowStartUnix: Math.floor(Date.now() / 1000),
          windowEndUnix: Math.floor(Date.now() / 1000) + windowDays * 86400,
          thresholdMm: threshold,
          direction,
          payoutAmount: payout * 1_000_000,
          premiumAmount: quote.premiumAmount,
        }),
      })
      const { quote: signedQuote, signature: sigBase64 } = await signRes.json()
      const signature = new Uint8Array(Buffer.from(sigBase64, 'base64'))

      // 2. Fetch treasury ATA from on-chain config
      const configPda = getConfigPda()
      const configAccount = await connection.getAccountInfo(configPda)
      // treasury_usdc_ata is at offset: 8(disc) + 32(admin) + 1(paused) + 32(usdc_mint) + 2(fee_bps) = 75
      const treasuryUsdcAta = new PublicKey(configAccount!.data.slice(75, 75 + 32))

      // 3. Build and send real transaction
      const tx = await createBuyPolicyTransaction(
        connection,
        { publicKey },
        signedQuote,
        signature,
        0,
        treasuryUsdcAta,
      )

      const txSignature = await sendTransaction(tx, connection)
      console.log('Transaction sent:', txSignature)
      alert(`Policy purchased! TX: ${txSignature}`)
    } catch (err) {
      console.error(err)
      alert('Transaction failed')
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-4xl font-semibold mb-8">Buy Rainfall Cover</h1>

        <div className="card space-y-6">
          <div>
            <label className="text-sm text-white/60">Region</label>
            <select value={region} onChange={e => setRegion(e.target.value)} className="input mt-1">
              <option value="KEN-NRB-001">Nairobi, Kenya (KEN-NRB-001)</option>
              <option value="IND-MH-002">Maharashtra, India</option>
              <option value="BRA-SP-003">São Paulo, Brazil</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-white/60">Trigger</label>
              <div className="flex mt-1 rounded-xl overflow-hidden border border-white/10">
                <button onClick={() => setDirection('LT')} className={`flex-1 py-2.5 text-sm ${direction === 'LT' ? 'bg-blue-600' : 'bg-white/5'}`}>Drought (≤)</button>
                <button onClick={() => setDirection('GT')} className={`flex-1 py-2.5 text-sm ${direction === 'GT' ? 'bg-blue-600' : 'bg-white/5'}`}>Flood (≥)</button>
              </div>
            </div>
            <div>
              <label className="text-sm text-white/60">Window</label>
              <select value={windowDays} onChange={e => setWindowDays(+e.target.value)} className="input mt-1">
                <option value={7}>7 days</option>
                <option value={14}>14 days</option>
                <option value={30}>30 days</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-sm text-white/60">Threshold (mm)</label>
            <input type="range" min="10" max="300" step="5" value={threshold} onChange={e => setThreshold(+e.target.value)} className="w-full accent-blue-600" />
            <div className="flex justify-between text-xs text-white/50"><div>10mm</div><div className="font-mono text-lg text-white">{threshold} mm</div><div>300mm</div></div>
          </div>

          <div>
            <label className="text-sm text-white/60">Payout Amount (USDC)</label>
            <input type="number" value={payout} onChange={e => setPayout(+e.target.value)} className="input mt-1 font-mono" />
          </div>

          <button onClick={calculateQuote} disabled={loading} className="btn-primary w-full">
            {loading ? 'Calculating...' : 'Get Quote'}
          </button>

          {quote && (
            <div className="bg-zinc-900 border border-white/10 p-6 rounded-2xl text-sm">
              <div className="flex justify-between mb-3">
                <div>Premium</div>
                <div className="font-mono text-xl">${(quote.premiumAmount / 1e6).toFixed(2)}</div>
              </div>
              <div className="text-white/50 text-xs mb-4">Includes protocol fee • utilization surcharge</div>
              <button onClick={buyPolicy} className="btn-primary w-full">Buy Policy • Pay Premium</button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}