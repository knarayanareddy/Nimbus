'use client'

import { useWallet } from '@solana/wallet-adapter-react'
import { useEffect, useState } from 'react'
import { Connection, PublicKey } from '@solana/web3.js'

export default function Portfolio() {
  const { publicKey } = useWallet()
  const [policies, setPolicies] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!publicKey) return

    const fetchPolicies = async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/policies/${publicKey.toBase58()}`)
        const data = await res.json()
        setPolicies(data)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    fetchPolicies()
  }, [publicKey])

  if (!publicKey) return <div className="p-8">Connect wallet to view policies.</div>

  return (
    <div className="max-w-4xl mx-auto p-8">
      <h1 className="text-4xl font-semibold mb-8">My Policies</h1>

      {loading && <div>Loading policies...</div>}

      <div className="space-y-4">
        {policies.length === 0 && !loading && (
          <div className="text-white/60">No policies found.</div>
        )}

        {policies.map((p, index) => (
          <div key={index} className="card flex justify-between items-center">
            <div>
              <div className="font-mono text-sm">#{p.policy_id}</div>
              <div className="font-semibold">{p.region_id}</div>
            </div>
            <div className="text-right">
              <div className={`text-xs px-3 py-0.5 inline rounded-full ${p.triggered ? 'bg-emerald-500/10 text-emerald-400' : 'bg-blue-500/10 text-blue-400'}`}>
                {p.status}
              </div>
              <div className="font-mono mt-1">${p.payout_amount / 1_000_000} payout</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}