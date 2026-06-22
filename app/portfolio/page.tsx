'use client'

import { useWallet, useConnection } from '@solana/wallet-adapter-react'
import { useEffect, useState, useCallback } from 'react'
import { PublicKey } from '@solana/web3.js'
import { BN } from '@coral-xyz/anchor'
import Nav from '../../components/Nav'
import ErrorBoundary from '../../components/ErrorBoundary'
import { PolicySkeleton } from '../../components/LoadingSkeleton'
import { PROGRAM_ID } from '../../lib/climafi'
import Link from 'next/link'

const STATUSES: Record<number, { label: string; color: string }> = {
  0: { label: 'Active', color: 'bg-blue-500/10 text-blue-400' },
  1: { label: 'Cancelled', color: 'bg-zinc-500/10 text-zinc-400' },
  2: { label: 'Settled (Paid)', color: 'bg-emerald-500/10 text-emerald-400' },
  3: { label: 'Settled (Expired)', color: 'bg-amber-500/10 text-amber-400' },
}

const PERILS: Record<number, string> = { 0: 'Rainfall', 1: 'Temperature', 2: 'Wind' }
const DIRECTIONS: Record<number, string> = { 0: 'Drought', 1: 'Flood' }

interface PolicyData {
  pubkey: PublicKey
  policyId: number
  poolId: number
  regionId: number
  peril: number
  windowStartUnix: number
  windowEndUnix: number
  direction: number
  threshold: number
  payoutAmount: number
  premiumAmount: number
  status: number
  triggered: boolean
}

export default function Portfolio() {
  const { publicKey, connected } = useWallet()
  const { connection } = useConnection()
  const [policies, setPolicies] = useState<PolicyData[]>([])
  const [loading, setLoading] = useState(false)

  const fetchPolicies = useCallback(async () => {
    if (!publicKey) return
    setLoading(true)
    try {
      // Fetch all Policy accounts owned by this program where owner matches wallet
      const accounts = await connection.getProgramAccounts(PROGRAM_ID, {
        filters: [
          { dataSize: 8 + 8 + 32 + 8 + 32 + 8 + 1 + 8 + 8 + 1 + 1 + 8 + 8 + 8 + 1 + 8 + 1 + 8 }, // Policy account size
          { memcmp: { offset: 16, bytes: publicKey.toBase58() } }, // owner field at offset 8(disc) + 8(policy_id)
        ],
      })

      const parsed: PolicyData[] = accounts.map(({ pubkey, account }) => {
        const data = account.data
        let offset = 8 // skip discriminator
        const policyId = new BN(data.slice(offset, offset + 8), 'le').toNumber(); offset += 8
        offset += 32 // owner
        const poolId = new BN(data.slice(offset, offset + 8), 'le').toNumber(); offset += 8
        offset += 32 // pool pubkey
        const regionId = new BN(data.slice(offset, offset + 8), 'le').toNumber(); offset += 8
        const peril = data[offset]; offset += 1
        const windowStartUnix = new BN(data.slice(offset, offset + 8), 'le').toNumber(); offset += 8
        const windowEndUnix = new BN(data.slice(offset, offset + 8), 'le').toNumber(); offset += 8
        offset += 1 // indexMethod
        const direction = data[offset]; offset += 1
        const threshold = new BN(data.slice(offset, offset + 8), 'le').toNumber(); offset += 8
        const payoutAmount = new BN(data.slice(offset, offset + 8), 'le').toNumber(); offset += 8
        const premiumAmount = new BN(data.slice(offset, offset + 8), 'le').toNumber(); offset += 8
        const status = data[offset]; offset += 1
        offset += 8 // observedValue
        const triggered = data[offset] === 1

        return { pubkey, policyId, poolId, regionId, peril, windowStartUnix, windowEndUnix, direction, threshold, payoutAmount, premiumAmount, status, triggered }
      })

      parsed.sort((a, b) => b.policyId - a.policyId) // newest first
      setPolicies(parsed)
    } catch (err) {
      console.error('Failed to fetch policies:', err)
    } finally {
      setLoading(false)
    }
  }, [publicKey, connection])

  useEffect(() => {
    fetchPolicies()
  }, [fetchPolicies])

  const formatUsdc = (u: number) => (u / 1_000_000).toFixed(2)
  const formatDate = (unix: number) => new Date(unix * 1000).toLocaleDateString()
  const isSettleable = (p: PolicyData) => p.status === 0 && Date.now() / 1000 >= p.windowEndUnix

  return (
    <div className="min-h-screen">
      <Nav />
      <ErrorBoundary>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl sm:text-4xl font-semibold">My Policies</h1>
              <p className="text-white/50 text-sm mt-1">All policies owned by your connected wallet</p>
            </div>
            <Link href="/buy" className="btn-primary text-sm px-5 py-2.5">
              Buy New
            </Link>
          </div>

          {!connected && (
            <div className="card text-center py-12">
              <div className="text-white/40 text-lg mb-2">Connect your wallet</div>
              <p className="text-white/30 text-sm">to view your insurance policies</p>
            </div>
          )}

          {connected && loading && (
            <div className="space-y-4">
              <PolicySkeleton />
              <PolicySkeleton />
              <PolicySkeleton />
            </div>
          )}

          {connected && !loading && policies.length === 0 && (
            <div className="card text-center py-12">
              <div className="text-white/40 text-lg mb-2">No policies found</div>
              <p className="text-white/30 text-sm mb-4">You haven&apos;t purchased any coverage yet.</p>
              <Link href="/buy" className="btn-primary text-sm px-6 py-2.5 inline-block">
                Get Your First Policy
              </Link>
            </div>
          )}

          {connected && !loading && policies.length > 0 && (
            <div className="space-y-3">
              {policies.map((p) => {
                const statusInfo = STATUSES[p.status] || { label: 'Unknown', color: 'bg-zinc-500/10 text-zinc-400' }
                return (
                  <div key={p.pubkey.toBase58()} className="card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <span className="font-mono text-sm text-white/50">#{p.policyId}</span>
                        <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${statusInfo.color}`}>
                          {statusInfo.label}
                        </span>
                        {isSettleable(p) && (
                          <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 animate-pulse">
                            Ready to Settle
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-white/70">
                        {PERILS[p.peril] || 'Unknown'} &bull; {DIRECTIONS[p.direction] || '?'} &bull; Threshold: {p.threshold}mm
                      </div>
                      <div className="text-xs text-white/40 mt-1">
                        {formatDate(p.windowStartUnix)} &mdash; {formatDate(p.windowEndUnix)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono text-lg">${formatUsdc(p.payoutAmount)}</div>
                      <div className="text-xs text-white/40">Premium: ${formatUsdc(p.premiumAmount)}</div>
                      {isSettleable(p) && (
                        <Link href={`/settle?id=${p.policyId}`} className="text-xs text-blue-400 hover:text-blue-300 mt-1 inline-block">
                          Settle now &rarr;
                        </Link>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </ErrorBoundary>
    </div>
  )
}
