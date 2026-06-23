'use client'

import { useState } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { useWalletModal } from '@solana/wallet-adapter-react-ui'
import Nav from '../../components/Nav'
import {
  Droplets, TrendingUp, AlertTriangle, Shield, ArrowRight,
  Wallet, Info, ChevronDown, ChevronUp, DollarSign,
  BarChart2, Lock, Percent, ExternalLink
} from 'lucide-react'

interface Pool {
  id: string
  name: string
  peril: string
  regions: string[]
  tvl: number
  utilization: number
  ltvLimit: number
  estimatedApy: number
  activePolicies: number
  lockedCapital: number
}

const DEMO_POOLS: Pool[] = [
  {
    id: 'POOL-DRT-001',
    name: 'Global Drought Pool',
    peril: 'Drought',
    regions: ['KEN-NRB-001', 'ETH-ADD-001', 'IND-MUM-001'],
    tvl: 125000,
    utilization: 34.2,
    ltvLimit: 80,
    estimatedApy: 12.4,
    activePolicies: 23,
    lockedCapital: 42750,
  },
  {
    id: 'POOL-FLD-001',
    name: 'Asia Flood Pool',
    peril: 'Flood',
    regions: ['IND-MUM-001', 'BGD-DHK-001', 'PHL-MNL-001'],
    tvl: 87500,
    utilization: 52.8,
    ltvLimit: 75,
    estimatedApy: 18.7,
    activePolicies: 15,
    lockedCapital: 46200,
  },
  {
    id: 'POOL-MIX-001',
    name: 'Latam Mixed Peril',
    peril: 'Mixed',
    regions: ['BRA-SPO-001'],
    tvl: 45000,
    utilization: 18.5,
    ltvLimit: 85,
    estimatedApy: 8.2,
    activePolicies: 7,
    lockedCapital: 8325,
  },
]

