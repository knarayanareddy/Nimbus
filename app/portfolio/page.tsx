'use client'

import { useWallet } from '@solana/wallet-adapter-react'
import { useWalletModal } from '@solana/wallet-adapter-react-ui'
import Nav from '../../components/Nav'
import {
  Wallet, Shield, CloudSun, CloudRain, Clock, CheckCircle2,
  AlertTriangle, XCircle, ArrowRight, BarChart2, TrendingUp,
  Calendar, Zap, ExternalLink
} from 'lucide-react'

type PolicyStatus = 'active' | 'triggered' | 'settled' | 'cancelled'

interface Policy {
  id: string
  region: string
  regionName: string
  peril: 'Drought' | 'Flood'
  indexMethod: string
  threshold: number
  direction: 'LT' | 'GT'
  daysTotal: number
  daysRemaining: number
  currentIndex: number
  maxPayout: number
  premiumPaid: number
  status: PolicyStatus
  startDate: string
  endDate: string
  oracleSource: string
}

const DEMO_POLICIES: Policy[] = [
  {
    id: 'PLcy...8xKm',
    region: 'KEN-NRB-001',
    regionName: 'Nairobi, Kenya',
    peril: 'Drought',
    indexMethod: 'Sum',
    threshold: 80,
    direction: 'LT',
    daysTotal: 14,
    daysRemaining: 6,
    currentIndex: 42.3,
    maxPayout: 500,
    premiumPaid: 23.63,
    status: 'active',
    startDate: '2026-06-15T00:00:00Z',
    endDate: '2026-06-29T00:00:00Z',
    oracleSource: 'Switchboard · Open-Meteo',
  },
  {
    id: 'PLcy...3fRw',
    region: 'IND-MUM-001',
    regionName: 'Mumbai, India',
    peril: 'Flood',
    indexMethod: 'Max',
    threshold: 150,
    direction: 'GT',
    daysTotal: 30,
    daysRemaining: 0,
    currentIndex: 187.5,
    maxPayout: 2000,
    premiumPaid: 112.40,
    status: 'triggered',
    startDate: '2026-05-20T00:00:00Z',
    endDate: '2026-06-19T00:00:00Z',
    oracleSource: 'Switchboard · NOAA',
  },
  {
    id: 'PLcy...9mTz',
    region: 'PHL-MNL-001',
    regionName: 'Manila, Philippines',
    peril: 'Flood',
    indexMethod: 'Mean',
    threshold: 25,
    direction: 'GT',
    daysTotal: 14,
    daysRemaining: 0,
    currentIndex: 18.2,
    maxPayout: 1000,
    premiumPaid: 45.00,
    status: 'settled',
    startDate: '2026-05-01T00:00:00Z',
    endDate: '2026-05-15T00:00:00Z',
    oracleSource: 'Switchboard · Open-Meteo',
  },
]

function formatDualTime(isoDate: string) {
  const d = new Date(isoDate)
  const utc = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
  const local = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  const localTz = Intl.DateTimeFormat().resolvedOptions().timeZone.split('/').pop()?.replace('_', ' ') || 'Local'
  return { utc: `${utc} UTC`, local: `${local} ${localTz}` }
}

const STATUS_CONFIG = {
  active: { icon: Clock, color: 'text-status-active', bg: 'bg-status-active/10', border: 'border-status-active/20', label: 'Active' },
  triggered: { icon: Zap, color: 'text-status-triggered', bg: 'bg-status-triggered/10', border: 'border-status-triggered/20', label: 'Triggered' },
  settled: { icon: CheckCircle2, color: 'text-status-settled', bg: 'bg-status-settled/10', border: 'border-status-settled/20', label: 'Settled' },
  cancelled: { icon: XCircle, color: 'text-status-cancelled', bg: 'bg-status-cancelled/10', border: 'border-status-cancelled/20', label: 'Cancelled' },
}

