'use client'

import { useState, useEffect } from 'react'
import { useWallet, useConnection } from '@solana/wallet-adapter-react'
import { useWalletModal } from '@solana/wallet-adapter-react-ui'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Nav from '../components/Nav'
import {
  CloudRain, Sun, Droplets, Clock, CheckCircle2,
  AlertCircle, XCircle, Activity, TrendingUp, Filter,
  ChevronRight, BarChart3, Database, Zap, AlertTriangle, Lock
} from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, ReferenceLine, Tooltip } from 'recharts'

type PolicyStatus = 'active' | 'triggered' | 'settled' | 'cancelled'

interface Policy {
  id: string
  region: string
  country: string
  peril: 'drought' | 'flood'
  indexMethod: 'Sum' | 'Mean' | 'Max'
  threshold: number
  direction: 'below' | 'above'
  payout: number
  premium: number
  status: PolicyStatus
  startDate: string
  endDate: string
  daysRemaining: number
  currentIndex: number
  settlementDate?: string
  oracle: string
  chartData: { day: string; value: number }[]
}

const MOCK_POLICIES: Policy[] = [
  {
    id: 'NMB-2025-001',
    region: 'Nairobi Region',
    country: 'Kenya',
    peril: 'drought',
    indexMethod: 'Sum',
    threshold: 80,
    direction: 'below',
    payout: 10000,
    premium: 350,
    status: 'active',
    startDate: '2025-07-01',
    endDate: '2025-08-31',
    daysRemaining: 18,
    currentIndex: 32.6,
    oracle: 'Switchboard · NOAA · Open-Meteo',
    chartData: [
      { day: 'Jul 1', value: 8.2 }, { day: 'Jul 7', value: 12.1 }, { day: 'Jul 14', value: 5.4 },
      { day: 'Jul 21', value: 4.8 }, { day: 'Jul 28', value: 2.1 }, { day: 'Aug 4', value: 0.0 },
    ],
  },
  {
    id: 'NMB-2025-002',
    region: 'Punjab',
    country: 'India',
    peril: 'flood',
    indexMethod: 'Max',
    threshold: 80,
    direction: 'above',
    payout: 25000,
    premium: 1100,
    status: 'triggered',
    startDate: '2025-06-15',
    endDate: '2025-08-15',
    daysRemaining: 0,
    currentIndex: 94.3,
    oracle: 'Switchboard · Open-Meteo',
    chartData: [
      { day: 'Jun 15', value: 22 }, { day: 'Jun 22', value: 35 }, { day: 'Jun 29', value: 58 },
      { day: 'Jul 6', value: 94 }, { day: 'Jul 13', value: 45 }, { day: 'Jul 20', value: 28 },
    ],
  },
  {
    id: 'NMB-2025-003',
    region: 'Oromia Region',
    country: 'Ethiopia',
    peril: 'drought',
    indexMethod: 'Mean',
    threshold: 3,
    direction: 'below',
    payout: 5000,
    premium: 160,
    status: 'settled',
    startDate: '2025-05-01',
    endDate: '2025-06-30',
    daysRemaining: 0,
    currentIndex: 1.8,
    settlementDate: '2025-07-01',
    oracle: 'Switchboard · NOAA',
    chartData: [
      { day: 'May 1', value: 2.1 }, { day: 'May 8', value: 1.4 }, { day: 'May 15', value: 0.8 },
      { day: 'May 22', value: 1.2 }, { day: 'May 29', value: 2.9 }, { day: 'Jun 5', value: 1.8 },
    ],
  },
]

const STATUS_CONFIG: Record<PolicyStatus, { label: string; className: string; icon: any; dot: string }> = {
  active: {
    label: 'Active',
    className: 'bg-status-active/15 text-status-active border border-status-active/25',
    icon: <Activity size={11} />,
    dot: 'bg-green-400',
  },
  triggered: {
    label: 'Triggered',
    className: 'bg-status-triggered/15 text-status-triggered border border-status-triggered/25',
    icon: <AlertCircle size={11} />,
    dot: 'bg-purple-400',
  },
  settled: {
    label: 'Settled',
    className: 'bg-status-settled/15 text-status-settled border border-status-settled/25',
    icon: <CheckCircle2 size={11} />,
    dot: 'bg-blue-400',
  },
  cancelled: {
    label: 'Cancelled',
    className: 'bg-status-cancelled/15 text-status-cancelled border border-status-cancelled/25',
    icon: <XCircle size={11} />,
    dot: 'bg-gray-500',
  },
}

