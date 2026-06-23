'use client'

import { useState } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { useWalletModal } from '@solana/wallet-adapter-react-ui'
import Nav from '../../components/Nav'
import {
  Scale, Search, CheckCircle2, XCircle, AlertTriangle,
  Zap, Database, ExternalLink, CloudRain, CloudSun,
  ArrowRight, Wallet, Clock, Shield
} from 'lucide-react'

interface SettlementResult {
  policyId: string
  region: string
  regionName: string
  peril: string
  indexMethod: string
  threshold: number
  direction: string
  observedValue: number
  triggered: boolean
  oracleSource: string
  snapshotTimestamp: string
  payoutAmount: number
  status: 'eligible' | 'settled' | 'not-triggered'
}

const DEMO_ELIGIBLE: SettlementResult[] = [
  {
    policyId: 'PLcy...3fRw',
    region: 'IND-MUM-001',
    regionName: 'Mumbai, India',
    peril: 'Flood',
    indexMethod: 'Max',
    threshold: 150,
    direction: 'GT',
    observedValue: 187.5,
    triggered: true,
    oracleSource: 'Switchboard · NOAA',
    snapshotTimestamp: '2026-06-19T23:59:00Z',
    payoutAmount: 2000,
    status: 'eligible',
  },
  {
    policyId: 'PLcy...7kNp',
    region: 'KEN-NRB-001',
    regionName: 'Nairobi, Kenya',
    peril: 'Drought',
    indexMethod: 'Sum',
    threshold: 80,
    direction: 'LT',
    observedValue: 92.1,
    triggered: false,
    oracleSource: 'Switchboard · Open-Meteo',
    snapshotTimestamp: '2026-06-22T00:00:00Z',
    payoutAmount: 0,
    status: 'not-triggered',
  },
]

