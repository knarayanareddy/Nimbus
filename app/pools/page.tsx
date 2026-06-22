'use client'

import { useState, useEffect, useCallback } from 'react'
import { useWallet, useConnection } from '@solana/wallet-adapter-react'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import { PublicKey } from '@solana/web3.js'
import { BN } from '@coral-xyz/anchor'
import {
  createDepositTransaction,
  createWithdrawTransaction,
  getPoolPda,
  getVaultAuthPda,
  getLpMintPda,
  PROGRAM_ID,
  USDC_MINT,
} from '../../lib/climafi'
import { getAssociatedTokenAddress } from '@solana/spl-token'

interface PoolData {
  poolId: number
  peril: string
  capital: number
  locked: number
  utilization: number
  ltvLimitBps: number
  lpBalance: number
}

const PERIL_NAMES: Record<number, string> = {
  0: 'Rainfall',
  1: 'Temperature',
  2: 'Wind Speed',
}

const POOL_IDS = [1, 2, 3]

export default function Pools() {
  const { publicKey, sendTransaction, connected } = useWallet()
  const { connection } = useConnection()

  const [pools, setPools] = useState<Map<number, PoolData>>(new Map())
  const [depositAmounts, setDepositAmounts] = useState<Record<number, string>>({})
  const [withdrawAmounts, setWithdrawAmounts] = useState<Record<number, string>>({})
  const [loading, setLoading] = useState<number | null>(null)
  const [txStatus, setTxStatus] = useState<string | null>(null)

  const fetchPoolData = useCallback(async () => {
    const poolMap = new Map<number, PoolData>()

    for (const poolId of POOL_IDS) {
      try {
        const poolPda = getPoolPda(poolId)
        const accountInfo = await connection.getAccountInfo(poolPda)

        if (!accountInfo) continue

        const data = accountInfo.data
        const id = new BN(data.slice(8, 16), 'le').toNumber()
        const perilByte = data[16]
        const ltvLimitBps = data.readUInt16LE(8 + 8 + 1 + 32 + 4)
        const capital = new BN(data.slice(8 + 8 + 1 + 32 + 4 + 2, 8 + 8 + 1 + 32 + 4 + 2 + 8), 'le').toNumber()
        const locked = new BN(data.slice(8 + 8 + 1 + 32 + 4 + 2 + 8, 8 + 8 + 1 + 32 + 4 + 2 + 8 + 8), 'le').toNumber()
        const utilization = capital > 0 ? Math.round((locked / capital) * 100) : 0

        let lpBalance = 0
        if (publicKey) {
          try {
            const lpMintPda = getLpMintPda(poolId)
            const lpAta = await getAssociatedTokenAddress(lpMintPda, publicKey)
            const lpAccount = await connection.getTokenAccountBalance(lpAta)
            lpBalance = Number(lpAccount.value.amount)
          } catch {
            lpBalance = 0
          }
        }

        poolMap.set(poolId, {
          poolId: id,
          peril: PERIL_NAMES[perilByte] || `Unknown (${perilByte})`,
          capital,
          locked,
          utilization,
          ltvLimitBps,
          lpBalance,
        })
      } catch {
        // Pool doesn't exist on-chain
      }
    }

    setPools(poolMap)
  }, [connection, publicKey])

  useEffect(() => {
    fetchPoolData()
    const interval = setInterval(fetchPoolData, 10_000)
    return () => clearInterval(interval)
  }, [fetchPoolData])

  const handleDeposit = async (poolId: number) => {
    const amount = depositAmounts[poolId]
    if (!publicKey || !amount) return

    setLoading(poolId)
    setTxStatus(null)
    try {
      const amountBaseUnits = Math.floor(Number(amount) * 1_000_000)
      const tx = await createDepositTransaction(connection, { publicKey }, poolId, amountBaseUnits)
      const sig = await sendTransaction(tx, connection)
      await connection.confirmTransaction(sig, 'confirmed')
      setTxStatus(`Deposited ${amount} USDC to Pool #${poolId} (tx: ${sig.slice(0, 8)}...)`)
      setDepositAmounts(prev => ({ ...prev, [poolId]: '' }))
      await fetchPoolData()
    } catch (err: any) {
      setTxStatus(`Deposit failed: ${err.message}`)
    } finally {
      setLoading(null)
    }
  }

  const handleWithdraw = async (poolId: number) => {
    const amount = withdrawAmounts[poolId]
    if (!publicKey || !amount) return

    setLoading(poolId)
    setTxStatus(null)
    try {
      const lpBaseUnits = Math.floor(Number(amount) * 1_000_000)
      const tx = await createWithdrawTransaction(connection, { publicKey }, poolId, lpBaseUnits)
      const sig = await sendTransaction(tx, connection)
      await connection.confirmTransaction(sig, 'confirmed')
      setTxStatus(`Withdrew ${amount} LP from Pool #${poolId} (tx: ${sig.slice(0, 8)}...)`)
      setWithdrawAmounts(prev => ({ ...prev, [poolId]: '' }))
      await fetchPoolData()
    } catch (err: any) {
      setTxStatus(`Withdraw failed: ${err.message}`)
    } finally {
      setLoading(null)
    }
  }

  const formatUsdc = (baseUnits: number) =>
    (baseUnits / 1_000_000).toLocaleString('en-US', { maximumFractionDigits: 2 })

  const poolEntries = Array.from(pools.entries()).sort((a, b) => a[0] - b[0])

  return (
    <div className="max-w-6xl mx-auto p-8">
      <div className="flex justify-between items-center mb-10">
        <h1 className="text-4xl font-semibold">Underwriter Pools</h1>
        <WalletMultiButton />
      </div>

      {txStatus && (
        <div className={`mb-6 text-sm p-3 rounded-lg ${
          txStatus.includes('failed') ? 'bg-red-500/10 text-red-400' : 'bg-emerald-500/10 text-emerald-400'
        }`}>
          {txStatus}
        </div>
      )}

      {poolEntries.length === 0 && (
        <div className="text-center text-white/50 py-16">
          No pools deployed on-chain yet. Pools will appear here once created by the admin.
        </div>
      )}

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {poolEntries.map(([id, pool]) => (
          <div key={id} className="card">
            <div className="flex justify-between mb-4">
              <div>
                <div className="font-semibold text-lg">{pool.peril} Pool #{id}</div>
              </div>
              <div className="text-emerald-400 text-xs font-medium px-3 py-1 bg-emerald-500/10 rounded-full">
                LIVE
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 text-sm mb-6">
              <div>
                <div className="text-white/50 text-xs">Capital</div>
                <div className="font-mono text-lg">${formatUsdc(pool.capital)}</div>
              </div>
              <div>
                <div className="text-white/50 text-xs">Locked</div>
                <div className="font-mono text-lg">${formatUsdc(pool.locked)}</div>
              </div>
              <div>
                <div className="text-white/50 text-xs">Utilization</div>
                <div className="font-mono text-lg">{pool.utilization}%</div>
              </div>
            </div>

            <div className="text-xs text-white/40 mb-2">
              LTV Limit: {pool.ltvLimitBps / 100}%
            </div>

            {connected && (
              <div className="text-xs text-white/60 mb-4">
                Your LP: <span className="font-mono text-white">{formatUsdc(pool.lpBalance)}</span>
              </div>
            )}

            {connected ? (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <input
                    type="number"
                    placeholder="USDC"
                    value={depositAmounts[id] || ''}
                    onChange={e => setDepositAmounts(prev => ({ ...prev, [id]: e.target.value }))}
                    className="input flex-1 text-sm"
                    min="0"
                    step="0.01"
                  />
                  <button
                    onClick={() => handleDeposit(id)}
                    disabled={loading === id || !depositAmounts[id]}
                    className="btn-primary px-4 text-sm"
                  >
                    {loading === id ? '...' : 'Deposit'}
                  </button>
                </div>
                <div className="flex gap-2">
                  <input
                    type="number"
                    placeholder="LP tokens"
                    value={withdrawAmounts[id] || ''}
                    onChange={e => setWithdrawAmounts(prev => ({ ...prev, [id]: e.target.value }))}
                    className="input flex-1 text-sm"
                    min="0"
                    step="0.01"
                  />
                  <button
                    onClick={() => handleWithdraw(id)}
                    disabled={loading === id || !withdrawAmounts[id]}
                    className="w-auto py-2 px-4 border border-white/20 rounded-xl text-sm"
                  >
                    {loading === id ? '...' : 'Withdraw'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center text-white/40 text-sm py-2">
                Connect wallet to interact
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-10 card text-sm text-white/70">
        <div className="font-semibold mb-3 text-white">How it works</div>
        <div className="space-y-2">
          <p>1. <strong>Deposit USDC</strong> into a pool vault. You receive LP tokens proportional to your share.</p>
          <p>2. <strong>Earn premiums</strong> from policyholders buying coverage against the pool.</p>
          <p>3. <strong>Withdraw anytime</strong> by burning LP tokens (subject to locked capital constraints).</p>
        </div>
        <div className="mt-4 text-xs text-white/40">
          Circuit Breaker: 90% utilization | LP tokens are 1:1 on first deposit, proportional thereafter
        </div>
      </div>
    </div>
  )
}
