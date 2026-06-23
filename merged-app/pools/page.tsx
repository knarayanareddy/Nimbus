'use client'

import { useState, useEffect } from 'react'
import { useWallet, useConnection } from '@solana/wallet-adapter-react'
import { useWalletModal } from '@solana/wallet-adapter-react-ui'
import { Transaction } from '@solana/web3.js'
import Nav from '../components/Nav'
import { createDepositTransaction } from '../../lib/nimbus'
import {
  TrendingUp, Shield, AlertTriangle, ChevronDown, ChevronUp,
  Droplets, Sun, Info, DollarSign, BarChart3, Activity,
  CheckCircle2, Lock, ArrowRight, ExternalLink
} from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts'

interface Pool {
  id: string
  name: string
  peril: 'drought' | 'flood' | 'mixed'
  regions: string[]
  tvl: number
  utilization: number
  ltvLimit: number
  apyEst: { low: number; high: number }
  activePolicies: number
  maxCapacity: number
  oracle: string
  premiumHistory: { month: string; rate: number }[]
  description: string
}

const POOLS: Pool[] = [
  {
    id: 'pool-1',
    name: 'Africa Drought Pool',
    peril: 'drought',
    regions: ['Kenya', 'Ethiopia', 'Nigeria', 'Tanzania'],
    tvl: 480000,
    utilization: 68,
    ltvLimit: 80,
    apyEst: { low: 22, high: 34 },
    activePolicies: 24,
    maxCapacity: 600000,
    oracle: 'Switchboard · NOAA · Open-Meteo',
    premiumHistory: [
      { month: 'Feb', rate: 18 }, { month: 'Mar', rate: 24 }, { month: 'Apr', rate: 31 },
      { month: 'May', rate: 28 }, { month: 'Jun', rate: 33 }, { month: 'Jul', rate: 34 },
    ],
    description: 'Underwriting drought risk across sub-Saharan Africa. Covers Sum and Mean index policies tied to NOAA + Switchboard oracle data.',
  },
  {
    id: 'pool-2',
    name: 'South Asia Flood Pool',
    peril: 'flood',
    regions: ['India', 'Bangladesh', 'Thailand', 'Philippines'],
    tvl: 720000,
    utilization: 54,
    ltvLimit: 75,
    apyEst: { low: 18, high: 28 },
    activePolicies: 31,
    maxCapacity: 1000000,
    oracle: 'Switchboard · Open-Meteo',
    premiumHistory: [
      { month: 'Feb', rate: 15 }, { month: 'Mar', rate: 19 }, { month: 'Apr', rate: 22 },
      { month: 'May', rate: 25 }, { month: 'Jun', rate: 27 }, { month: 'Jul', rate: 28 },
    ],
    description: 'Underwriting monsoon-season flood risk across South and Southeast Asia. Max index specialization for extreme rainfall events.',
  },
  {
    id: 'pool-3',
    name: 'Latin America Drought',
    peril: 'drought',
    regions: ['Brazil', 'Argentina', 'Colombia', 'Mexico'],
    tvl: 210000,
    utilization: 41,
    ltvLimit: 70,
    apyEst: { low: 14, high: 22 },
    activePolicies: 12,
    maxCapacity: 400000,
    oracle: 'Switchboard · NOAA',
    premiumHistory: [
      { month: 'Feb', rate: 12 }, { month: 'Mar', rate: 14 }, { month: 'Apr', rate: 18 },
      { month: 'May', rate: 20 }, { month: 'Jun', rate: 21 }, { month: 'Jul', rate: 22 },
    ],
    description: 'Covering agricultural drought risk across Latin America. Focus on Brazil\'s cerrado and Argentina\'s pampas regions.',
  },
  {
    id: 'pool-4',
    name: 'Global Mixed Peril',
    peril: 'mixed',
    regions: ['Global', 'Multi-region'],
    tvl: 650000,
    utilization: 72,
    ltvLimit: 80,
    apyEst: { low: 26, high: 38 },
    activePolicies: 47,
    maxCapacity: 1000000,
    oracle: 'Switchboard · NOAA · Open-Meteo',
    premiumHistory: [
      { month: 'Feb', rate: 24 }, { month: 'Mar', rate: 28 }, { month: 'Apr', rate: 33 },
      { month: 'May', rate: 35 }, { month: 'Jun', rate: 37 }, { month: 'Jul', rate: 38 },
    ],
    description: 'Diversified exposure across drought and flood perils globally. Higher APY reflects broader risk coverage with active management of pool LTV.',
  },
]

