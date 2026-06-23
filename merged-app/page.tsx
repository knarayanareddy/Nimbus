'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Nav from './components/Nav'
import RainCanvas from './components/RainCanvas'
import {
  CloudRain, Droplets, Sun, TrendingUp, Shield, Zap,
  ArrowRight, CheckCircle2, Globe, BarChart3, Lock,
  ChevronRight, Activity, Database, Clock
} from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, ResponsiveContainer
} from 'recharts'

// Mock rainfall data for Nairobi hero chart
const rainfallData = [
  { day: 'Jul 1', rain: 8.2 },
  { day: 'Jul 5', rain: 3.1 },
  { day: 'Jul 10', rain: 15.4 },
  { day: 'Jul 15', rain: 2.0 },
  { day: 'Jul 20', rain: 6.8 },
  { day: 'Jul 25', rain: 1.2 },
  { day: 'Jul 30', rain: 0.4 },
  { day: 'Aug 5', rain: 0.0 },
  { day: 'Aug 10', rain: 0.8 },
  { day: 'Aug 15', rain: 2.1 },
]

const THRESHOLD = 5.0

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const val = payload[0].value
    const triggered = val < THRESHOLD
    return (
      <div className="px-3 py-2 rounded-lg text-sm bg-surface-1 border border-nimbus-500/30">
        <p className="text-white/55 text-xs mb-1">{label}</p>
        <p className={`font-semibold ${triggered ? 'text-orange-400' : 'text-blue-400'}`}>
          {val.toFixed(1)} mm
        </p>
        {triggered && <p className="text-orange-400/70 text-xs">Below threshold ↓</p>}
      </div>
    )
  }
  return null
}

const HOW_IT_WORKS = [
  {
    step: '01',
    icon: <Globe size={20} />,
    title: 'Select your region & peril',
    desc: 'Choose a geographic zone and whether you need drought or flood protection. Coverage is tied to objective weather data — not your specific farm or property.',
  },
  {
    step: '02',
    icon: <BarChart3 size={20} />,
    title: 'Set your index & threshold',
    desc: 'Pick Sum, Mean, or Max rainfall measurement. Set a threshold: if the index crosses it, you\'re paid. Automatically. No paperwork.',
  },
  {
    step: '03',
    icon: <Zap size={20} />,
    title: 'Get a signed quote in seconds',
    desc: 'Our off-chain engine generates a cryptographically signed quote valid for 120 seconds. Your premium is locked — no slippage, no surprise.',
  },
  {
    step: '04',
    icon: <CheckCircle2 size={20} />,
    title: 'Automatic settlement',
    desc: 'When your observation window ends, on-chain oracle data is compared to your threshold. If triggered, USDC lands in your wallet. No claims. No adjusters.',
  },
]

const STATS = [
  { label: 'Total Value Protected', value: '$4.2M', sub: 'USDC' },
  { label: 'Policies Settled', value: 847, sub: 'auto-settled' },
  { label: 'Pool TVL', value: '$2.1M', sub: 'USDC liquidity' },
  { label: 'Avg Settlement Time', value: '<3s', sub: 'Solana finality' },
]

const TRUST_ITEMS = [
  { icon: <Database size={14} />, text: 'Switchboard · NOAA · Open-Meteo oracle data' },
  { icon: <Lock size={14} />, text: 'Ed25519 signed quotes · On-chain verification' },
  { icon: <Shield size={14} />, text: 'Multisig governance · Timelock-protected' },
  { icon: <Activity size={14} />, text: 'Fully auditable settlement trail' },
]

