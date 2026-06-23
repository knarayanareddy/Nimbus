'use client'

import { useState, useEffect, useCallback } from 'react'
import { useWallet, useConnection } from '@solana/wallet-adapter-react'
import { PublicKey } from '@solana/web3.js'
import Nav from '../../components/Nav'
import ErrorBoundary from '../../components/ErrorBoundary'
import TransactionStatus, { TxState } from '../../components/TransactionStatus'
import { CardSkeleton } from '../../components/LoadingSkeleton'
import {
  createDepositTransaction,
  createWithdrawTransaction,
  getPoolPda,
  getLpMintPda,
  PROGRAM_ID,
  USDC_MINT,
} from '../../lib/climafi'
import { deserializePool, validatePoolInvariants, DeserializationError } from '../../lib/deserialize'
import { getAssociatedTokenAddress } from '@solana/spl-token'

interface PoolData {
  poolId: number
  peril: string
  capital: number
  locked: number
  utilization: number
  ltvLimitBps: number
  lpBalance: number
  warnings: string[]
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
  const [loading, setLoading] = useState(true)
  const [txState, setTxState] = useState<TxState>('idle')
  const [txMessage, setTxMessage] = useState('')
  const [txSig, setTxSig] = useState('')
  const [activePool, setActivePool] = useState<number | null>(null)

  const fetchPoolData = useCallback(async () => {
    const poolMap = new Map<number, PoolData>()

    for (const poolId of POOL_IDS) {
      try {
        const poolPda = getPoolPda(poolId)
        const accountInfo = await connection.getAccountInfo(poolPda)
        if (!accountInfo) continue

        const poolAccount = deserializePool(accountInfo.data, accountInfo.owner)
        const id = poolAccount.poolId
        const perilByte = poolAccount.peril
        const ltvLimitBps = poolAccount.ltvLimitBps
        const capital = poolAccount.capital
        const locked = poolAccount.locked
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

        const warnings = validatePoolInvariants(poolAccount)
        poolMap.set(poolId, {
          poolId: id,
          peril: PERIL_NAMES[perilByte] || `Unknown (${perilByte})`,
          capital,
          locked,
          utilization,
          ltvLimitBps,
          lpBalance,
          warnings,
        })
      } catch {
        // Pool doesn't exist on-chain
      }
    }

    setPools(poolMap)
    setLoading(false)
  }, [connection, publicKey])

  useEffect(() => {
    fetchPoolData()
    const interval = setInterval(fetchPoolData, 10_000)
    return () => clearInterval(interval)
  }, [fetchPoolData])

  const handleDeposit = async (poolId: number) => {
    const amount = depositAmounts[poolId]
    if (!publicKey || !amount || Number(amount) <= 0) return

    setActivePool(poolId)
    setTxState('signing')
    setTxMessage('Approve deposit in wallet')
    try {
      const amountBaseUnits = Math.floor(Number(amount) * 1_000_000)
      const tx = await createDepositTransaction(connection, { publicKey }, poolId, amountBaseUnits)
      setTxState('confirming')
      setTxMessage('Confirming deposit...')
      const sig = await sendTransaction(tx, connection)
      await connection.confirmTransaction(sig, 'confirmed')
      setTxSig(sig)
      setTxState('success')
      setTxMessage(`Deposited ${amount} USDC to Pool #${poolId}`)
      setDepositAmounts(prev => ({ ...prev, [poolId]: '' }))
      await fetchPoolData()
    } catch (err: any) {
      setTxState('error')
      setTxMessage(err.message || 'Deposit failed')
    } finally {
      setActivePool(null)
    }
  }

  const handleWithdraw = async (poolId: number) => {
    const amount = withdrawAmounts[poolId]
    if (!publicKey || !amount || Number(amount) <= 0) return

    setActivePool(poolId)
    setTxState('signing')
    setTxMessage('Approve withdrawal in wallet')
    try {
      const lpBaseUnits = Math.floor(Number(amount) * 1_000_000)
      const tx = await createWithdrawTransaction(connection, { publicKey }, poolId, lpBaseUnits)
      setTxState('confirming')
      setTxMessage('Confirming withdrawal...')
      const sig = await sendTransaction(tx, connection)
      await connection.confirmTransaction(sig, 'confirmed')
      setTxSig(sig)
      setTxState('success')
      setTxMessage(`Withdrew ${amount} LP from Pool #${poolId}`)
      setWithdrawAmounts(prev => ({ ...prev, [poolId]: '' }))
      await fetchPoolData()
    } catch (err: any) {
      setTxState('error')
      setTxMessage(err.message || 'Withdrawal failed')
    } finally {
      setActivePool(null)
    }
  }

  const formatUsdc = (baseUnits: number) =>
    (baseUnits / 1_000_000).toLocaleString('en-US', { maximumFractionDigits: 2 })

  const poolEntries = Array.from(pools.entries()).sort((a, b) => a[0] - b[0])

