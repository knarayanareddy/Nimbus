'use client'

import { useState, useEffect, useCallback } from 'react'
import { useWallet, useConnection } from '@solana/wallet-adapter-react'
import { useSearchParams } from 'next/navigation'
import { PublicKey, Transaction, TransactionInstruction } from '@solana/web3.js'
import { BN, Program, AnchorProvider } from '@coral-xyz/anchor'
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddress } from '@solana/spl-token'
import Nav from '../../components/Nav'
import ErrorBoundary from '../../components/ErrorBoundary'
import TransactionStatus, { TxState } from '../../components/TransactionStatus'
import { PolicySkeleton } from '../../components/LoadingSkeleton'
import {
  PROGRAM_ID,
  USDC_MINT,
  IDL,
  getConfigPda,
  getPoolPda,
  getVaultAuthPda,
  getPolicyPda,
  buildObservationAccountKeys,
} from '../../lib/climafi'

const INDEX_METHODS: Record<number, string> = { 0: 'Sum', 1: 'Mean', 2: 'Max' }
const DIRECTIONS: Record<number, string> = { 0: 'Drought (<=)', 1: 'Flood (>=)' }
const STATUSES: Record<number, { label: string; color: string }> = {
  0: { label: 'Active', color: 'bg-blue-500/10 text-blue-400' },
  1: { label: 'Cancelled', color: 'bg-zinc-500/10 text-zinc-400' },
  2: { label: 'Settled (Paid)', color: 'bg-emerald-500/10 text-emerald-400' },
  3: { label: 'Settled (Expired)', color: 'bg-amber-500/10 text-amber-400' },
}

interface PolicyInfo {
  policyId: number
  poolId: number
  regionId: number
  peril: number
  windowStartUnix: number
  windowEndUnix: number
  indexMethod: number
  direction: number
  threshold: number
  payoutAmount: number
  premiumAmount: number
  status: number
  observedValue: number
  triggered: boolean
  settledAtUnix: number
}