export default function HomePage() {
  const [counter, setCounter] = useState(0)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const interval = setInterval(() => {
      setCounter((c) => (c >= 847 ? 847 : c + 7))
    }, 20)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="relative min-h-screen bg-[#0f1117]">
      <RainCanvas />
      <Nav />

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
        <div className="absolute inset-0 z-0">
          <div
            className="absolute inset-0"
            style={{
              background:
                'radial-gradient(ellipse 80% 60% at 50% 20%, rgba(97,116,245,0.12) 0%, transparent 70%), radial-gradient(ellipse 60% 50% at 80% 80%, rgba(14,165,233,0.08) 0%, transparent 60%), #0f1117',
            }}
          />
          <div
            className="absolute top-20 left-1/2 -translate-x-1/2 w-full max-w-4xl h-64 opacity-20"
            style={{
              background: 'radial-gradient(ellipse 100% 100% at 50% 50%, rgba(97,116,245,0.25) 0%, transparent 70%)',
              filter: 'blur(60px)',
            }}
          />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left Column: Hero Content */}
            <div className="animate-in">
              <div
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold mb-6 bg-nimbus-500/10 border border-nimbus-400/25 text-nimbus-300"
              >
                <Zap size={10} />
                Parametric Risk Coverage · Solana · USDC
              </div>

              <h1
                className="text-5xl sm:text-6xl lg:text-[4.5rem] font-display font-bold leading-[1.05] tracking-tight mb-6 text-white"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                Weather risk,{' '}
                <span className="bg-gradient-to-r from-nimbus-300 via-nimbus-400 to-accent-cyan bg-clip-text text-transparent">
                  settled by data.
                </span>{' '}
                Not by a claims adjuster.
              </h1>

              <p className="text-lg text-white/55 leading-relaxed mb-4 max-w-xl">
                Nimbus is a decentralized parametric risk protocol on Solana. Set a rainfall index, a threshold, and a payout amount. When the oracle confirms the trigger — USDC arrives automatically.
              </p>

              <p className="text-sm text-white/35 mb-8 max-w-lg">
                No claims process. No adjusters. No human decisions.{' '}
                <span className="text-white/50">This is not traditional insurance.</span>
              </p>

              <div className="flex flex-wrap gap-3 mb-10">
                <Link
                  href="/buy"
                  className="btn-primary flex items-center gap-2 px-6 py-3.5 rounded-xl text-sm font-semibold"
                >
                  <CloudRain size={16} />
                  Buy Parametric Coverage
                  <ArrowRight size={14} />
                </Link>
                <Link
                  href="/pools"
                  className="btn-secondary flex items-center gap-2 px-6 py-3.5 rounded-xl text-sm font-semibold"
                >
                  <TrendingUp size={16} />
                  Provide Liquidity
                </Link>
              </div>

              {/* Trust signals */}
              <div className="flex flex-wrap gap-4">
                {TRUST_ITEMS.map((item, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-xs text-white/35">
                    <span className="text-[#38b6ff]/60">{item.icon}</span>
                    {item.text}
                  </div>
                ))}
              </div>
            </div>

            {/* Right Column: Live rainfall chart demo */}
            <div className="animate-in" style={{ animationDelay: '150ms' }}>
              <div className="card bg-surface-1/50 border border-white/[0.06] rounded-2xl p-6 shadow-2xl backdrop-blur-xl">
                {/* Chart Header */}
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold text-white">Nairobi Region · Drought Policy</span>
                      <span className="badge bg-status-active/15 text-status-active border border-status-active/35 px-2 py-0.5 rounded-full text-xs font-medium">Active</span>
                    </div>
                    <div className="text-xs text-white/40">Sum · Jul 1 – Aug 15, 2025 · Below 50mm threshold</div>
                  </div>
                  <div className="inline-flex items-center bg-nimbus-500/10 border border-nimbus-400/25 px-2.5 py-1 rounded-lg text-[0.7rem] font-medium text-nimbus-300">
                    Switchboard · NOAA
                  </div>
                </div>

                {/* Rainfall chart */}
                <div className="h-48 mb-4">
                  {mounted && (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={rainfallData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="rainGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#6174f5" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#6174f5" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                        <XAxis dataKey="day" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} axisLine={false} tickLine={false} />
                        <Tooltip content={<CustomTooltip />} />
                        <ReferenceLine
                          y={THRESHOLD}
                          stroke="#f97316"
                          strokeDasharray="4 4"
                          strokeWidth={1.5}
                          label={{ value: 'Threshold 5mm', fill: '#f97316', fontSize: 10, position: 'insideTopRight' }}
                        />
                        <Area
                          type="monotone"
                          dataKey="rain"
                          stroke="#6174f5"
                          strokeWidth={2}
                          fill="url(#rainGrad)"
                          dot={{ fill: '#6174f5', r: 3, strokeWidth: 0 }}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </div>

                {/* Status row */}
                <div className="grid grid-cols-3 gap-3 pt-4 border-t border-white/5">
                  <div>
                    <div className="text-xs text-white/35 mb-0.5">Current Index</div>
                    <div className="text-sm font-semibold text-orange-400">32.6 mm</div>
                    <div className="text-xs text-white/25">of 50mm threshold</div>
                  </div>
                  <div>
                    <div className="text-xs text-white/35 mb-0.5">Payout</div>
                    <div className="text-sm font-semibold text-white font-mono">5,000 USDC</div>
                    <div className="text-xs text-white/25">if triggered</div>
                  </div>
                  <div>
                    <div className="text-xs text-white/35 mb-0.5">Days Left</div>
                    <div className="text-sm font-semibold text-white flex items-center gap-1 font-mono">
                      <Clock size={12} className="text-blue-400" /> 18d
                    </div>
                    <div className="text-xs text-white/25">in window</div>
                  </div>
                </div>
              </div>

              {/* Settlement proof box */}
              <div className="mt-3 card bg-surface-1/50 border border-white/[0.06] rounded-xl p-4">
                <div className="flex items-center gap-2 text-xs text-white/40 mb-2">
                  <CheckCircle2 size={12} className="text-green-400" />
                  <span className="font-medium text-white/60">Settlement is automatic & deterministic</span>
                </div>
                <div className="font-mono text-xs text-white/25 leading-relaxed">
                  if (oracle_sum &lt; 50.0) → payout 5000 USDC to holder<br />
                  source: Switchboard · Open-Meteo · NOAA<br />
                  verified on-chain · no human intervention
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="relative z-10 border-y border-white/5 bg-white/[0.01]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {STATS.map((stat, i) => (
              <div key={i} className="text-center">
                <div
                  className="text-2xl sm:text-3xl font-display font-bold text-white mb-1"
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  {stat.label === 'Policies Settled' ? counter : stat.value}
                </div>
                <div className="text-xs text-white/35 uppercase tracking-wider">{stat.label}</div>
                <div className="text-xs text-white/20 mt-0.5">{stat.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="relative z-10 py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold mb-4 bg-nimbus-500/10 border border-nimbus-400/20 text-nimbus-300">
              How Nimbus Works
            </div>
            <h2
              className="text-3xl sm:text-4xl font-display font-bold text-white mb-4"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              Coverage in 4 steps.{' '}
              <span className="bg-gradient-to-r from-nimbus-300 to-accent-cyan bg-clip-text text-transparent">No paperwork. No trust.</span>
            </h2>
            <p className="text-white/45 max-w-2xl mx-auto">
              Parametric coverage replaces subjective claim assessments with objective data. If the number crosses the line, you get paid. Period.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {HOW_IT_WORKS.map((step, i) => (
              <div key={i} className="card bg-surface-1/30 border border-white/[0.06] rounded-2xl p-6 relative group hover:border-nimbus-400/30 transition-all duration-300">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-nimbus-500/10 text-nimbus-300">
                    {step.icon}
                  </div>
                  <span
                    className="text-4xl font-bold text-white/5 font-display"
                    style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                  >
                    {step.step}
                  </span>
                </div>
                <h3 className="text-base font-semibold text-white mb-2">{step.title}</h3>
                <p className="text-sm text-white/45 leading-relaxed">{step.desc}</p>
                {i < HOW_IT_WORKS.length - 1 && (
                  <ChevronRight
                    size={16}
                    className="hidden lg:block absolute -right-3 top-1/2 -translate-y-1/2 text-white/15 z-10"
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Index Methods Explainer */}
      <section className="relative z-10 py-20 bg-white/[0.005] border-t border-white/[0.04]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold mb-4 bg-nimbus-500/10 border border-nimbus-400/20 text-nimbus-300">
                Index Methods Explained
              </div>
              <h2
                className="text-3xl font-display font-bold text-white mb-4"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                Your measurement method{' '}
                <span className="bg-gradient-to-r from-nimbus-300 to-accent-cyan bg-clip-text text-transparent">changes your risk.</span>
              </h2>
              <p className="text-white/45 mb-8">
                Three ways to measure rainfall. Each answers a different question about your exposure.
              </p>

              <div className="space-y-4">
                {[
                  {
                    method: 'Sum',
                    icon: '∑',
                    color: '#6174f5',
                    bg: 'rgba(97,116,245,0.05)',
                    border: 'rgba(97,116,245,0.15)',
                    question: 'Was there enough rain overall?',
                    desc: 'Total accumulated rainfall across the entire observation window. Best for seasonal crop insurance — you care about the whole growing season.',
                  },
                  {
                    method: 'Mean',
                    icon: 'x̄',
                    color: '#38b6ff',
                    bg: 'rgba(56,182,255,0.05)',
                    border: 'rgba(56,182,255,0.15)',
                    question: 'Was it consistently dry (or wet)?',
                    desc: 'Average daily rainfall. Best for sustained drought — protects against long periods of below-average precipitation.',
                  },
                  {
                    method: 'Max',
                    icon: '↑',
                    color: '#a855f7',
                    bg: 'rgba(168,85,247,0.05)',
                    border: 'rgba(168,85,247,0.15)',
                    question: 'Did a single catastrophic event occur?',
                    desc: 'Single highest-rainfall day. Best for flash flood protection — one extreme event triggers the payout.',
                  },
                ].map((m) => (
                  <div
                    key={m.method}
                    className="flex gap-4 p-4 rounded-xl border"
                    style={{ background: m.bg, borderColor: m.border }}
                  >
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center font-bold text-lg flex-shrink-0 border"
                      style={{ background: m.bg, color: m.color, borderColor: m.border }}
                    >
                      {m.icon}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-white">{m.method}</span>
                        <span className="text-xs italic" style={{ color: m.color }}>{m.question}</span>
                      </div>
                      <p className="text-sm text-white/45">{m.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Column: Charts display */}
            <div className="space-y-4">
              <div className="card bg-surface-1/50 border border-white/[0.06] rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Sun size={16} className="text-orange-400" />
                  <span className="text-sm font-semibold text-white">Drought Coverage</span>
                  <span className="text-xs text-white/35">– payout when rainfall is TOO LOW</span>
                </div>
                <div className="h-28">
                  {mounted && (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={[
                          { d: 'W1', v: 2 }, { d: 'W2', v: 1 }, { d: 'W3', v: 0.5 },
                          { d: 'W4', v: 1.2 }, { d: 'W5', v: 0.8 }, { d: 'W6', v: 0.2 }
                        ]}
                        margin={{ top: 4, right: 4, left: -30, bottom: 0 }}
                      >
                        <defs>
                          <linearGradient id="droughtGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#f97316" stopOpacity={0.25} />
                            <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <ReferenceLine
                          y={3}
                          stroke="#f97316"
                          strokeDasharray="4 4"
                          strokeWidth={1.5}
                          label={{ value: 'Threshold', fill: '#f97316', fontSize: 9, position: 'right' }}
                        />
                        <Area
                          type="monotone"
                          dataKey="v"
                          stroke="#f97316"
                          strokeWidth={2}
                          fill="url(#droughtGrad)"
                          dot={false}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </div>
                <p className="text-xs text-white/35 mt-2">Index stays below threshold → <span className="text-orange-400 font-medium">Payout triggered ✓</span></p>
              </div>

              <div className="card bg-surface-1/50 border border-white/[0.06] rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <CloudRain size={16} className="text-blue-400" />
                  <span className="text-sm font-semibold text-white">Flood Coverage</span>
                  <span className="text-xs text-white/35">– payout when rainfall is TOO HIGH</span>
                </div>
                <div className="h-28">
                  {mounted && (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={[
                          { d: 'W1', v: 10 }, { d: 'W2', v: 18 }, { d: 'W3', v: 35 },
                          { d: 'W4', v: 42 }, { d: 'W5', v: 28 }, { d: 'W6', v: 15 }
                        ]}
                        margin={{ top: 4, right: 4, left: -30, bottom: 0 }}
                      >
                        <defs>
                          <linearGradient id="floodGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#6174f5" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#6174f5" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <ReferenceLine
                          y={30}
                          stroke="#38b6ff"
                          strokeDasharray="4 4"
                          strokeWidth={1.5}
                          label={{ value: 'Threshold', fill: '#38b6ff', fontSize: 9, position: 'right' }}
                        />
                        <Area
                          type="monotone"
                          dataKey="v"
                          stroke="#38b6ff"
                          strokeWidth={2}
                          fill="url(#floodGrad)"
                          dot={false}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </div>
                <p className="text-xs text-white/35 mt-2">Index crosses above threshold → <span className="text-blue-400 font-medium">Payout triggered ✓</span></p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/[0.04] py-12 bg-[#0d0f14]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-nimbus-400 to-accent-cyan rounded-xl flex items-center justify-center">
                <CloudRain size={16} className="text-white" />
              </div>
              <span className="font-display font-semibold text-white/60">Nimbus Protocol</span>
            </div>

            <div className="flex items-center gap-6 text-sm text-white/35">
              <a
                href="https://github.com/knarayanareddy/Nimbus"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-white/60 transition-colors"
              >
                GitHub
              </a>
              <Link href="/governance" className="hover:text-white/60 transition-colors">
                Governance
              </Link>
              <span>Solana Devnet</span>
            </div>

            <p className="text-xs text-white/20">
              Nimbus provides parametric risk coverage, not traditional insurance.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
