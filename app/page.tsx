'use client'

import Link from 'next/link'
import Nav from '../components/Nav'

export default function Home() {
  return (
    <div className="min-h-screen">
      <Nav />

      {/* Hero */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-blue-950/30 via-transparent to-transparent pointer-events-none" aria-hidden="true" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/10 via-transparent to-transparent pointer-events-none" aria-hidden="true" />
        <div className="max-w-4xl mx-auto px-6 pt-24 pb-28 text-center relative">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs tracking-[1.5px] text-white/70 mb-7">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            LIVE ON SOLANA DEVNET
          </div>
          <h1 className="text-5xl sm:text-7xl font-semibold tracking-tighter leading-[0.9] mb-6">
            Instant climate cover.<br />No paperwork.
          </h1>
          <p className="text-xl sm:text-2xl text-white/50 max-w-lg mx-auto leading-relaxed">
            Buy drought or flood protection on rainfall.
            Automatic payout when the index triggers.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mt-12">
            <Link href="/buy" className="btn-primary text-lg px-10 py-4">
              Get Protected
            </Link>
            <Link href="/pools" className="btn-secondary text-lg px-8 py-4">
              Provide Liquidity
            </Link>
          </div>
        </div>
      </div>

      {/* Trust signals */}
      <div className="border-t border-white/5 py-12">
        <div className="max-w-5xl mx-auto px-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 text-center animate-stagger">
            <div className="card-hover p-5">
              <div className="text-2xl sm:text-3xl font-semibold text-white mb-1">55</div>
              <div className="text-xs text-white/40">On-chain Security Checks</div>
            </div>
            <div className="card-hover p-5">
              <div className="text-2xl sm:text-3xl font-semibold text-white mb-1">Ed25519</div>
              <div className="text-xs text-white/40">Signed Quotes</div>
            </div>
            <div className="card-hover p-5">
              <div className="text-2xl sm:text-3xl font-semibold text-white mb-1">M-of-N</div>
              <div className="text-xs text-white/40">Multisig Governance</div>
            </div>
            <div className="card-hover p-5">
              <div className="text-2xl sm:text-3xl font-semibold text-white mb-1">Auto</div>
              <div className="text-xs text-white/40">Oracle Settlement</div>
            </div>
          </div>
        </div>
      </div>

      {/* Security badges */}
      <div className="py-8 px-6">
        <div className="max-w-3xl mx-auto flex flex-wrap items-center justify-center gap-4">
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/5 border border-emerald-500/20 text-xs text-emerald-300">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
            OWASP 9.0 Security Score
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/5 border border-blue-500/20 text-xs text-blue-300">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            Built on Solana
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/5 border border-purple-500/20 text-xs text-purple-300">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            USDC Settlements
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/5 border border-amber-500/20 text-xs text-amber-300">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
            Switchboard Oracles
          </div>
        </div>
      </div>

      {/* How it works */}
      <div className="border-t border-white/5 py-16">
        <div className="max-w-5xl mx-auto px-6">
          <h2 className="text-2xl sm:text-3xl font-semibold text-center mb-3">How It Works</h2>
          <p className="text-center text-white/40 text-sm mb-10 max-w-lg mx-auto">Three steps from vulnerability to coverage. No middlemen, no paperwork.</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-stagger">
            <div className="card-hover text-center">
              <div className="w-12 h-12 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-blue-500/20 to-blue-600/10 border border-blue-500/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" /></svg>
              </div>
              <h3 className="font-semibold mb-2">Choose Coverage</h3>
              <p className="text-sm text-white/50">Select region, peril type, rainfall threshold, and coverage window.</p>
            </div>
            <div className="card-hover text-center">
              <div className="w-12 h-12 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 border border-emerald-500/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <h3 className="font-semibold mb-2">Pay Premium</h3>
              <p className="text-sm text-white/50">Get an instant quote. Pay premium in USDC. Policy activates immediately.</p>
            </div>
            <div className="card-hover text-center">
              <div className="w-12 h-12 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-amber-500/20 to-amber-600/10 border border-amber-500/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              </div>
              <h3 className="font-semibold mb-2">Automatic Payout</h3>
              <p className="text-sm text-white/50">Oracle records daily rainfall. If index triggers, payout is instant. No claims process.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Protocol features */}
      <div className="border-t border-white/5 py-16">
        <div className="max-w-5xl mx-auto px-6">
          <h2 className="text-2xl sm:text-3xl font-semibold text-center mb-10">Protocol Security</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-stagger">
            <div className="flex items-start gap-4 card-hover">
              <div className="w-10 h-10 shrink-0 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              </div>
              <div>
                <div className="font-medium text-sm mb-0.5">Checked Arithmetic</div>
                <div className="text-xs text-white/40">No integer overflows. All math uses checked operations.</div>
              </div>
            </div>
            <div className="flex items-start gap-4 card-hover">
              <div className="w-10 h-10 shrink-0 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              </div>
              <div>
                <div className="font-medium text-sm mb-0.5">Reentrancy Guard</div>
                <div className="text-xs text-white/40">Prevents flash loan attacks via instruction introspection.</div>
              </div>
            </div>
            <div className="flex items-start gap-4 card-hover">
              <div className="w-10 h-10 shrink-0 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              </div>
              <div>
                <div className="font-medium text-sm mb-0.5">Circuit Breaker</div>
                <div className="text-xs text-white/40">Auto-halts at 90% pool utilization to protect LPs.</div>
              </div>
            </div>
            <div className="flex items-start gap-4 card-hover">
              <div className="w-10 h-10 shrink-0 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              </div>
              <div>
                <div className="font-medium text-sm mb-0.5">7-Day Timelock</div>
                <div className="text-xs text-white/40">Admin actions require multisig + timelock delay.</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-white/5 py-10">
        <div className="max-w-5xl mx-auto px-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-lg flex items-center justify-center">
                <span className="font-bold text-xs text-white">N</span>
              </div>
              <span className="font-semibold text-sm text-white/60">Nimbus Protocol</span>
            </div>
            <div className="flex items-center gap-6 text-xs text-white/30">
              <span>Built on Solana</span>
              <span>OWASP Audited</span>
              <span>Open Source</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