function PolicyCard({ policy }: { policy: Policy }) {
  const router = useRouter()
  const [expanded, setExpanded] = useState(false)
  const [mounted, setMounted] = useState(false)
  const config = STATUS_CONFIG[policy.status]
  const progressPct = Math.min(100, Math.round((policy.currentIndex / policy.threshold) * 100))
  const isAbove = policy.direction === 'above'
  const isNearTrigger = isAbove ? progressPct >= 80 : progressPct <= 35

  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <div
      className={`card bg-surface-1/40 border border-white/[0.06] rounded-2xl overflow-hidden hover:border-nimbus-500/10 transition-all duration-300 ${
        policy.status === 'triggered' ? 'shadow-lg shadow-status-triggered/5' : ''
      }`}
    >
      {/* Card Header */}
      <div className="p-5">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
              policy.peril === 'drought' ? 'bg-orange-500/15' : 'bg-blue-500/15'
            }`}>
              {policy.peril === 'drought'
                ? <Sun size={16} className="text-orange-400" />
                : <Droplets size={16} className="text-blue-400" />
              }
            </div>
            <div>
              <div className="font-semibold text-white text-sm">{policy.region}</div>
              <div className="text-xs text-white/35">{policy.country} · #{policy.id}</div>
            </div>
          </div>
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${config.className}`}>
            {config.icon}
            {config.label}
          </div>
        </div>

        {/* Key metrics row */}
        <div className="grid grid-cols-4 gap-3 mb-4">
          <div>
            <div className="text-xs text-white/30 mb-0.5">Method</div>
            <div className="text-sm font-medium text-white font-mono">{policy.indexMethod}</div>
          </div>
          <div>
            <div className="text-xs text-white/30 mb-0.5">Threshold</div>
            <div className="text-sm font-medium text-white font-mono">{policy.direction === 'below' ? '<' : '>'}{policy.threshold}mm</div>
          </div>
          <div>
            <div className="text-xs text-white/30 mb-0.5">
              {policy.status === 'active' ? 'Current Index' : 'Final Index'}
            </div>
            <div className={`text-sm font-semibold font-mono ${
              policy.status === 'triggered' ? 'text-status-triggered' :
              policy.status === 'settled' ? 'text-status-settled' :
              'text-white'
            }`}>
              {policy.currentIndex > 0 ? `${policy.currentIndex} mm` : '—'}
            </div>
          </div>
          <div>
            <div className="text-xs text-white/30 mb-0.5">Payout</div>
            <div className="text-sm font-semibold text-green-400 font-mono">{policy.payout.toLocaleString()} USDC</div>
          </div>
        </div>

        {/* Progress bar — index vs threshold */}
        {policy.status === 'active' && policy.currentIndex > 0 && (
          <div className="mb-4">
            <div className="flex justify-between text-xs mb-1.5">
              <span className="text-white/30">Index progress toward threshold</span>
              <span className={isNearTrigger ? 'text-orange-400 font-medium' : 'text-white/40'}>
                {policy.currentIndex}mm / {policy.threshold}mm
              </span>
            </div>
            <div className="utilization-bar">
              <div
                className="utilization-fill"
                style={{
                  width: `${progressPct}%`,
                  background: isNearTrigger
                    ? 'linear-gradient(to right, #f97316, #ef4444)'
                    : 'linear-gradient(to right, #6174f5, #38b6ff)'
                }}
              />
            </div>
            {isNearTrigger && (
              <div className="text-xs text-orange-400 mt-1 flex items-center gap-1">
                <AlertTriangle size={10} /> Near trigger threshold
              </div>
            )}
          </div>
        )}

        {/* Time / status footer */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 text-xs text-white/30">
            {policy.status === 'active' && (
              <div className="flex items-center gap-1.5">
                <Clock size={11} className="text-blue-400" />
                <span>{policy.daysRemaining} days remaining</span>
              </div>
            )}
            {policy.status === 'triggered' && (
              <div className="flex items-center gap-1.5">
                <AlertCircle size={11} className="text-status-triggered" />
                <span>Ready to settle</span>
              </div>
            )}
            {policy.status === 'settled' && (
              <div className="flex items-center gap-1.5">
                <CheckCircle2 size={11} className="text-status-active" />
                <span>Settled {policy.settlementDate}</span>
              </div>
            )}
            <div className="inline-flex bg-nimbus-500/10 border border-nimbus-400/25 px-2 py-0.5 rounded text-[10px] text-nimbus-300 font-medium">{policy.oracle}</div>
          </div>

          <div className="flex items-center gap-2">
            {policy.status === 'triggered' && (
              <button
                onClick={() => router.push('/settle')}
                className="btn-primary flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold"
              >
                <Zap size={12} />
                Settle
              </button>
            )}
            <button
              onClick={() => setExpanded(!expanded)}
              className="btn-secondary px-3 py-2 rounded-lg text-xs"
            >
              {expanded ? 'Hide Chart' : 'Show Chart'}
            </button>
          </div>
        </div>
      </div>

      {/* Expanded Chart */}
      {expanded && policy.chartData.length > 0 && (
        <div className="border-t border-white/[0.04] bg-white/[0.005] p-5 animate-in">
          <div className="h-28">
            {mounted && (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={policy.chartData} margin={{ top: 4, right: 4, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id={`grad-policy-${policy.id}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={policy.peril === 'drought' ? '#f97316' : '#6174f5'} stopOpacity={0.2} />
                      <stop offset="95%" stopColor={policy.peril === 'drought' ? '#f97316' : '#6174f5'} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="day" tick={{ fill: 'rgba(255,255,255,0.2)', fontSize: 9 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: 'rgba(255,255,255,0.2)', fontSize: 9 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: '#1a1d2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6 }}
                    labelStyle={{ color: 'rgba(255,255,255,0.3)', fontSize: 10 }}
                    itemStyle={{ color: '#818cf8', fontSize: 10 }} />
                  <ReferenceLine y={policy.threshold} stroke={policy.peril === 'drought' ? '#f97316' : '#38b6ff'} strokeDasharray="3 3" />
                  <Area type="monotone" dataKey="value" stroke={policy.peril === 'drought' ? '#f97316' : '#6174f5'} strokeWidth={1.5} fill={`url(#grad-policy-${policy.id})`} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default function PortfolioPage() {
  const { connected, publicKey } = useWallet()
  const { setVisible: setWalletVisible } = useWalletModal()

  const [activeTab, setActiveTab] = useState<'policies' | 'vaults'>('policies')
  const [filter, setFilter] = useState<PolicyStatus | 'all'>('all')

  const [livePolicies, setLivePolicies] = useState<Policy[]>([])
  const [loading, setLoading] = useState(false)

  // Fetch real policies from DB
  useEffect(() => {
    if (!connected || !publicKey) {
      setLivePolicies([])
      return
    }

    const fetchPolicies = async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/policies/${publicKey.toBase58()}`)
        const data = await res.json()
        if (Array.isArray(data)) {
          // Map database structure to our detailed Policy UI structure
          const mapped: Policy[] = data.map((p: any) => ({
            id: String(p.policy_id),
            region: p.region_id === 'KEN-NRB-001' ? 'Nairobi Region' : p.region_id,
            country: p.region_id === 'KEN-NRB-001' ? 'Kenya' : 'Solana',
            peril: p.direction === 'LT' ? 'drought' : 'flood',
            indexMethod: 'Sum',
            threshold: 80,
            direction: p.direction === 'LT' ? 'below' : 'above',
            payout: p.payout_amount / 1000000, // convert base to ui
            premium: (p.payout_amount / 1000000) * 0.045,
            status: p.status.toLowerCase() as PolicyStatus,
            startDate: new Date().toISOString().split('T')[0],
            endDate: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
            daysRemaining: 14,
            currentIndex: 35.2, // mock live index
            oracle: 'Switchboard · NOAA',
            chartData: [
              { day: 'D1', value: 8.2 }, { day: 'D7', value: 15.1 }, { day: 'D14', value: 35.2 }
            ],
          }))
          setLivePolicies(mapped)
        }
      } catch (err) {
        console.error('Failed to fetch policies', err)
      } finally {
        setLoading(false)
      }
    }

    fetchPolicies()
  }, [connected, publicKey])

  // Combine Mock policies and real-fetched live policies
  const displayedPolicies = [
    ...livePolicies,
    ...MOCK_POLICIES.filter(p => !livePolicies.some(l => l.id === p.id))
  ].filter(p => filter === 'all' || p.status === filter)

  return (
    <main className="min-h-screen bg-surface-0 noise pb-24">
      <Nav />

      <section className="pt-24 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-display font-bold text-white" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Your Portfolio
            </h1>
            <p className="text-white/40 text-sm mt-1">Manage your active parametric policies and underwriting positions.</p>
          </div>
          {connected ? (
            <Link href="/buy" className="btn-primary inline-flex items-center gap-2 text-sm font-semibold self-start sm:self-auto">
              Get New Coverage <Zap size={14} />
            </Link>
          ) : (
            <button onClick={() => setWalletVisible(true)} className="btn-primary inline-flex items-center gap-2 text-sm font-semibold">
              Connect Wallet
            </button>
          )}
        </div>

        {/* Navigation tabs */}
        <div className="flex border-b border-white/[0.06] mb-8">
          <button
            onClick={() => setActiveTab('policies')}
            className={`px-6 py-3 font-semibold text-sm border-b-2 transition-colors ${
              activeTab === 'policies'
                ? 'border-nimbus-500 text-white'
                : 'border-transparent text-white/40 hover:text-white/60'
            }`}
          >
            Policies ({displayedPolicies.length})
          </button>
          <button
            onClick={() => setActiveTab('vaults')}
            className={`px-6 py-3 font-semibold text-sm border-b-2 transition-colors ${
              activeTab === 'vaults'
                ? 'border-nimbus-500 text-white'
                : 'border-transparent text-white/40 hover:text-white/60'
            }`}
          >
            Underwriting Positions
          </button>
        </div>

        {/* Tab 1: Policies View */}
        {activeTab === 'policies' && (
          <div className="space-y-6">
            {/* Filters */}
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-xs text-white/30 flex items-center gap-1 mr-2">
                <Filter size={12} /> Filter policies:
              </span>
              {(['all', 'active', 'triggered', 'settled'] as const).map((opt) => (
                <button
                  key={opt}
                  onClick={() => setFilter(opt)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                    filter === opt
                      ? 'bg-nimbus-500/25 text-white border border-nimbus-400/30'
                      : 'bg-surface-1 border border-white/5 text-white/40 hover:text-white/70'
                  }`}
                >
                  {opt.charAt(0).toUpperCase() + opt.slice(1)}
                </button>
              ))}
            </div>

            {loading && (
              <div className="text-center py-12 text-sm text-white/40">
                Loading active on-chain policies...
              </div>
            )}

            {displayedPolicies.length === 0 ? (
              <div className="card text-center py-16 bg-surface-1/30">
                <CloudRain className="w-12 h-12 text-white/10 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-white mb-1">No policies found</h3>
                <p className="text-white/40 text-sm mb-6">You don't have any policies matching the filter.</p>
                <Link href="/buy" className="btn-primary inline-flex items-center gap-2 text-sm font-semibold">
                  Configure Coverage <ChevronRight size={14} />
                </Link>
              </div>
            ) : (
              <div className="grid gap-4">
                {displayedPolicies.map((policy) => (
                  <PolicyCard key={policy.id} policy={policy} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Vaults View */}
        {activeTab === 'vaults' && (
          <div className="space-y-6">
            {connected ? (
              <div className="card bg-surface-1/30 text-center py-16">
                <Droplets className="w-12 h-12 text-white/10 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-white mb-1">Underwriting collateral</h3>
                <p className="text-white/45 text-sm mb-6 max-w-sm mx-auto">
                  Provide USDC to support agricultural risk insurance and receive continuous yields from user premiums.
                </p>
                <Link href="/pools" className="btn-primary inline-flex items-center gap-2 text-sm font-semibold">
                  Browse Pools <ChevronRight size={14} />
                </Link>
              </div>
            ) : (
              <div className="card text-center py-16">
                <Lock className="w-12 h-12 text-white/10 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-white mb-1">Wallet Disconnected</h3>
                <p className="text-white/40 text-sm mb-6">Connect your Solana wallet to view active collateral deposits.</p>
                <button onClick={() => setWalletVisible(true)} className="btn-primary inline-flex items-center gap-2 text-sm font-semibold">
                  Connect Wallet
                </button>
              </div>
            )}
          </div>
        )}
      </section>
    </main>
  )
}