function PolicyCard({ policy }: { policy: Policy }) {
  const status = STATUS_CONFIG[policy.status]
  const StatusIcon = status.icon
  const startTime = formatDualTime(policy.startDate)
  const endTime = formatDualTime(policy.endDate)

  const indexPercent = policy.direction === 'LT'
    ? Math.min(100, (policy.currentIndex / policy.threshold) * 100)
    : Math.min(100, (policy.currentIndex / (policy.threshold * 1.5)) * 100)
  const thresholdPercent = policy.direction === 'LT'
    ? 100
    : (policy.threshold / (policy.threshold * 1.5)) * 100
  const isTriggered = policy.direction === 'LT'
    ? policy.currentIndex < policy.threshold
    : policy.currentIndex > policy.threshold

  return (
    <div className="card p-0 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-5 pb-0">
        <div className="flex items-center gap-3">
          {policy.peril === 'Drought' ? (
            <CloudSun className="w-5 h-5 text-status-triggered" />
          ) : (
            <CloudRain className="w-5 h-5 text-nimbus-400" />
          )}
          <div>
            <div className="text-sm font-medium text-white">{policy.regionName}</div>
            <div className="text-xs text-white/30 font-mono">{policy.id}</div>
          </div>
        </div>
        <div className={`badge ${status.bg} ${status.color} ${status.border}`}>
          <StatusIcon className="w-3 h-3" />
          {status.label}
        </div>
      </div>

      {/* Details grid */}
      <div className="grid grid-cols-3 gap-3 p-5">
        <div>
          <div className="label">Peril</div>
          <div className="text-sm text-white mt-1">{policy.peril}</div>
        </div>
        <div>
          <div className="label">Index</div>
          <div className="text-sm text-white mt-1 font-mono">{policy.indexMethod}</div>
        </div>
        <div>
          <div className="label">Direction</div>
          <div className="text-sm text-white mt-1">{policy.direction === 'LT' ? '< ' : '> '}{policy.threshold}mm</div>
        </div>
      </div>

      {/* Index progress bar */}
      <div className="px-5 pb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-white/40">Current Index vs. Threshold</span>
          <span className="text-xs text-white/40">Oracle: {policy.oracleSource}</span>
        </div>
        <div className="relative h-3 bg-surface-3 rounded-full overflow-hidden">
          <div
            className={`absolute left-0 top-0 h-full rounded-full transition-all duration-500 ${
              isTriggered ? 'bg-status-triggered' : 'bg-nimbus-400'
            }`}
            style={{ width: `${Math.min(100, indexPercent)}%` }}
          />
          {/* Threshold marker */}
          <div
            className="absolute top-0 w-0.5 h-full bg-white/60"
            style={{ left: `${thresholdPercent}%` }}
          />
        </div>
        <div className="flex items-center justify-between mt-1">
          <span className={`text-xs font-mono ${isTriggered ? 'text-status-triggered' : 'text-nimbus-300'}`}>
            {policy.currentIndex}mm
          </span>
          <span className="text-xs text-white/30 font-mono">{policy.threshold}mm</span>
        </div>
      </div>

      {/* Time & Payout */}
      <div className="border-t border-white/[0.04] p-5 grid grid-cols-2 gap-4">
        <div>
          <div className="label">Window</div>
          <div className="text-xs text-white mt-1">{startTime.utc} — {endTime.utc}</div>
          <div className="text-xs text-white/30">{startTime.local} — {endTime.local}</div>
          {policy.daysRemaining > 0 && (
            <div className="text-xs text-nimbus-300 mt-1">{policy.daysRemaining} days remaining</div>
          )}
        </div>
        <div className="text-right">
          <div className="label">Payout / Premium</div>
          <div className="text-sm font-mono text-white mt-1">{policy.maxPayout.toLocaleString()} USDC</div>
          <div className="text-xs text-white/30">Paid: {policy.premiumPaid.toFixed(2)} USDC</div>
        </div>
      </div>

      {/* Actions */}
      {(policy.status === 'triggered' || (policy.status === 'active' && policy.daysRemaining === 0)) && (
        <div className="border-t border-white/[0.04] p-4">
          <button className="btn-primary w-full inline-flex items-center justify-center gap-2 py-3">
            <Zap className="w-4 h-4" />
            Settle Policy
          </button>
        </div>
      )}
    </div>
  )
}

function EmptyState() {
  const { setVisible } = useWalletModal()

  return (
    <div className="card p-12 text-center max-w-lg mx-auto">
      <div className="w-16 h-16 bg-nimbus-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
        <Shield className="w-8 h-8 text-nimbus-400/40" />
      </div>
      <h3 className="heading-sm text-white mb-2">No policies yet</h3>
      <p className="body-md mb-6">
        Connect your Phantom, Backpack, or Solflare wallet to view your parametric coverage policies.
      </p>
      <button onClick={() => setVisible(true)} className="btn-primary inline-flex items-center gap-2 mx-auto">
        <Wallet className="w-4 h-4" />
        Connect Wallet
      </button>
    </div>
  )
}

export default function PortfolioPage() {
  const { connected } = useWallet()

  return (
    <main className="min-h-screen bg-surface-0 noise">
      <Nav />
      <div className="section py-8 lg:py-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="heading-md text-white mb-2">Portfolio</h1>
            <p className="body-md">Track your active parametric coverage policies and settlement status.</p>
          </div>
          {connected && (
            <a href="/buy" className="btn-primary hidden sm:inline-flex items-center gap-2">
              <Shield className="w-4 h-4" />
              New Policy
            </a>
          )}
        </div>

        {!connected ? (
          <EmptyState />
        ) : (
          <>
            {/* Stats bar */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <div className="card py-5 text-center">
                <div className="data-value text-nimbus-300">3</div>
                <div className="data-label">Total Policies</div>
              </div>
              <div className="card py-5 text-center">
                <div className="data-value text-status-active">1</div>
                <div className="data-label">Active</div>
              </div>
              <div className="card py-5 text-center">
                <div className="data-value">3,500 <span className="text-sm text-white/30">USDC</span></div>
                <div className="data-label">Total Coverage</div>
              </div>
              <div className="card py-5 text-center">
                <div className="data-value">181.03 <span className="text-sm text-white/30">USDC</span></div>
                <div className="data-label">Premium Spent</div>
              </div>
            </div>

            {/* Policy list */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {DEMO_POLICIES.map((policy) => (
                <PolicyCard key={policy.id} policy={policy} />
              ))}
            </div>
          </>
        )}
      </div>
    </main>
  )
}