function PoolCard({ pool }: { pool: Pool }) {
  const [expanded, setExpanded] = useState(false)
  const { connected } = useWallet()
  const { setVisible } = useWalletModal()
  const [depositAmount, setDepositAmount] = useState('')

  const utilizationColor = pool.utilization > 70 ? 'text-status-danger' :
    pool.utilization > 50 ? 'text-status-triggered' : 'text-status-active'

  return (
    <div className="card p-0 overflow-hidden">
      {/* Header */}
      <div className="p-6 pb-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              pool.peril === 'Drought' ? 'bg-status-triggered/10 text-status-triggered' :
              pool.peril === 'Flood' ? 'bg-nimbus-500/10 text-nimbus-400' :
              'bg-accent-teal/10 text-accent-teal'
            }`}>
              <Droplets className="w-5 h-5" />
            </div>
            <div>
              <div className="text-base font-semibold text-white">{pool.name}</div>
              <div className="text-xs text-white/30 font-mono">{pool.id}</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-white/30">Est. APY</div>
            <div className="text-lg font-mono font-semibold text-status-active">{pool.estimatedApy}%</div>
          </div>
        </div>

        {/* Key metrics */}
        <div className="grid grid-cols-3 gap-4">
          <div>
            <div className="label">TVL</div>
            <div className="text-sm font-mono text-white mt-1">
              {(pool.tvl / 1000).toFixed(0)}K <span className="text-white/30">USDC</span>
            </div>
          </div>
          <div>
            <div className="label">Utilization</div>
            <div className={`text-sm font-mono mt-1 ${utilizationColor}`}>
              {pool.utilization}%
            </div>
          </div>
          <div>
            <div className="label">LTV Limit</div>
            <div className="text-sm font-mono text-white mt-1">{pool.ltvLimit}%</div>
          </div>
        </div>

        {/* Utilization bar */}
        <div className="mt-4">
          <div className="h-2 bg-surface-3 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                pool.utilization > 70 ? 'bg-status-danger' :
                pool.utilization > 50 ? 'bg-status-triggered' : 'bg-status-active'
              }`}
              style={{ width: `${pool.utilization}%` }}
            />
          </div>
        </div>
      </div>

      {/* Risk notice */}
      <div className="mx-6 mb-4 p-3 bg-status-triggered/5 border border-status-triggered/10 rounded-xl flex items-start gap-2">
        <AlertTriangle className="w-4 h-4 text-status-triggered mt-0.5 flex-shrink-0" />
        <p className="text-xs text-white/40">
          Liquidity providers earn premiums but bear payout risk. You may lose deposited USDC if policies trigger.
          Current locked capital: {pool.lockedCapital.toLocaleString()} USDC ({pool.activePolicies} active policies).
        </p>
      </div>

      {/* Regions */}
      <div className="px-6 pb-4">
        <div className="label mb-2">Covered Regions</div>
        <div className="flex flex-wrap gap-2">
          {pool.regions.map((r) => (
            <span key={r} className="px-2 py-1 bg-surface-3 rounded text-xs font-mono text-white/40">{r}</span>
          ))}
        </div>
      </div>

      {/* Expand/collapse */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full border-t border-white/[0.04] p-4 flex items-center justify-center gap-2 text-sm text-white/40 hover:text-white/60 hover:bg-white/[0.02] transition-colors"
      >
        {expanded ? 'Hide' : 'Deposit / Withdraw'}
        {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>

      {/* Deposit/Withdraw panel */}
      {expanded && (
        <div className="border-t border-white/[0.04] p-6 animate-in">
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="label">Deposit Amount</label>
                <button className="text-xs text-nimbus-300 hover:text-nimbus-200">MAX</button>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  placeholder="0.00"
                  className="input font-mono"
                />
                <span className="text-sm text-white/40 font-medium whitespace-nowrap">USDC</span>
              </div>
            </div>

            {/* Confirmation notice */}
            <div className="p-3 bg-surface-2 rounded-xl flex items-start gap-2">
              <Info className="w-4 h-4 text-nimbus-400 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-white/40">
                Depositing is irreversible until you withdraw. Your USDC will be used to underwrite policies.
                Withdrawals may be delayed if capital is locked against active policies.
              </p>
            </div>

            <div className="flex gap-3">
              {connected ? (
                <>
                  <button className="btn-primary flex-1 py-3" disabled={!depositAmount}>
                    Deposit
                  </button>
                  <button className="btn-secondary flex-1 py-3">
                    Withdraw
                  </button>
                </>
              ) : (
                <button onClick={() => setVisible(true)} className="btn-primary flex-1 py-3 inline-flex items-center justify-center gap-2">
                  <Wallet className="w-4 h-4" />
                  Connect Wallet
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function PoolsPage() {
  return (
    <main className="min-h-screen bg-surface-0 noise">
      <Nav />
      <div className="section py-8 lg:py-12">
        <div className="mb-8">
          <h1 className="heading-md text-white mb-2">Underwriter Pools</h1>
          <p className="body-md max-w-2xl">
            Provide liquidity to earn premium yield. Browse pools by peril type and region coverage.
            All values are denominated in USDC.
          </p>
        </div>

        {/* How it works */}
        <div className="card-glass p-6 mb-8">
          <div className="heading-sm text-white mb-4">How Underwriting Works</div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-nimbus-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
                <DollarSign className="w-4 h-4 text-nimbus-400" />
              </div>
              <div>
                <div className="text-sm font-medium text-white">Deposit USDC</div>
                <div className="text-xs text-white/40 mt-1">Your capital backs policies. You earn premiums as yield.</div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-status-triggered/10 rounded-lg flex items-center justify-center flex-shrink-0">
                <Lock className="w-4 h-4 text-status-triggered" />
              </div>
              <div>
                <div className="text-sm font-medium text-white">Capital locks</div>
                <div className="text-xs text-white/40 mt-1">When policies are sold, your USDC is locked proportionally as collateral.</div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-status-danger/10 rounded-lg flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-4 h-4 text-status-danger" />
              </div>
              <div>
                <div className="text-sm font-medium text-white">Payout risk</div>
                <div className="text-xs text-white/40 mt-1">If policies trigger, payouts are deducted from pool capital. You may lose deposited USDC.</div>
              </div>
            </div>
          </div>
        </div>

        {/* Pool list */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {DEMO_POOLS.map((pool) => (
            <PoolCard key={pool.id} pool={pool} />
          ))}
        </div>
      </div>
    </main>
  )
}
