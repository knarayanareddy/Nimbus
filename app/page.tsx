'use client'

import Link from 'next/link'
import Nav from '../components/Nav'

export default function Home() {
  return (
    <div className="min-h-screen">
      <Nav />

      {/* Hero */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-blue-950/20 via-transparent to-transparent pointer-events-none" aria-hidden="true" />
        <div className="max-w-4xl mx-auto px-6 pt-20 pb-24 text-center relative">
          <div className="inline-block px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs tracking-[2px] text-white/70 mb-6">
            SOLANA &bull; USDC &bull; PARAMETRIC
          </div>
          <h1 className="text-5xl sm:text-7xl font-semibold tracking-tighter leading-[0.9] mb-5">
            Instant climate cover.<br />No paperwork.
          </h1>
          <p className="text-xl sm:text-2xl text-white/50 max-w-lg mx-auto leading-relaxed">
            Buy drought or flood protection on rainfall.
            Automatic payout when the index triggers.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mt-10">
            <Link href="/buy" className="btn-primary text-lg px-10 py-4">
              Get Protected
            </Link>
            <Link href="/pools" className="btn-secondary text-lg px-8 py-4">
              Provide Liquidity
            </Link>
          </div>
        </div>
      </div>

      {/* Stats bar */}
      <div className="border-t border-white/5 py-10">
        <div className="max-w-5xl mx-auto px-6 grid grid-cols-1 sm:grid-cols-3 gap-8 text-center">
          <div>
            <div className="text-3xl font-semibold text-white">100%</div>
            <div className="text-sm text-white/40 mt-1">Deterministic Oracle Snapshots</div>
          </div>
          <div>
            <div className="text-3xl font-semibold text-white">Ed25519</div>
            <div className="text-sm text-white/40 mt-1">Signed Quotes (No Replay)</div>
          </div>
          <div>
            <div className="text-3xl font-semibold text-white">Auto</div>
            <div className="text-sm text-white/40 mt-1">Settlement on Window End</div>
          </div>
        </div>
      </div>

      {/* How it works */}
      <div className="border-t border-white/5 py-16">
        <div className="max-w-5xl mx-auto px-6">
          <h2 className="text-2xl font-semibold text-center mb-10">How It Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="card text-center">
              <div className="w-10 h-10 mx-auto mb-4 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400 text-lg font-bold">1</div>
              <h3 className="font-semibold mb-2">Choose Coverage</h3>
              <p className="text-sm text-white/50">Select region, peril type, rainfall threshold, and coverage window.</p>
            </div>
            <div className="card text-center">
              <div className="w-10 h-10 mx-auto mb-4 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400 text-lg font-bold">2</div>
              <h3 className="font-semibold mb-2">Pay Premium</h3>
              <p className="text-sm text-white/50">Get an instant quote. Pay premium in USDC. Policy activates immediately.</p>
            </div>
            <div className="card text-center">
              <div className="w-10 h-10 mx-auto mb-4 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400 text-lg font-bold">3</div>
              <h3 className="font-semibold mb-2">Automatic Payout</h3>
              <p className="text-sm text-white/50">Oracle records daily rainfall. If index triggers, payout is instant. No claims process.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-white/5 py-8">
        <div className="max-w-5xl mx-auto px-6 text-center text-xs text-white/30">
          ClimaFi Protocol &bull; Built on Solana &bull; Audited by [TBD]
        </div>
      </footer>
    </div>
  )
}
