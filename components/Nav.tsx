'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useWallet, useConnection } from '@solana/wallet-adapter-react'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import { useEffect, useState } from 'react'
import { LAMPORTS_PER_SOL } from '@solana/web3.js'

const NAV_LINKS = [
  { href: '/buy', label: 'Buy Cover' },
  { href: '/portfolio', label: 'Portfolio' },
  { href: '/pools', label: 'Underwrite' },
  { href: '/settle', label: 'Settle' },
  { href: '/governance', label: 'Governance' },
]

export default function Nav() {
  const pathname = usePathname()
  const { publicKey, connected } = useWallet()
  const { connection } = useConnection()
  const [usdcBalance, setUsdcBalance] = useState<number | null>(null)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    if (!publicKey || !connected) {
      setUsdcBalance(null)
      return
    }

    const fetchBalance = async () => {
      try {
        // Fetch USDC token accounts for this wallet
        const tokenAccounts = await connection.getParsedTokenAccountsByOwner(publicKey, {
          programId: new (await import('@solana/web3.js')).PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
        })
        // Find USDC (6 decimals, well-known mint on devnet)
        const usdcAccount = tokenAccounts.value.find(
          (ta) => ta.account.data.parsed.info.mint === 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v' ||
                  ta.account.data.parsed.info.tokenAmount.decimals === 6
        )
        if (usdcAccount) {
          setUsdcBalance(usdcAccount.account.data.parsed.info.tokenAmount.uiAmount)
        } else {
          setUsdcBalance(0)
        }
      } catch {
        setUsdcBalance(null)
      }
    }

    fetchBalance()
    const interval = setInterval(fetchBalance, 15_000)
    return () => clearInterval(interval)
  }, [publicKey, connected, connection])

  return (
    <nav className="sticky top-0 z-50 border-b border-white/5 bg-zinc-950/80 backdrop-blur-xl" role="navigation" aria-label="Main navigation">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group" aria-label="Nimbus Home">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20 group-hover:shadow-blue-500/40 transition-all duration-200 group-hover:scale-105">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
            </svg>
          </div>
          <div>
            <div className="font-semibold text-lg tracking-tight text-white">Nimbus</div>
          </div>
        </Link>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-1">
          {NAV_LINKS.map((link) => {
            const active = pathname === link.href
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`px-4 py-2 text-sm rounded-lg transition-colors ${
                  active
                    ? 'bg-white/10 text-white font-medium'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
                aria-current={active ? 'page' : undefined}
              >
                {link.label}
              </Link>
            )
          })}
        </div>

        {/* Wallet area */}
        <div className="flex items-center gap-3">
          {connected && usdcBalance !== null && (
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-white/5 rounded-lg" aria-label={`USDC balance: ${usdcBalance.toFixed(2)}`}>
              <span className="text-xs text-white/50">USDC</span>
              <span className="text-sm font-mono text-white">{usdcBalance.toLocaleString('en-US', { maximumFractionDigits: 2 })}</span>
            </div>
          )}
          <WalletMultiButton />

          {/* Mobile menu button */}
          <button
            className="md:hidden p-2 text-white/60 hover:text-white"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle navigation menu"
            aria-expanded={mobileOpen}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {mobileOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-white/5 px-4 py-3 space-y-1">
          {NAV_LINKS.map((link) => {
            const active = pathname === link.href
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className={`block px-4 py-2.5 rounded-lg text-sm ${
                  active ? 'bg-white/10 text-white' : 'text-white/60 hover:bg-white/5'
                }`}
              >
                {link.label}
              </Link>
            )
          })}
        </div>
      )}
    </nav>
  )
}