const PERIL_COLORS = {
  drought: { main: '#f97316', bg: 'rgba(249,115,22,0.05)', border: 'rgba(249,115,22,0.2)' },
  flood: { main: '#38b6ff', bg: 'rgba(56,182,255,0.05)', border: 'rgba(56,182,255,0.2)' },
  mixed: { main: '#6174f5', bg: 'rgba(97,116,245,0.05)', border: 'rgba(97,116,245,0.2)' },
}

function DepositModal({ pool, onClose }: { pool: Pool; onClose: () => void }) {
  const { connected, publicKey, sendTransaction } = useWallet()
  const { setVisible: setWalletVisible } = useWalletModal()
  const { connection } = useConnection()

  const [amount, setAmount] = useState('')
  const [step, setStep] = useState<'input' | 'confirm' | 'done'>('input')
  const [processing, setProcessing] = useState(false)
  const [txError, setTxError] = useState<string | null>(null)
  const [txid, setTxid] = useState<string | null>(null)

  const handleConfirm = async () => {
    if (!connected || !publicKey) {
      setWalletVisible(true)
      return
    }
    setProcessing(true)
    setTxError(null)
    try {
      const poolIdNum = Number(pool.id.replace('pool-', '')) || 1
      const decimals = 6
      const baseUnits = Math.floor(Number(amount) * Math.pow(10, decimals))

      const tx = await createDepositTransaction(
        connection,
        { publicKey },
        poolIdNum,
        baseUnits
      )

      const signature = await sendTransaction(tx, connection)
      await connection.confirmTransaction(signature, 'confirmed')

      setTxid(signature)
      setStep('done')
    } catch (err: any) {
      console.error(err)
      setTxError(err.message || 'Deposit transaction failed. Verify your USDC balance.')
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/85 backdrop-blur-sm">
      <div className="card rounded-2xl p-8 max-w-md w-full shadow-2xl bg-surface-1 border border-nimbus-500/20">

        {txError && (
          <div className="mb-4 p-3 rounded-lg bg-status-danger/10 border border-status-danger/25 text-status-danger text-sm flex items-center gap-2">
            <AlertTriangle size={14} />
            <span>{txError}</span>
          </div>
        )}

        {step === 'done' ? (
          <div className="text-center">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 bg-green-500/10 border-2 border-green-500/40 glow-green">
              <CheckCircle2 size={28} className="text-green-400" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Deposit Confirmed</h3>
            <p className="text-white/45 text-sm mb-2">{Number(amount).toLocaleString()} USDC deposited to {pool.name}</p>
            {txid && (
              <div className="text-xs text-white/35 font-mono mb-4 break-all">
                Tx: {txid}
              </div>
            )}
            <p className="text-xs text-white/30 mb-6">You will earn premiums as policies are purchased. Monitor your position in Portfolio.</p>
            <button onClick={onClose} className="btn-primary px-6 py-3 rounded-xl text-sm w-full">Close</button>
          </div>
        ) : step === 'confirm' ? (
          <>
            <div className="flex items-start gap-3 p-4 rounded-xl mb-5 bg-orange-500/5 border border-orange-500/20">
              <AlertTriangle size={16} className="text-orange-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-white/50 leading-relaxed">
                <strong className="text-orange-300">This action is irreversible.</strong> Depositing USDC into this pool makes you a liquidity underwriter. <strong className="text-white/70">You can lose USDC</strong> if covered policies trigger. Review pool utilization and LTV limit before proceeding.
              </div>
            </div>
            <div className="card bg-surface-2 p-4 mb-5 border-none">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-white/30">Pool</span><div className="text-white font-medium mt-0.5">{pool.name}</div></div>
                <div><span className="text-white/30">Deposit</span><div className="text-white font-bold mt-0.5 font-mono">{Number(amount).toLocaleString()} USDC</div></div>
                <div><span className="text-white/30">Est. APY</span><div className="text-green-400 font-medium mt-0.5">{pool.apyEst.low}–{pool.apyEst.high}%</div></div>
                <div><span className="text-white/30">LTV Limit</span><div className="text-white/70 mt-0.5">{pool.ltvLimit}%</div></div>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setStep('input')} className="btn-secondary flex-1 py-3 rounded-xl text-sm">Back</button>
              <button onClick={handleConfirm} disabled={processing}
                className="btn-primary flex-1 py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2">
                {processing ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Confirming…</> : 'Confirm Deposit'}
              </button>
            </div>
          </>
        ) : (
          <>
            <h3 className="text-lg font-bold text-white mb-1">Deposit to {pool.name}</h3>
            <p className="text-xs text-white/35 mb-5">Earn premium yield. Bear payout risk if policies trigger.</p>

            <div className="mb-4">
              <label className="block text-xs font-medium text-white/50 mb-2">Amount (USDC)</label>
              <div className="relative">
                <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)}
                  placeholder="Enter amount"
                  className="input w-full px-4 py-4 rounded-xl text-xl font-bold font-mono pr-20" />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-white/40 font-semibold">USDC</span>
              </div>
              <div className="flex justify-between text-xs text-white/30 mt-1">
                <span>Provide collateral</span>
                {connected && (
                  <button onClick={() => setAmount('1000')} className="text-nimbus-300 hover:underline">Mock Max</button>
                )}
              </div>
            </div>

            {amount && Number(amount) > 0 && (
              <div className="card bg-surface-2 p-4 mb-4 border-none">
                <div className="text-xs text-white/35 mb-3">Projected returns (estimate only)</div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-white/30">Monthly (low)</span>
                    <div className="text-white font-medium mt-0.5 font-mono">
                      +{Math.round(Number(amount) * pool.apyEst.low / 100 / 12).toLocaleString()} USDC
                    </div>
                  </div>
                  <div>
                    <span className="text-white/30">Annual (high est.)</span>
                    <div className="text-green-400 font-bold mt-0.5 font-mono">
                      +{Math.round(Number(amount) * pool.apyEst.high / 100).toLocaleString()} USDC
                    </div>
                  </div>
                </div>
                <p className="text-xs text-orange-400/70 mt-3">Estimates only. Actual yield depends on policy volume and trigger events. You can lose principal.</p>
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={onClose} className="btn-secondary flex-1 py-3 rounded-xl text-sm">Cancel</button>
              {connected ? (
                <button onClick={() => setStep('confirm')} disabled={!amount || Number(amount) <= 0}
                  className="btn-primary flex-1 py-3 rounded-xl text-sm font-semibold disabled:opacity-40">
                  Review & Deposit
                </button>
              ) : (
                <button onClick={() => setWalletVisible(true)} className="btn-primary flex-1 py-3 rounded-xl text-sm font-semibold">
                  Connect Wallet
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function PoolCard({ pool }: { pool: Pool }) {
  const [expanded, setExpanded] = useState(false)
  const [depositModal, setDepositModal] = useState(false)
  const [mounted, setMounted] = useState(false)
  const colors = PERIL_COLORS[pool.peril]
  const utilizationWarning = pool.utilization >= 75

  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <>
      <div className="card bg-surface-1/40 border border-white/[0.06] rounded-2xl overflow-hidden hover:border-nimbus-500/20 transition-all duration-300">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-5">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 border"
                style={{ background: colors.bg, borderColor: colors.border }}
              >
                {pool.peril === 'drought'
                  ? <Sun size={18} style={{ color: colors.main }} />
                  : pool.peril === 'flood'
                  ? <Droplets size={18} style={{ color: colors.main }} />
                  : <BarChart3 size={18} style={{ color: colors.main }} />
                }
              </div>
              <div>
                <h3 className="font-semibold text-white text-sm">{pool.name}</h3>
                <div className="text-xs text-white/35 mt-0.5">{pool.regions.join(' · ')}</div>
              </div>
            </div>
            <div
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold capitalize border"
              style={{ background: colors.bg, color: colors.main, borderColor: colors.border }}
            >
              {pool.peril === 'mixed' ? <BarChart3 size={10} /> : pool.peril === 'drought' ? <Sun size={10} /> : <Droplets size={10} />}
              {pool.peril}
            </div>
          </div>

          {/* Key metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            <div className="card bg-surface-2/40 p-3 border-none">
              <div className="text-xs text-white/30 mb-0.5">Pool TVL</div>
              <div className="text-base font-bold text-white font-mono">${(pool.tvl / 1000).toFixed(0)}k</div>
              <div className="text-xs text-white/25">USDC</div>
            </div>
            <div className="card bg-surface-2/40 p-3 border-none">
              <div className="text-xs text-white/30 mb-0.5">Est. APY</div>
              <div className="text-base font-bold text-green-400 font-mono">{pool.apyEst.low}–{pool.apyEst.high}%</div>
              <div className="text-xs text-white/25">estimate only</div>
            </div>
            <div className="card bg-surface-2/40 p-3 border-none">
              <div className="text-xs text-white/30 mb-0.5">Utilization</div>
              <div className={`text-base font-bold font-mono ${utilizationWarning ? 'text-orange-400' : 'text-white'}`}>
                {pool.utilization}%
              </div>
              <div className="text-xs text-white/25">of {pool.ltvLimit}% LTV</div>
            </div>
            <div className="card bg-surface-2/40 p-3 border-none">
              <div className="text-xs text-white/30 mb-0.5">Policies</div>
              <div className="text-base font-bold text-white font-mono">{pool.activePolicies}</div>
              <div className="text-xs text-white/25">active</div>
            </div>
          </div>

          {/* Utilization bar */}
          <div className="mb-4">
            <div className="flex justify-between text-xs text-white/30 mb-1.5">
              <span>Pool utilization</span>
              <span className={utilizationWarning ? 'text-orange-400' : ''}>{pool.utilization}% / {pool.ltvLimit}% LTV limit</span>
            </div>
            <div className="utilization-bar">
              <div
                className="utilization-fill"
                style={{
                  width: `${(pool.utilization / pool.ltvLimit) * 100}%`,
                  background: utilizationWarning
                    ? 'linear-gradient(to right, #f59e0b, #f97316)'
                    : 'linear-gradient(to right, #6174f5, #38b6ff)',
                }}
              />
            </div>
            {utilizationWarning && (
              <div className="text-xs text-orange-400/80 mt-1 flex items-center gap-1">
                <AlertTriangle size={10} /> High utilization — approaching LTV limit
              </div>
            )}
          </div>

          {/* Oracle + actions */}
          <div className="flex items-center justify-between">
            <div className="inline-flex bg-nimbus-500/10 border border-nimbus-400/25 px-2.5 py-1 rounded-lg text-xs text-nimbus-300 font-medium">{pool.oracle}</div>
            <div className="flex gap-2">
              <button onClick={() => setExpanded(!expanded)} className="btn-secondary px-3 py-1.5 rounded-lg text-xs flex items-center gap-1">
                {expanded ? <>Hide Details <ChevronUp size={12} /></> : <>Show Details <ChevronDown size={12} /></>}
              </button>
              <button onClick={() => setDepositModal(true)} className="btn-primary px-4 py-1.5 rounded-lg text-xs font-semibold">
                Deposit
              </button>
            </div>
          </div>
        </div>

        {/* Expanded detail section */}
        {expanded && (
          <div className="border-t border-white/[0.04] bg-white/[0.005] p-6 animate-in">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Description */}
              <div>
                <h4 className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2">Pool Strategy</h4>
                <p className="text-sm text-white/50 leading-relaxed mb-4">{pool.description}</p>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-white/30">Pool Capacity</span>
                    <span className="text-white/60 font-mono">${(pool.tvl).toLocaleString()} / ${(pool.maxCapacity).toLocaleString()} USDC</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-white/30">Withdrawal Lockup</span>
                    <span className="text-white/60">None (instant burn of LP tokens)</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-white/30">Smart Contract Code</span>
                    <a href="https://github.com/knarayanareddy/Nimbus" target="_blank" rel="noreferrer" className="text-nimbus-300 flex items-center gap-0.5 hover:underline">
                      Verified <ExternalLink size={10} />
                    </a>
                  </div>
                </div>
              </div>

              {/* Historical rates chart */}
              <div>
                <h4 className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2">Historical Premium Yield Rate</h4>
                <div className="h-28">
                  {mounted && (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={pool.premiumHistory} margin={{ top: 4, right: 4, left: -25, bottom: 0 }}>
                        <defs>
                          <linearGradient id={`grad-${pool.id}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={colors.main} stopOpacity={0.25} />
                            <stop offset="95%" stopColor={colors.main} stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="month" tick={{ fill: 'rgba(255,255,255,0.2)', fontSize: 9 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: 'rgba(255,255,255,0.2)', fontSize: 9 }} axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={{ background: '#1a1d2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6 }}
                          labelStyle={{ color: 'rgba(255,255,255,0.3)', fontSize: 10 }}
                          itemStyle={{ color: colors.main, fontSize: 10 }} />
                        <Area type="monotone" dataKey="rate" stroke={colors.main} strokeWidth={1.5} fill={`url(#grad-${pool.id})`} dot={false} />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {depositModal && (
        <DepositModal pool={pool} onClose={() => setDepositModal(false)} />
      )}
    </>
  )
}

export default function UnderwritePage() {
  return (
    <main className="min-h-screen bg-surface-0 noise pb-24">
      <Nav />

      <section className="pt-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Page header */}
        <div className="mb-10 text-center max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold mb-4 bg-nimbus-500/10 border border-nimbus-400/20 text-nimbus-300">
            <Shield size={12} /> Underwrite Climate Risks
          </div>
          <h1 className="text-4xl font-display font-bold text-white mb-4" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            Earn yield from premiums
          </h1>
          <p className="text-white/45 text-base">
            Supply USDC collateral to underwrite parametric policies. Earn APY yield paid out from premiums. Keep in mind you are bearing the payout risk if extreme weather triggers are reached.
          </p>
        </div>

        {/* Risks disclaimer banner */}
        <div className="card bg-orange-500/5 border border-orange-500/20 p-4 rounded-xl flex items-start gap-3 mb-10 max-w-4xl mx-auto">
          <AlertTriangle size={18} className="text-orange-400 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-white/50 leading-relaxed">
            <strong className="text-orange-300 uppercase tracking-wide">Liquidity Risk Warning:</strong> Parametric pools are subject to drawdown during extreme climate events (droughts, flash floods). Premium APY is variable and not guaranteed. Your capital is utilized to back active policies on-chain up to the specified LTV Limit. Ensure you diversify across pools.
          </div>
        </div>

        {/* Pools grid */}
        <div className="grid grid-cols-1 gap-6 max-w-4xl mx-auto">
          {POOLS.map((pool) => (
            <PoolCard key={pool.id} pool={pool} />
          ))}
        </div>
      </section>
    </main>
  )
}
