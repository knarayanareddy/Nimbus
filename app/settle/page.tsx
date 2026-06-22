'use client'

import { useState } from 'react'
import { useWallet, useConnection } from '@solana/wallet-adapter-react'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import { PublicKey, Transaction, TransactionInstruction } from '@solana/web3.js'
import { BN, Program, AnchorProvider } from '@coral-xyz/anchor'
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddress } from '@solana/spl-token'
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
const STATUSES: Record<number, string> = { 0: 'Active', 1: 'Cancelled', 2: 'Settled (Paid)', 3: 'Settled (Expired)' }

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

  const [policyIdInput, setPolicyIdInput] = useState('')
  const [policy, setPolicy] = useState<PolicyInfo | null>(null)
  const [loading, setLoading] = useState(false)
  const [txStatus, setTxStatus] = useState<string | null>(null)

  const fetchPolicy = async () => {
    if (!policyIdInput) return
    setLoading(true)
    setTxStatus(null)
    setPolicy(null)

    try {
      const policyId = parseInt(policyIdInput, 10)
      const policyPda = getPolicyPda(policyId)
      const accountInfo = await connection.getAccountInfo(policyPda)

      if (!accountInfo) {
        setTxStatus('Policy not found on-chain')
        setLoading(false)
        return
      }

      const data = accountInfo.data
      // Parse policy struct (after 8-byte discriminator)
      let offset = 8
      const pid = new BN(data.slice(offset, offset + 8), 'le').toNumber(); offset += 8
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

      setPolicy({
        policyId: pid, poolId, regionId, peril, windowStartUnix, windowEndUnix,
        indexMethod, direction, threshold, payoutAmount, premiumAmount,
        status, observedValue, triggered, settledAtUnix,
      })
    } catch (err: any) {
      setTxStatus(`Error: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const settlePolicy = async () => {
    if (!publicKey || !policy) return

    setLoading(true)
    setTxStatus(null)
    try {
      const provider = new AnchorProvider(connection, { publicKey } as any, {})
      const program = new Program(IDL as any, PROGRAM_ID, provider)

      const policyPda = getPolicyPda(policy.policyId)
      const configPda = getConfigPda()
      const poolPda = getPoolPda(policy.poolId)
      const vaultAuthPda = getVaultAuthPda(policy.poolId)
      const poolVaultUsdcAta = await getAssociatedTokenAddress(USDC_MINT, vaultAuthPda, true)
      const policyOwnerUsdcAta = await getAssociatedTokenAddress(USDC_MINT, publicKey)

      // Build observation account keys for remaining_accounts
      const obsKeys = buildObservationAccountKeys(
        policy.regionId,
        policy.peril,
        policy.windowStartUnix,
        policy.windowEndUnix,
      )

      // Add compute budget instruction for large windows
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

      const sig = await sendTransaction(tx, connection)
      await connection.confirmTransaction(sig, 'confirmed')
      setTxStatus(`Settlement complete! TX: ${sig.slice(0, 8)}...`)

      // Refresh policy
      await fetchPolicy()
    } catch (err: any) {
      setTxStatus(`Settlement failed: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const formatUsdc = (u: number) => (u / 1_000_000).toFixed(2)
  const formatDate = (unix: number) => unix > 0 ? new Date(unix * 1000).toLocaleDateString() : '—'
  const isSettleable = policy && policy.status === 0 && Date.now() / 1000 >= policy.windowEndUnix

  return (
    <div className="max-w-3xl mx-auto p-8">
      <div className="flex justify-between items-center mb-10">
        <h1 className="text-4xl font-semibold">Settle Policy</h1>
        <WalletMultiButton />
      </div>

      <div className="card mb-6">
        <label className="text-sm text-white/60">Policy ID</label>
        <div className="flex gap-2 mt-1">
          <input
            type="number"
            value={policyIdInput}
            onChange={e => setPolicyIdInput(e.target.value)}
            placeholder="Enter policy ID"
            className="input flex-1 font-mono"
          />
          <button onClick={fetchPolicy} disabled={loading || !policyIdInput} className="btn-primary px-6">
            {loading ? '...' : 'Lookup'}
          </button>
        </div>
      </div>

      {policy && (
        <div className="card">
          <div className="flex justify-between mb-4">
            <div className="font-semibold text-xl">Policy #{policy.policyId}</div>
            <div className={`text-xs font-medium px-3 py-1 rounded-full ${
              policy.status === 0 ? 'bg-blue-500/10 text-blue-400' :
              policy.status === 2 ? 'bg-emerald-500/10 text-emerald-400' :
              'bg-zinc-500/10 text-zinc-400'
            }`}>
              {STATUSES[policy.status] || 'Unknown'}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm mb-6">
            <div>
              <div className="text-white/50">Pool</div>
              <div className="font-mono">#{policy.poolId}</div>
            </div>
            <div>
              <div className="text-white/50">Index Method</div>
              <div>{INDEX_METHODS[policy.indexMethod] || 'Unknown'}</div>
            </div>
            <div>
              <div className="text-white/50">Direction</div>
              <div>{DIRECTIONS[policy.direction] || 'Unknown'}</div>
            </div>
            <div>
              <div className="text-white/50">Threshold</div>
              <div className="font-mono">{policy.threshold}</div>
            </div>
            <div>
              <div className="text-white/50">Window</div>
              <div>{formatDate(policy.windowStartUnix)} — {formatDate(policy.windowEndUnix)}</div>
            </div>
            <div>
              <div className="text-white/50">Payout</div>
              <div className="font-mono">${formatUsdc(policy.payoutAmount)}</div>
            </div>
            <div>
              <div className="text-white/50">Premium Paid</div>
              <div className="font-mono">${formatUsdc(policy.premiumAmount)}</div>
            </div>
            {policy.status >= 2 && (
              <div>
                <div className="text-white/50">Observed Value</div>
                <div className="font-mono">{policy.observedValue}</div>
              </div>
            )}
          </div>

          {isSettleable && connected && (
            <button onClick={settlePolicy} disabled={loading} className="btn-primary w-full">
              {loading ? 'Settling...' : 'Settle Policy'}
            </button>
          )}

          {policy.status === 0 && Date.now() / 1000 < policy.windowEndUnix && (
            <div className="text-sm text-white/50 text-center py-2">
              Window ends {formatDate(policy.windowEndUnix)} — not yet settleable
            </div>
          )}

          {policy.status >= 1 && (
            <div className="text-sm text-white/50 text-center py-2">
              {policy.triggered ? `Triggered — $${formatUsdc(policy.payoutAmount)} paid out` : 'Not triggered — no payout'}
              {policy.settledAtUnix > 0 && ` (settled ${formatDate(policy.settledAtUnix)})`}
            </div>
          )}
        </div>
      )}

      {txStatus && (
        <div className={`mt-4 text-sm p-3 rounded-lg ${
          txStatus.includes('failed') || txStatus.includes('Error') ? 'bg-red-500/10 text-red-400' : 'bg-emerald-500/10 text-emerald-400'
        }`}>
          {txStatus}
        </div>
      )}
    </div>
  )
}
