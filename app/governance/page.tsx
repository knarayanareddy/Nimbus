'use client'

import { useState } from 'react'
import { useWallet, useConnection } from '@solana/wallet-adapter-react'
import { PublicKey } from '@solana/web3.js'
import { BN } from '@coral-xyz/anchor'
import Nav from '../../components/Nav'
import ErrorBoundary from '../../components/ErrorBoundary'
import { Skeleton } from '../../components/LoadingSkeleton'
import { PROGRAM_ID } from '../../lib/climafi'

const MULTISIG_SEED = 'multisig'
const MAX_AUTHORITIES = 7

interface MultisigState {
  threshold: number
  numAuthorities: number
  authorities: string[]
  proposalNonce: number
}

export default function GovernancePage() {
  const { publicKey, connected } = useWallet()
  const { connection } = useConnection()
  const [multisig, setMultisig] = useState<MultisigState | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const fetchMultisig = async () => {
    setLoading(true)
    setError('')
    try {
      const [multisigPda] = PublicKey.findProgramAddressSync(
        [Buffer.from(MULTISIG_SEED)],
        PROGRAM_ID
      )
      const account = await connection.getAccountInfo(multisigPda)
      if (!account) {
        setError('Multisig not initialized. Admin must call initialize_multisig first.')
        setLoading(false)
        return
      }

      const data = account.data
      let offset = 8 // discriminator
      const threshold = data[offset]; offset += 1
      const numAuthorities = data[offset]; offset += 1
      const authorities: string[] = []
      for (let i = 0; i < MAX_AUTHORITIES; i++) {
        const key = new PublicKey(data.slice(offset, offset + 32))
        offset += 32
        if (i < numAuthorities) {
          authorities.push(key.toBase58())
        }
      }
      const proposalNonce = new BN(data.slice(offset, offset + 8), 'le').toNumber()

      setMultisig({ threshold, numAuthorities, authorities, proposalNonce })
    } catch (err: any) {
      setError(err.message || 'Failed to fetch multisig state')
    } finally {
      setLoading(false)
    }
  }

  const isAuthority = multisig && publicKey ? multisig.authorities.includes(publicKey.toBase58()) : false

  return (
    <div className="min-h-screen">
      <Nav />
      <ErrorBoundary>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
          <h1 className="text-3xl sm:text-4xl font-semibold mb-2">Governance</h1>
          <p className="text-white/50 text-sm mb-8">Multisig-controlled protocol administration with M-of-N approval.</p>

          {!multisig && !loading && (
            <div className="card text-center py-8">
              <p className="text-white/50 mb-4">Load on-chain governance state to view configuration and proposals.</p>
              <button onClick={fetchMultisig} className="btn-primary px-6 py-2.5 text-sm">
                Load Governance State
              </button>
            </div>
          )}

          {loading && (
            <div className="card space-y-4">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          )}

          {error && (
            <div className="card bg-amber-500/5 border-amber-500/20 text-amber-300 text-sm" role="alert">
              {error}
            </div>
          )}

          {multisig && (
            <div className="space-y-6 animate-in">
              {/* Config card */}
              <div className="card">
                <h2 className="font-semibold text-lg mb-4">Multisig Configuration</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm mb-4">
                  <div>
                    <div className="text-white/40 text-xs">Threshold</div>
                    <div className="font-mono text-lg">{multisig.threshold}/{multisig.numAuthorities}</div>
                  </div>
                  <div>
                    <div className="text-white/40 text-xs">Proposals Created</div>
                    <div className="font-mono text-lg">{multisig.proposalNonce}</div>
                  </div>
                  <div>
                    <div className="text-white/40 text-xs">Your Status</div>
                    <div className={`text-sm font-medium ${isAuthority ? 'text-emerald-400' : 'text-white/50'}`}>
                      {!connected ? 'Not connected' : isAuthority ? 'Authority' : 'Not authority'}
                    </div>
                  </div>
                </div>

                <div className="border-t border-white/5 pt-4">
                  <div className="text-xs text-white/40 mb-2">Authorities</div>
                  <div className="space-y-1.5">
                    {multisig.authorities.map((auth, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs">
                        <div className="w-5 h-5 rounded-full bg-white/5 flex items-center justify-center text-white/50 font-mono">
                          {i + 1}
                        </div>
                        <code className="font-mono text-white/70 flex-1 truncate">{auth}</code>
                        {publicKey && auth === publicKey.toBase58() && (
                          <span className="text-xs text-blue-400">(you)</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Actions info */}
              <div className="card">
                <h2 className="font-semibold text-lg mb-3">Available Operations</h2>
                <div className="space-y-3 text-sm text-white/60">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                    <span>Transfer Admin</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                    <span>Update Quote Signer</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                    <span>Update Oracle Authority</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                    <span>Set Protocol Paused</span>
                  </div>
                </div>
                <p className="text-xs text-white/30 mt-4">
                  Proposals expire after 7 days. {multisig.threshold} approval(s) required to execute.
                </p>
              </div>

              <button onClick={fetchMultisig} className="btn-secondary w-full text-sm py-2.5">
                Refresh State
              </button>
            </div>
          )}
        </div>
      </ErrorBoundary>
    </div>
  )
}