  return (
    <div className="min-h-screen">
      <Nav />
      <ErrorBoundary>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
          <div className="mb-8">
            <h1 className="text-3xl sm:text-4xl font-semibold">Underwriter Pools</h1>
            <p className="text-white/50 text-sm mt-1">Deposit USDC to earn premiums from policyholders</p>
          </div>

          <TransactionStatus state={txState} message={txMessage} txSignature={txSig} onDismiss={() => setTxState('idle')} />
          {txState !== 'idle' && <div className="mb-6" />}

          {loading && (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              <CardSkeleton />
              <CardSkeleton />
              <CardSkeleton />
            </div>
          )}

          {!loading && poolEntries.length === 0 && (
            <div className="card text-center py-12">
              <div className="text-white/40 text-lg mb-2">No pools deployed yet</div>
              <p className="text-white/30 text-sm">Pools will appear once created by protocol admin.</p>
            </div>
          )}

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {poolEntries.map(([id, pool]) => (
              <div key={id} className="card">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="font-semibold text-lg">{pool.peril}</div>
                    <div className="text-xs text-white/40">Pool #{id}</div>
                  </div>
                  <div className="text-xs font-medium px-2.5 py-1 bg-emerald-500/10 text-emerald-400 rounded-full">
                    LIVE
                  </div>
                </div>

                {pool.warnings.length > 0 && (
                  <div className="mb-3 text-xs bg-amber-500/5 border border-amber-500/20 text-amber-300 rounded-lg p-2.5" role="alert">
                    {pool.warnings.map((w, i) => <div key={i}>{w}</div>)}
                  </div>
                )}

                {/* Utilization gauge */}
                <div className="mb-4">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-white/50">Utilization</span>
                    <span className={`font-mono ${pool.utilization > 80 ? 'text-amber-400' : 'text-white'}`}>
                      {pool.utilization}%
                    </span>
                  </div>
                  <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        pool.utilization > 90 ? 'bg-red-500' :
                        pool.utilization > 80 ? 'bg-amber-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${Math.min(pool.utilization, 100)}%` }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm mb-4">
                  <div>
                    <div className="text-white/40 text-xs">Capital</div>
                    <div className="font-mono">${formatUsdc(pool.capital)}</div>
                  </div>
                  <div>
                    <div className="text-white/40 text-xs">Locked</div>
                    <div className="font-mono">${formatUsdc(pool.locked)}</div>
                  </div>
                </div>

                <div className="text-xs text-white/30 mb-3">
                  LTV Limit: {pool.ltvLimitBps / 100}%
                  {connected && pool.lpBalance > 0 && (
                    <span className="ml-2">| Your LP: <span className="font-mono text-white/60">{formatUsdc(pool.lpBalance)}</span></span>
                  )}
                </div>

                {connected ? (
                  <div className="space-y-2 border-t border-white/5 pt-3">
                    <div className="flex gap-2">
                      <input
                        type="number"
                        placeholder="USDC amount"
                        value={depositAmounts[id] || ''}
                        onChange={e => setDepositAmounts(prev => ({ ...prev, [id]: e.target.value }))}
                        className="input flex-1 text-sm py-2"
                        min="0"
                        step="0.01"
                        aria-label={`Deposit amount for pool ${id}`}
                      />
                      <button
                        onClick={() => handleDeposit(id)}
                        disabled={activePool === id || !depositAmounts[id] || Number(depositAmounts[id]) <= 0}
                        className="btn-primary px-4 py-2 text-sm"
                      >
                        Deposit
                      </button>
                    </div>
                    {pool.lpBalance > 0 && (
                      <div className="flex gap-2">
                        <input
                          type="number"
                          placeholder="LP amount"
                          value={withdrawAmounts[id] || ''}
                          onChange={e => setWithdrawAmounts(prev => ({ ...prev, [id]: e.target.value }))}
                          className="input flex-1 text-sm py-2"
                          min="0"
                          step="0.01"
                          aria-label={`Withdraw amount for pool ${id}`}
                        />
                        <button
                          onClick={() => handleWithdraw(id)}
                          disabled={activePool === id || !withdrawAmounts[id] || Number(withdrawAmounts[id]) <= 0}
                          className="btn-secondary px-4 py-2 text-sm"
                        >
                          Withdraw
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center text-white/30 text-xs py-3 border-t border-white/5">
                    Connect wallet to deposit
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Info section */}
          <div className="mt-10 card">
            <h2 className="font-semibold mb-3">How Underwriting Works</h2>
            <div className="grid sm:grid-cols-3 gap-4 text-sm text-white/60">
              <div>
                <div className="font-medium text-white mb-1">1. Deposit</div>
                <p>Deposit USDC into a pool vault. You receive LP tokens proportional to your share of the pool.</p>
              </div>
              <div>
                <div className="font-medium text-white mb-1">2. Earn</div>
                <p>Collect premiums from policyholders buying coverage. Returns scale with pool utilization.</p>
              </div>
              <div>
                <div className="font-medium text-white mb-1">3. Withdraw</div>
                <p>Burn LP tokens anytime to redeem USDC (subject to locked capital constraints).</p>
              </div>
            </div>
            <div className="mt-4 text-xs text-white/30 border-t border-white/5 pt-3">
              Circuit breaker activates at 90% utilization | LP tokens are 1:1 on first deposit, proportional thereafter
            </div>
          </div>
        </div>
      </ErrorBoundary>
    </div>
  )
}
