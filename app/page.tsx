'use client'

import { useState } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import Link from 'next/link'

export default function Home() {
  const { publicKey } = useWallet()

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Navbar */}
      <nav className="border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-600 rounded-2xl flex items-center justify-center">
              <span className="font-bold text-xl">C</span>
            </div>
            <div>
              <div className="font-semibold text-2xl tracking-tight">ClimaFi</div>
              <div className="text-[10px] text-white/50 -mt-1">PARAMETRIC COVER</div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/buy" className="px-5 py-2 text-sm hover:bg-white/5 rounded-xl">Buy Cover</Link>
            <Link href="/portfolio" className="px-5 py-2 text-sm hover:bg-white/5 rounded-xl">Portfolio</Link>
            <Link href="/pools" className="px-5 py-2 text-sm hover:bg-white/5 rounded-xl">Underwrite</Link>
            <Link href="/settle" className="px-5 py-2 text-sm hover:bg-white/5 rounded-xl">Settle</Link>
            <WalletMultiButton />
          </div>
        </div>
      </nav>

      {/* Hero */}
      <div className="max-w-4xl mx-auto px-6 pt-20 pb-24 text-center">
        <div className="inline-block px-4 py-1 rounded-full bg-white/5 text-xs tracking-[3px] mb-6">
          SOLANA • USDC • PARAMETRIC
        </div>
        <h1 className="text-7xl font-semibold tracking-tighter leading-none mb-4">
          Instant climate cover.<br />No paperwork.
        </h1>
        <p className="text-2xl text-white/60 max-w-md mx-auto">
          Buy drought or flood protection on rainfall. 
          Automatic payout when the index triggers.
        </p>

        <div className="flex gap-4 justify-center mt-10">
          <Link href="/buy" className="btn-primary text-lg px-10 py-4">Get Protected</Link>
          <Link href="/pools" className="px-8 py-4 border border-white/30 hover:bg-white/5 rounded-2xl text-lg">Provide Liquidity</Link>
        </div>
      </div>

      {/* Trust bar */}
      <div className="border-t border-white/10 py-8">
        <div className="max-w-5xl mx-auto px-6 text-center text-sm text-white/50">
          Deterministic daily oracle snapshots • Ed25519 signed quotes • Automatic settlement
        </div>
      </div>
    </div>
  )
}