export default function SettlePage() {
  const { publicKey, sendTransaction, connected } = useWallet()
  const { connection } = useConnection()
  const searchParams = useSearchParams()

  const [policyIdInput, setPolicyIdInput] = useState(searchParams.get('id') || '')
  const [policy, setPolicy] = useState<PolicyInfo | null>(null)
  const [loading, setLoading] = useState(false)
  const [txState, setTxState] = useState<TxState>('idle')
  const [txMessage, setTxMessage] = useState('')
  const [txSig, setTxSig] = useState('')

  // Auto-discovery: find user's settleable policies
  const [settleablePolicies, setSettleablePolicies] = useState<PolicyInfo[]>([])
  const [discovering, setDiscovering] = useState(false)

  const discoverSettleable = useCallback(async () => {
    if (!publicKey) return
    setDiscovering(true)
    try {
      const accounts = await connection.getProgramAccounts(PROGRAM_ID, {
        filters: [
          { dataSize: 8 + 8 + 32 + 8 + 32 + 8 + 1 + 8 + 8 + 1 + 1 + 8 + 8 + 8 + 1 + 8 + 1 + 8 },
          { memcmp: { offset: 16, bytes: publicKey.toBase58() } },
        ],
      })

      const now = Date.now() / 1000
      const settleable: PolicyInfo[] = []

      for (const { account } of accounts) {
        const data = account.data
        let offset = 8
        const policyId = new BN(data.slice(offset, offset + 8), 'le').toNumber(); offset += 8
        offset += 32 // owner
        const poolId = new BN(data.slice(offset, offset + 8), 'le').toNumber(); offset += 8
        offset += 32 // pool pubkey
        const regionId = new BN(data.slice(offset, offset + 8), 'le').toNumber(); offset += 8
        const peril = data[offset]; offset += 1
        const windowStartUnix = new BN(data.slice(offset, offset + 8), 'le').toNumber(); offset += 8
        const windowEndUnix = new BN(data.slice(offset, offset + 8), 'le').toNumber(); offset += 8
        const indexMethod = data[offset]; offset += 1
        const direction = data[offset]; offset += 1
        const threshold = new BN(data.slice(offset, offset + 8), 'le').toNumber(); offset += 8
        const payoutAmount = new BN(data.slice(offset, offset + 8), 'le').toNumber(); offset += 8
        const premiumAmount = new BN(data.slice(offset, offset + 8), 'le').toNumber(); offset += 8
        const status = data[offset]; offset += 1
        const observedValue = new BN(data.slice(offset, offset + 8), 'le').toNumber(); offset += 8
        const triggered = data[offset] === 1; offset += 1
        const settledAtUnix = new BN(data.slice(offset, offset + 8), 'le').toNumber()

        if (status === 0 && now >= windowEndUnix) {
          settleable.push({ policyId, poolId, regionId, peril, windowStartUnix, windowEndUnix, indexMethod, direction, threshold, payoutAmount, premiumAmount, status, observedValue, triggered, settledAtUnix })
        }
      }

      settleable.sort((a, b) => a.windowEndUnix - b.windowEndUnix)
      setSettleablePolicies(settleable)
    } catch (err) {
      console.error('Discovery error:', err)
    } finally {
      setDiscovering(false)
    }
  }, [publicKey, connection])

  useEffect(() => {
    discoverSettleable()
  }, [discoverSettleable])

  // Auto-lookup if ID in URL
  useEffect(() => {
    if (searchParams.get('id')) {
      fetchPolicy()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const fetchPolicy = async () => {
    if (!policyIdInput) return
    setLoading(true)
    setTxState('idle')
    setPolicy(null)

    try {
      const policyId = parseInt(policyIdInput, 10)
      const policyPda = getPolicyPda(policyId)
      const accountInfo = await connection.getAccountInfo(policyPda)

      if (!accountInfo) {
        setTxState('error')
        setTxMessage('Policy not found on-chain')
        setLoading(false)
        return
      }

      const data = accountInfo.data
      let offset = 8
      const pid = new BN(data.slice(offset, offset + 8), 'le').toNumber(); offset += 8
      offset += 32
      const poolId = new BN(data.slice(offset, offset + 8), 'le').toNumber(); offset += 8
      offset += 32
      const regionId = new BN(data.slice(offset, offset + 8), 'le').toNumber(); offset += 8
      const peril = data[offset]; offset += 1
      const windowStartUnix = new BN(data.slice(offset, offset + 8), 'le').toNumber(); offset += 8
      const windowEndUnix = new BN(data.slice(offset, offset + 8), 'le').toNumber(); offset += 8
      const indexMethod = data[offset]; offset += 1
      const direction = data[offset]; offset += 1
      const threshold = new BN(data.slice(offset, offset + 8), 'le').toNumber(); offset += 8
      const payoutAmount = new BN(data.slice(offset, offset + 8), 'le').toNumber(); offset += 8
      const premiumAmount = new BN(data.slice(offset, offset + 8), 'le').toNumber(); offset += 8
      const status = data[offset]; offset += 1
      const observedValue = new BN(data.slice(offset, offset + 8), 'le').toNumber(); offset += 8
      const triggered = data[offset] === 1; offset += 1
      const settledAtUnix = new BN(data.slice(offset, offset + 8), 'le').toNumber()

      setPolicy({ policyId: pid, poolId, regionId, peril, windowStartUnix, windowEndUnix, indexMethod, direction, threshold, payoutAmount, premiumAmount, status, observedValue, triggered, settledAtUnix })
    } catch (err: any) {
      setTxState('error')
      setTxMessage(err.message || 'Failed to fetch policy')
    } finally {
      setLoading(false)
    }
  }

  const settlePolicy = async () => {
    if (!publicKey || !policy) return

    setTxState('signing')
    setTxMessage('Approve settlement in wallet')
    try {
      const provider = new AnchorProvider(connection, { publicKey } as any, {})
      const program = new Program(IDL as any, PROGRAM_ID, provider)

      const policyPda = getPolicyPda(policy.policyId)
      const configPda = getConfigPda()
      const poolPda = getPoolPda(policy.poolId)
      const vaultAuthPda = getVaultAuthPda(policy.poolId)
      const poolVaultUsdcAta = await getAssociatedTokenAddress(USDC_MINT, vaultAuthPda, true)
      const policyOwnerUsdcAta = await getAssociatedTokenAddress(USDC_MINT, publicKey)

      const obsKeys = buildObservationAccountKeys(
        policy.regionId,
        policy.peril,
        policy.windowStartUnix,
        policy.windowEndUnix,
      )

      const computeBudgetIx = new TransactionInstruction({
        programId: new PublicKey('ComputeBudget111111111111111111111111111111'),
        data: Buffer.from([2, ...new BN(400000).toArray('le', 4)]),
        keys: [],
      })

      const tx = new Transaction().add(computeBudgetIx)

      const settleTx = await program.methods
        .settlePolicy()
        .accounts({
          config: configPda,
          pool: poolPda,
          vaultAuth: vaultAuthPda,
          poolVaultUsdcAta,
          policy: policyPda,
          policyOwner: publicKey,
          policyOwnerUsdcAta,
          instructionsSysvar: new PublicKey('Sysvar1nstructions1111111111111111111111111'),
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .remainingAccounts(
          obsKeys.map(key => ({ pubkey: key, isSigner: false, isWritable: false }))
        )
        .transaction()

      tx.add(...settleTx.instructions)

      setTxState('confirming')
      setTxMessage('Confirming settlement...')
      const sig = await sendTransaction(tx, connection)
      await connection.confirmTransaction(sig, 'confirmed')
      setTxSig(sig)
      setTxState('success')
      setTxMessage('Policy settled successfully!')
      await fetchPolicy()
      await discoverSettleable()
    } catch (err: any) {
      setTxState('error')
      setTxMessage(err.message || 'Settlement failed')
    }
  }

  const formatUsdc = (u: number) => (u / 1_000_000).toFixed(2)
  const formatDate = (unix: number) => unix > 0 ? new Date(unix * 1000).toLocaleDateString() : '\u2014'
  const isSettleable = policy && policy.status === 0 && Date.now() / 1000 >= policy.windowEndUnix

  return (
    <div className="min-h-screen">
      <Nav />
      <ErrorBoundary>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
          <h1 className="text-3xl sm:text-4xl font-semibold mb-2">Settle Policy</h1>
          <p className="text-white/50 text-sm mb-8">Trigger settlement for matured policies to receive payouts.</p>

          {/* Auto-discovered settleable policies */}
          {connected && settleablePolicies.length > 0 && (
            <div className="mb-6">
              <h2 className="text-sm font-medium text-white/70 mb-3">Your Settleable Policies</h2>
              <div className="space-y-2">
                {settleablePolicies.map(p => (
                  <button
                    key={p.policyId}
                    onClick={() => { setPolicyIdInput(String(p.policyId)); setPolicy(p) }}
                    className="w-full card flex justify-between items-center py-3 hover:border-blue-500/30 transition-colors cursor-pointer"
                  >
                    <div className="text-left">
                      <span className="font-mono text-sm">#{p.policyId}</span>
                      <span className="text-white/50 text-xs ml-3">Window ended {formatDate(p.windowEndUnix)}</span>
                    </div>
                    <div className="font-mono text-sm">${formatUsdc(p.payoutAmount)}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {connected && discovering && <PolicySkeleton />}

          {/* Manual lookup */}
          <div className="card mb-6">
            <label htmlFor="policy-id-input" className="label">Lookup by Policy ID</label>
            <div className="flex gap-2">
              <input
                id="policy-id-input"
                type="number"
                value={policyIdInput}
                onChange={e => setPolicyIdInput(e.target.value)}
                placeholder="Enter policy ID"
                className="input flex-1 font-mono"
                min="0"
              />
              <button onClick={fetchPolicy} disabled={loading || !policyIdInput} className="btn-primary px-6">
                {loading ? '...' : 'Lookup'}
              </button>
            </div>
          </div>

          {/* Policy detail */}
          {policy && (
            <div className="card animate-in">
              <div className="flex justify-between items-start mb-4">
                <div className="font-semibold text-xl">Policy #{policy.policyId}</div>
                <div className={`text-xs font-medium px-2.5 py-1 rounded-full ${(STATUSES[policy.status] || STATUSES[0]).color}`}>
                  {(STATUSES[policy.status] || STATUSES[0]).label}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm mb-6">
                <div>
                  <div className="text-white/40 text-xs">Pool</div>
                  <div className="font-mono">#{policy.poolId}</div>
                </div>
                <div>
                  <div className="text-white/40 text-xs">Index Method</div>
                  <div>{INDEX_METHODS[policy.indexMethod] || 'Unknown'}</div>
                </div>
                <div>
                  <div className="text-white/40 text-xs">Direction</div>
                  <div>{DIRECTIONS[policy.direction] || 'Unknown'}</div>
                </div>
                <div>
                  <div className="text-white/40 text-xs">Threshold</div>
                  <div className="font-mono">{policy.threshold} mm</div>
                </div>
                <div>
                  <div className="text-white/40 text-xs">Window</div>
                  <div>{formatDate(policy.windowStartUnix)} &mdash; {formatDate(policy.windowEndUnix)}</div>
                </div>
                <div>
                  <div className="text-white/40 text-xs">Payout</div>
                  <div className="font-mono">${formatUsdc(policy.payoutAmount)}</div>
                </div>
                <div>
                  <div className="text-white/40 text-xs">Premium Paid</div>
                  <div className="font-mono">${formatUsdc(policy.premiumAmount)}</div>
                </div>
                {policy.status >= 2 && (
                  <div>
                    <div className="text-white/40 text-xs">Observed Value</div>
                    <div className="font-mono">{policy.observedValue}</div>
                  </div>
                )}
              </div>

              {isSettleable && connected && txState === 'idle' && (
                <button onClick={settlePolicy} className="btn-primary w-full">
                  Settle Policy
                </button>
              )}

              {policy.status === 0 && Date.now() / 1000 < policy.windowEndUnix && (
                <div className="text-sm text-white/40 text-center py-2">
                  Window ends {formatDate(policy.windowEndUnix)} &mdash; not yet settleable
                </div>
              )}

              {policy.status >= 1 && (
                <div className="text-sm text-white/40 text-center py-2">
                  {policy.triggered ? `Triggered \u2014 $${formatUsdc(policy.payoutAmount)} paid out` : 'Not triggered \u2014 no payout'}
                  {policy.settledAtUnix > 0 && ` (settled ${formatDate(policy.settledAtUnix)})`}
                </div>
              )}
            </div>
          )}

          <TransactionStatus state={txState} message={txMessage} txSignature={txSig} onDismiss={() => setTxState('idle')} />
        </div>
      </ErrorBoundary>
    </div>
  )
}
