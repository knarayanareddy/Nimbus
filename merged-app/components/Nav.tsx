'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useWallet, useConnection } from '@solana/wallet-adapter-react'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import { useEffect, useState } from 'react'
import { CloudRain, Menu, X, Shield, BarChart3, Droplets, Scale, Vote, Zap } from 'lucide-react'

const NAV_LINKS = [
  { href: '/buy', label: 'Buy Cover', icon: Shield },
  { href: '/portfolio', label: 'Portfolio', icon: BarChart3 },
  { href: '/pools', label: 'Underwrite', icon: Droplets },
  { href: '/settle', label: 'Settle', icon: Scale },
  { href: '/governance', label: 'Governance', icon: Vote },
]

export default function Nav() {
  const pathname = usePathname()
  const { publicKey, connected } = useWallet()
  const { connection } = useConnection()
  const [usdcBalance, setUsdcBalance] = useState<number | null>(null)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    if (!publicKey || !connected) {
      setUsdcBalance(null)
      return
    }

    const fetchBalance = async () => {
      try {
        const tokenAccounts = await connection.getParsedTokenAccountsByOwner(publicKey, {
          programId: new (await import('@solana/web3.js')).PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
        })
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
    <>
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? 'bg-[#0f1117]/95 backdrop-blur-xl border-b border-white/5'
            : 'bg-transparent'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="relative w-8 h-8 flex items-center justify-center">
                <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-nimbus-500 to-accent-cyan opacity-90 group-hover:opacity-100 transition-opacity" />
                <CloudRain size={16} className="relative text-white" />
              </div>
              <span
                className="font-display text-[1.1rem] tracking-tight text-white font-bold"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                Nimbus
              </span>
              <span className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[0.6rem] font-semibold tracking-widest uppercase bg-nimbus-500/15 text-nimbus-300 border border-nimbus-400/30">
                <Zap size={8} />
                Solana
              </span>
            </Link>

            {/* Desktop Nav Links */}
            <div className="hidden md:flex items-center gap-1">
              {NAV_LINKS.map((link) => {
                const active = pathname === link.href
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
                      active
                        ? 'text-white bg-white/8'
                        : 'text-white/55 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    {link.label}
                  </Link>
                )
              })}
            </div>

            {/* Wallet info & Button */}
            <div className="flex items-center gap-3">
              {connected && usdcBalance !== null && (
                <div className="hidden sm:flex items-center gap-2 px-3 py-2 bg-surface-2 border border-white/[0.06] rounded-xl">
                  <span className="text-[10px] font-medium text-white/40 uppercase tracking-wider">USDC</span>
                  <span className="text-sm font-mono font-medium text-white tabular-nums">
                    {usdcBalance.toLocaleString('en-US', { maximumFractionDigits: 2 })}
                  </span>
                </div>
              )}
              <WalletMultiButton />

              {/* Mobile menu button */}
              <button
                onClick={() => setMobileOpen(!mobileOpen)}
                className="md:hidden p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/5 transition-colors"
              >
                {mobileOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div
            className="md:hidden border-t"
            style={{ background: '#0f1117', borderColor: 'rgba(255,255,255,0.06)' }}
          >
            <div className="px-4 py-3 space-y-1">
              {NAV_LINKS.map((link) => {
                const active = pathname === link.href
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileOpen(false)}
                    className={`w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                      active
                        ? 'bg-white/8 text-white'
                        : 'text-white/55 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    {link.label}
                  </Link>
                )
              })}
            </div>
          </div>
        )}
      </nav>
    </>
  )
}
