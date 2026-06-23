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

const PERIL_ICONS: Record<string, JSX.Element> = {
  Rainfall: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 19v2m4-2v2m4-2v2" />
    </svg>
  ),
  Temperature: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9V3m0 0L9.5 5.5M12 3l2.5 2.5M12 21a4 4 0 100-8 4 4 0 000 8zm0 0V9" />
    </svg>
  ),
  'Wind Speed': (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.59 4.59A2 2 0 1111 8H2m10.59 11.41A2 2 0 1014 16H2m15.73-8.27A2.5 2.5 0 1119.5 12H2" />
    </svg>
  ),
}

const PERIL_COLORS: Record<string, string> = {
  Rainfall: 'from-blue-500/20 to-blue-600/10 border-blue-500/20 text-blue-400',
  Temperature: 'from-orange-500/20 to-orange-600/10 border-orange-500/20 text-orange-400',
  'Wind Speed': 'from-cyan-500/20 to-cyan-600/10 border-cyan-500/20 text-cyan-400',
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
  const [confirmAction, setConfirmAction] = useState<{ type: 'deposit' | 'withdraw'; poolId: number; amount: string } | null>(null)
  const [usdcBalance, setUsdcBalance] = useState<number>(0)

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

  // Fetch user's USDC balance
  useEffect(() => {
    if (!publicKey || !connected) { setUsdcBalance(0); return }
    const fetchBalance = async () => {
      try {
        const usdcAta = await getAssociatedTokenAddress(USDC_MINT, publicKey)
        const bal = await connection.getTokenAccountBalance(usdcAta)
        setUsdcBalance(Number(bal.value.amount))
      } catch { setUsdcBalance(0) }
    }
    fetchBalance()
  }, [publicKey, connected, connection])

  const initiateDeposit = (poolId: number) => {
    const amount = depositAmounts[poolId]
    if (!amount || Number(amount) <= 0) return
    setConfirmAction({ type: 'deposit', poolId, amount })
  }

  const initiateWithdraw = (poolId: number) => {
    const amount = withdrawAmounts[poolId]
    if (!amount || Number(amount) <= 0) return
    setConfirmAction({ type: 'withdraw', poolId, amount })
  }

  const executeConfirmedAction = async () => {
    if (!publicKey || !confirmAction) return
    const { type, poolId, amount } = confirmAction
    setConfirmAction(null)
    setActivePool(poolId)

    if (type === 'deposit') {
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
    } else {
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
              <div key={id} className="card-hover animate-in">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br border flex items-center justify-center ${PERIL_COLORS[pool.peril] || 'from-white/10 to-white/5 border-white/10 text-white/40'}`}>
                      {PERIL_ICONS[pool.peril] || <span className="text-xs">?</span>}
                    </div>
                    <div>
                      <div className="font-semibold text-lg">{pool.peril}</div>
                      <div className="text-xs text-white/40">Pool #{id}</div>
                    </div>
                  </div>
                  <div className="text-xs font-medium px-2.5 py-1 bg-emerald-500/10 text-emerald-400 rounded-full">
                    LIVE
                  </div>
                </div>

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

                {pool.warnings.length > 0 && (
                  <div className="mb-3 p-2 rounded-lg bg-amber-500/5 border border-amber-500/10">
                    {pool.warnings.map((w, i) => (
                      <div key={i} className="text-xs text-amber-400 flex items-center gap-1.5">
                        <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                        {w}
                      </div>
                    ))}
                  </div>
                )}

                {connected ? (
                  <div className="space-y-2 border-t border-white/5 pt-3">
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <input
                          type="number"
                          placeholder="USDC amount"
                          value={depositAmounts[id] || ''}
                          onChange={e => setDepositAmounts(prev => ({ ...prev, [id]: e.target.value }))}
                          className="input w-full text-sm py-2 pr-14"
                          min="0"
                          step="0.01"
                          aria-label={`Deposit amount for pool ${id}`}
                        />
                        <button
                          onClick={() => setDepositAmounts(prev => ({ ...prev, [id]: (usdcBalance / 1_000_000).toString() }))}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-blue-400 hover:text-blue-300 bg-blue-500/10 px-1.5 py-0.5 rounded"
                          aria-label="Set max USDC balance"
                        >
                          MAX
                        </button>
                      </div>
                      <button
                        onClick={() => initiateDeposit(id)}
                        disabled={activePool === id || !depositAmounts[id] || Number(depositAmounts[id]) <= 0}
                        className="btn-primary px-4 py-2 text-sm"
                      >
                        Deposit
                      </button>
                    </div>
                    {pool.lpBalance > 0 && (
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <input
                            type="number"
                            placeholder="LP amount"
                            value={withdrawAmounts[id] || ''}
                            onChange={e => setWithdrawAmounts(prev => ({ ...prev, [id]: e.target.value }))}
                            className="input w-full text-sm py-2 pr-14"
                            min="0"
                            step="0.01"
                            aria-label={`Withdraw amount for pool ${id}`}
                          />
                          <button
                            onClick={() => setWithdrawAmounts(prev => ({ ...prev, [id]: (pool.lpBalance / 1_000_000).toString() }))}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-blue-400 hover:text-blue-300 bg-blue-500/10 px-1.5 py-0.5 rounded"
                            aria-label="Set max LP balance"
                          >
                            MAX
                          </button>
                        </div>
                        <button
                          onClick={() => initiateWithdraw(id)}
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

          {/* Confirmation Modal */}
          {confirmAction && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Confirm transaction">
              <div className="card max-w-md w-full mx-4 animate-scale-in">
                <h2 className="text-xl font-semibold mb-4">
                  Confirm {confirmAction.type === 'deposit' ? 'Deposit' : 'Withdrawal'}
                </h2>
                <div className="space-y-3 text-sm mb-6">
                  <div className="flex justify-between">
                    <span className="text-white/50">Action</span>
                    <span className="capitalize">{confirmAction.type}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/50">Pool</span>
                    <span className="font-mono">#{confirmAction.poolId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/50">Amount</span>
                    <span className="font-mono">{confirmAction.amount} {confirmAction.type === 'deposit' ? 'USDC' : 'LP'}</span>
                  </div>
                </div>
                <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-3 text-xs text-amber-200 mb-6">
                  {confirmAction.type === 'deposit'
                    ? 'Your USDC will be deposited into the pool vault. You will receive LP tokens proportional to your share.'
                    : 'Your LP tokens will be burned. USDC will be returned subject to locked capital constraints.'}
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setConfirmAction(null)} className="btn-secondary flex-1">
                    Cancel
                  </button>
                  <button onClick={executeConfirmedAction} className="btn-primary flex-1">
                    Confirm &amp; Sign
                  </button>
                </div>
              </div>
            </div>
          )}

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