function OracleProof({ result }: { result: SettlementResult }) {
  const dirLabel = result.direction === 'LT' ? 'Below' : 'Above'
  const dirSymbol = result.direction === 'LT' ? '<' : '>'

  return (
    <div className="card p-0 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-5">
        <div className="flex items-center gap-3">
          {result.peril === 'Drought' ? (
            <CloudSun className="w-5 h-5 text-status-triggered" />
          ) : (
            <CloudRain className="w-5 h-5 text-nimbus-400" />
          )}
          <div>
            <div className="text-sm font-medium text-white">{result.regionName}</div>
            <div className="text-xs text-white/30 font-mono">{result.policyId}</div>
          </div>
        </div>
        {result.triggered ? (
          <div className="badge bg-status-triggered/10 text-status-triggered border border-status-triggered/20">
            <Zap className="w-3 h-3" />
            Triggered — Payout Due
          </div>
        ) : (
          <div className="badge bg-surface-3 text-white/40 border border-white/[0.06]">
            <XCircle className="w-3 h-3" />
            Not Triggered
          </div>
        )}
      </div>

      {/* Oracle proof data */}
      <div className="border-t border-white/[0.04] p-5">
        <div className="label mb-4">Oracle Settlement Proof</div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div>
            <div className="text-[10px] text-white/30 uppercase tracking-wider">Index Method</div>
            <div className="text-sm font-mono text-white mt-1">{result.indexMethod}</div>
          </div>
          <div>
            <div className="text-[10px] text-white/30 uppercase tracking-wider">Trigger Condition</div>
            <div className="text-sm font-mono text-white mt-1">{dirSymbol} {result.threshold}mm</div>
          </div>
          <div>
            <div className="text-[10px] text-white/30 uppercase tracking-wider">Observed Value</div>
            <div className={`text-sm font-mono mt-1 font-semibold ${result.triggered ? 'text-status-triggered' : 'text-status-active'}`}>
              {result.observedValue}mm
            </div>
          </div>
          <div>
            <div className="text-[10px] text-white/30 uppercase tracking-wider">Oracle Source</div>
            <div className="text-sm text-white/60 mt-1">{result.oracleSource}</div>
          </div>
        </div>

        {/* Threshold visualization */}
        <div className="relative p-4 bg-surface-2 rounded-xl">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-white/30">Threshold Comparison</span>
            <span className="text-[10px] text-white/20 font-mono">
              Snapshot: {new Date(result.snapshotTimestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })} UTC
            </span>
          </div>

          <div className="relative h-10 bg-surface-3 rounded-lg overflow-hidden">
            {/* Threshold marker */}
            <div
              className="absolute top-0 w-0.5 h-full bg-white/40 z-10"
              style={{ left: `${Math.min(90, (result.threshold / Math.max(result.threshold, result.observedValue) / 1.2) * 100)}%` }}
            >
              <div className="absolute -top-5 -translate-x-1/2 text-[9px] font-mono text-white/40 whitespace-nowrap">
                {result.threshold}mm
              </div>
            </div>

            {/* Observed value bar */}
            <div
              className={`absolute left-0 top-0 h-full rounded-lg transition-all duration-700 ${
                result.triggered ? 'bg-status-triggered/60' : 'bg-status-active/40'
              }`}
              style={{ width: `${Math.min(95, (result.observedValue / Math.max(result.threshold, result.observedValue) / 1.2) * 100)}%` }}
            />
          </div>

          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-white/20">0mm</span>
            <span className={`text-xs font-mono font-medium ${result.triggered ? 'text-status-triggered' : 'text-status-active'}`}>
              Observed: {result.observedValue}mm {result.triggered ? `${dirSymbol} ${result.threshold}mm` : ''}
            </span>
          </div>
        </div>
      </div>

      {/* Payout + action */}
      {result.triggered && (
        <div className="border-t border-white/[0.04] p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="label">Payout Amount</div>
              <div className="font-mono text-2xl font-bold text-white mt-1">
                {result.payoutAmount.toLocaleString()} <span className="text-sm text-white/30">USDC</span>
              </div>
            </div>
          </div>

          {/* Irreversibility notice */}
          <div className="p-3 bg-surface-2 rounded-xl flex items-start gap-2 mb-4">
            <AlertTriangle className="w-4 h-4 text-status-triggered mt-0.5 flex-shrink-0" />
            <p className="text-xs text-white/40">
              Settlement is an irreversible on-chain transaction. The oracle proof above confirms the trigger condition.
              This is a deterministic outcome — not a claim decision.
            </p>
          </div>

          <button className="btn-primary w-full inline-flex items-center justify-center gap-2 py-3.5">
            <Zap className="w-4 h-4" />
            Settle — Claim {result.payoutAmount.toLocaleString()} USDC
          </button>
        </div>
      )}

      {!result.triggered && (
        <div className="border-t border-white/[0.04] p-5">
          <div className="p-3 bg-surface-2 rounded-xl flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-status-active mt-0.5 flex-shrink-0" />
            <p className="text-xs text-white/40">
              The observed index ({result.observedValue}mm) did not cross the trigger threshold ({result.direction === 'LT' ? '<' : '>'} {result.threshold}mm).
              No payout is due. This policy has been settled with no claim.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

export default function SettlePage() {
  const { connected } = useWallet()
  const { setVisible } = useWalletModal()
  const [searchQuery, setSearchQuery] = useState('')
  const [showResults, setShowResults] = useState(true)

  return (
    <main className="min-h-screen bg-surface-0 noise">
      <Nav />
      <div className="section py-8 lg:py-12">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="text-center mb-10">
            <div className="w-14 h-14 bg-surface-2 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Scale className="w-7 h-7 text-white/40" />
            </div>
            <h1 className="heading-md text-white mb-2">Settle Policies</h1>
            <p className="body-md max-w-lg mx-auto">
              Oracle-verified settlement. Every data point is traceable.
              No claims process. No human decision.
            </p>
          </div>

          {/* Search */}
          <div className="card p-5 mb-8">
            <div className="flex items-center gap-3">
              <Search className="w-5 h-5 text-white/20" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Enter policy ID or wallet address..."
                className="flex-1 bg-transparent text-white placeholder:text-white/20 text-sm focus:outline-none"
              />
              <button
                onClick={() => setShowResults(true)}
                className="btn-primary py-2 px-4 text-sm"
              >
                Lookup
              </button>
            </div>
          </div>

          {/* Results */}
          {showResults && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-2">
                <span className="label">{DEMO_ELIGIBLE.length} policies found</span>
                <span className="text-xs text-white/20">Showing all eligible for settlement</span>
              </div>
              {DEMO_ELIGIBLE.map((result) => (
                <OracleProof key={result.policyId} result={result} />
              ))}
            </div>
          )}

          {!connected && (
            <div className="card p-10 text-center mt-8">
              <Shield className="w-10 h-10 text-white/20 mx-auto mb-4" />
              <p className="body-md mb-4">Connect your wallet to see your eligible policies.</p>
              <button onClick={() => setVisible(true)} className="btn-primary inline-flex items-center gap-2">
                <Wallet className="w-4 h-4" />
                Connect Wallet
              </button>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
