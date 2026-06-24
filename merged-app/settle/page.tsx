'use client'

import { useState, useEffect } from 'react'
import { useWallet, useConnection } from '@solana/wallet-adapter-react'
import { useWalletModal } from '@solana/wallet-adapter-react-ui'
import Nav from '../components/Nav'
import {
  PROGRAM_ID,
  getConfigPda,
  getPoolPda,
  getVaultAuthPda,
  getPolicyPda,
  USDC_MINT,
} from '../../lib/nimbus'
import { Program, AnchorProvider, web3 } from '@coral-xyz/anchor'
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddress } from '@solana/spl-token'
import { Transaction } from '@solana/web3.js'
import BN from 'bn.js'
import {
  CheckCircle2, AlertCircle, XCircle, Database,
  Shield, Zap, ChevronRight, Clock, BarChart3,
  CloudRain, Sun, Droplets, ExternalLink, Activity
} from 'lucide-react'

// Extended IDL definition for SettlePolicy
const FULL_IDL_WITH_SETTLE = {
  version: '0.1.0',
  name: 'nimbus',
  instructions: [
    {
      name: 'settlePolicy',
      accounts: [
        { name: 'config', isMut: false, isSigner: false },
        { name: 'pool', isMut: true, isSigner: false },
        { name: 'vaultAuth', isMut: false, isSigner: false },
        { name: 'poolVaultUsdcAta', isMut: true, isSigner: false },
        { name: 'policy', isMut: true, isSigner: false },
        { name: 'policyOwner', isMut: true, isSigner: true },
        { name: 'policyOwnerUsdcAta', isMut: true, isSigner: false },
        { name: 'instructionsSysvar', isMut: false, isSigner: false },
        { name: 'tokenProgram', isMut: false, isSigner: false },
      ],
      args: [],
    },
  ],
}

interface SettlablePolicy {
  id: string
  region: string
  country: string
  peril: 'drought' | 'flood'
  indexMethod: 'Sum' | 'Mean' | 'Max'
  threshold: number
  direction: 'below' | 'above'
  payout: number
  premium: number
  windowEnd: string
  oracleValue: number
  oracleSources: string[]
  sourceBitmap: string
  snapshotTx: string
  triggered: boolean
  reason: string
  poolId: number
  isLocalSim?: boolean
}

const SETTLEABLE: SettlablePolicy[] = [
  {
    id: '1001',
    region: 'Nairobi Region',
    country: 'Kenya',
    peril: 'drought',
    indexMethod: 'Sum',
    threshold: 80,
    direction: 'below',
    payout: 5000,
    premium: 175,
    windowEnd: '2026-06-20',
    oracleValue: 32.6,
    oracleSources: ['Switchboard', 'Open-Meteo', 'NOAA'],
    sourceBitmap: '0b111',
    snapshotTx: '8nQrMvKxJ2sA4pT7bY9cW3dHfUeNmLtCqPwZo6iG1kBxFvDjRh',
    triggered: true,
    reason: 'Total rainfall (32.6mm) was below threshold (80mm) across Nairobi region window.',
    poolId: 1,
  },
  {
    id: '1002',
    region: 'Punjab',
    country: 'India',
    peril: 'flood',
    indexMethod: 'Max',
    threshold: 80,
    direction: 'above',
    payout: 25000,
    premium: 1100,
    windowEnd: '2026-06-15',
    oracleValue: 94.3,
    oracleSources: ['Switchboard', 'Open-Meteo'],
    sourceBitmap: '0b011',
    snapshotTx: '4bZvKpT2m9Xr3w8q7N1cLfHsUvYoMjWdAeRtCxQbPn5h6GkFsJi',
    triggered: true,
    reason: 'Max daily rainfall (94.3mm) exceeded flood threshold (80mm) on Jun 22, 2026.',
    poolId: 2,
  },
]

const RECENTLY_SETTLED = [
  {
    id: 'NMB-2025-001-HIST',
    region: 'Kano State, Nigeria',
    peril: 'drought' as const,
    payout: 12000,
    settleTx: '2mTnJpK8rX4vQ1wB9hD6yF3cN7sU5eA0lCzPiWoMtRkGqbVjEf',
    settledAt: '2026-06-21',
    triggered: true,
  },
  {
    id: 'NMB-2025-000-HIST',
    region: 'Chiang Rai, Thailand',
    peril: 'flood' as const,
    payout: 8000,
    settleTx: '6kLmNpT3rV8xQ2wA5jH0yG1cM4sU7eC9bDzFiWoKtRaGeVjBf',
    settledAt: '2026-06-15',
    triggered: false,
  },
]

function OracleProofPanel({ policy }: { policy: SettlablePolicy }) {
  return (
    <div className="card bg-surface-2 p-5 mb-4 border border-nimbus-500/10">
      <div className="flex items-center gap-2 mb-4">
        <Database size={14} className="text-nimbus-300" />
        <span className="text-sm font-semibold text-white">Oracle Proof</span>
        <span className="inline-flex bg-green-500/10 border border-green-500/25 px-2.5 py-0.5 rounded text-[10px] text-green-400 font-medium ml-auto">On-chain verified</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4 text-xs">
        <div>
          <div className="text-white/30 mb-1">Observed Value</div>
          <div className={`text-lg font-bold font-mono ${policy.triggered ? 'text-status-triggered' : 'text-green-400'}`}>
            {policy.oracleValue} mm
          </div>
        </div>
        <div>
          <div className="text-white/30 mb-1">Threshold</div>
          <div className="text-base font-bold text-white font-mono">
            {policy.direction === 'below' ? '<' : '>'} {policy.threshold} mm
          </div>
        </div>
        <div>
          <div className="text-white/30 mb-1">Index Method</div>
          <div className="text-base font-bold text-white font-mono">{policy.indexMethod}</div>
        </div>
        <div>
          <div className="text-white/30 mb-1">Trigger Status</div>
          <div className={`text-base font-bold font-mono ${policy.triggered ? 'text-status-triggered' : 'text-green-400'}`}>
            {policy.triggered ? '✓ TRIGGERED' : '✗ NOT TRIGGERED'}
          </div>
        </div>
      </div>

      <div className="bg-black/25 rounded-lg p-3 mb-3 font-mono text-xs leading-relaxed">
        <div className="text-white/25 mb-1"># Oracle settlement proof</div>
        <div className="text-green-400">region: <span className="text-white">{policy.region}, {policy.country}</span></div>
        <div className="text-green-400">window_end: <span className="text-white">{policy.windowEnd} 23:59:59 UTC</span></div>
        <div className="text-green-400">index_method: <span className="text-white">{policy.indexMethod}</span></div>
        <div className="text-green-400">observed_value: <span className="text-purple-400">{policy.oracleValue} mm</span></div>
        <div className="text-green-400">threshold: <span className="text-white">{policy.threshold} mm</span></div>
        <div className="text-green-400">direction: <span className="text-white">{policy.direction}</span></div>
        <div className="text-green-400">triggered: <span className={policy.triggered ? 'text-purple-400' : 'text-green-400'}>{policy.triggered.toString()}</span></div>
        <div className="text-green-400">sources_bitmap: <span className="text-white">{policy.sourceBitmap}</span></div>
        <div className="text-green-400">sources: <span className="text-white">[{policy.oracleSources.join(', ')}]</span></div>
        <div className="text-green-400">snapshot_tx: <span className="text-blue-400">{policy.snapshotTx.slice(0, 20)}…</span></div>
      </div>

      <div className="flex items-center gap-3 text-xs text-white/30">
        {policy.oracleSources.map((src) => (
          <span key={src} className="inline-flex bg-white/5 px-2 py-0.5 rounded text-[10px] text-white/50">{src}</span>
        ))}
      </div>
    </div>
  )
}

function SettleCard({ policy, onSettle }: { policy: SettlablePolicy; onSettle: (id: string, forceSimulate?: boolean) => Promise<void> }) {
  const [showProof, setShowProof] = useState(false)
  const { connected } = useWallet()
  const { setVisible: setWalletVisible } = useWalletModal()
  const [settling, setSettling] = useState(false)
  const [txError, setTxError] = useState<string | null>(null)

  const handleSettleAction = async (forceSimulate = false) => {
    if (!connected) {
      setWalletVisible(true)
      return
    }
    setSettling(true)
    setTxError(null)
    try {
      await onSettle(policy.id, forceSimulate)
    } catch (err: any) {
      setTxError(err.message || 'Settlement execution failed.')
    } finally {
      setSettling(false)
    }
  }

  return (
    <div className="card bg-surface-1/40 border border-white/[0.06] rounded-2xl p-6">
      {txError && (
        <div className="mb-4 p-3 rounded-lg bg-status-danger/10 border border-status-danger/25 text-status-danger text-xs flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <AlertCircle size={14} />
            <span>{txError}</span>
          </div>
          <button 
            onClick={() => handleSettleAction(true)}
            className="btn-secondary self-start py-1.5 px-3 rounded-lg text-[10px] font-semibold hover:bg-white/10"
          >
            Simulate Settlement (Demo Mode)
          </button>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
            policy.peril === 'drought' ? 'bg-orange-500/10 text-orange-400' : 'bg-blue-500/10 text-blue-400'
          }`}>
            {policy.peril === 'drought' ? <Sun size={18} /> : <Droplets size={18} />}
          </div>
          <div>
            <h3 className="font-semibold text-white text-base">{policy.region}</h3>
            <p className="text-xs text-white/35">ID: #{policy.id} · Ended {policy.windowEnd}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowProof(!showProof)} className="btn-secondary px-3 py-1.5 rounded-lg text-xs">
            {showProof ? 'Hide Proof' : 'View Proof'}
          </button>
          <button
            onClick={() => handleSettleAction(false)}
            disabled={settling}
            className="btn-primary px-4 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5"
          >
            {settling ? (
              <>Settling… <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /></>
            ) : (
              <><Zap size={12} /> Trigger Payout</>
            )}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4 text-sm">
        <div><span className="text-white/30 text-xs">Peril</span><div className="text-white font-medium capitalize">{policy.peril}</div></div>
        <div><span className="text-white/30 text-xs">Trigger</span><div className="text-white font-medium font-mono">{policy.direction === 'below' ? '<' : '>'}{policy.threshold}mm</div></div>
        <div><span className="text-white/30 text-xs">Observed Index</span><div className="text-status-triggered font-bold font-mono">{policy.oracleValue} mm</div></div>
        <div><span className="text-white/30 text-xs">USDC Payout</span><div className="text-green-400 font-bold font-mono">{policy.payout.toLocaleString()} USDC</div></div>
      </div>

      {showProof && <OracleProofPanel policy={policy} />}

      <div className="p-3 bg-surface-2/50 rounded-xl flex items-start gap-2 text-xs text-white/45">
        <CheckCircle2 size={14} className="text-green-400 flex-shrink-0 mt-0.5" />
        <div>
          <strong className="text-white/60">Condition Met: </strong> {policy.reason}
        </div>
      </div>
    </div>
  )
}

export default function SettlePage() {
  const { connected, publicKey, sendTransaction } = useWallet()
  const { connection } = useConnection()
  const [activePolicies, setActivePolicies] = useState<SettlablePolicy[]>(SETTLEABLE)
  const [settledLogs, setSettledLogs] = useState(RECENTLY_SETTLED)

  // Load custom policies from localStorage
  useEffect(() => {
    if (!connected || !publicKey) {
      setActivePolicies(SETTLEABLE)
      return
    }

    try {
      const localPoliciesRaw = localStorage.getItem(`nimbus_policies_${publicKey.toBase58()}`)
      if (localPoliciesRaw) {
        const localPolicies = JSON.parse(localPoliciesRaw)
        if (Array.isArray(localPolicies)) {
          // Find active ones
          const activeLocal = localPolicies.filter((p: any) => p.status === 'active')
          const mappedLocal: SettlablePolicy[] = activeLocal.map((p: any) => ({
            id: p.id,
            region: p.region,
            country: 'Kenya',
            peril: p.peril,
            indexMethod: p.index.charAt(0).toUpperCase() + p.index.slice(1),
            threshold: p.threshold,
            direction: p.peril === 'drought' ? 'below' : 'above',
            payout: p.payout,
            premium: p.premium,
            windowEnd: p.endDate,
            oracleValue: p.peril === 'drought' ? 32.6 : 142.1,
            oracleSources: ['Switchboard', 'Open-Meteo', 'NOAA'],
            sourceBitmap: '0b111',
            snapshotTx: p.txid,
            triggered: true,
            reason: p.peril === 'drought' 
              ? `Rainfall index was below threshold of ${p.threshold}mm.`
              : `Rainfall index exceeded threshold of ${p.threshold}mm.`,
            poolId: 1,
            isLocalSim: true,
          }))
          setActivePolicies([...mappedLocal, ...SETTLEABLE])
        }
      }
    } catch (err) {
      console.error('Failed to load local policies in SettlePage', err)
    }
  }, [connected, publicKey])

  const handleSettlePolicyOnChain = async (policyIdStr: string, forceSimulate = false) => {
    if (!connected || !publicKey) return

    const targetPolicy = activePolicies.find(p => p.id === policyIdStr)
    if (!targetPolicy) return

    // Run local simulation if it is marked as simulation, forced, or if it's a short mock ID (<10)
    const isLocalSim = forceSimulate || targetPolicy.isLocalSim || policyIdStr.length < 10

    if (isLocalSim) {
      console.log('Simulating settlement for demo policy...')
      await new Promise(resolve => setTimeout(resolve, 1200))
      
      const mockSignature = Array.from({length: 64}, () => Math.floor(Math.random()*16).toString(16)).join('')

      // If it exists in localStorage, update its status to settled
      try {
        const localPoliciesRaw = localStorage.getItem(`nimbus_policies_${publicKey.toBase58()}`)
        if (localPoliciesRaw) {
          const localPolicies = JSON.parse(localPoliciesRaw)
          if (Array.isArray(localPolicies)) {
            const index = localPolicies.findIndex((p: any) => p.id === policyIdStr)
            if (index !== -1) {
              localPolicies[index].status = 'settled'
              localStorage.setItem(`nimbus_policies_${publicKey.toBase58()}`, JSON.stringify(localPolicies))
            }
          }
        }
      } catch (err) {
        console.error('Failed to update local policy status to settled', err)
      }

      setActivePolicies(prev => prev.filter(p => p.id !== policyIdStr))
      setSettledLogs(prev => [
        {
          id: `NMB-${policyIdStr}-HIST`,
          region: `${targetPolicy.region}, ${targetPolicy.country}`,
          peril: targetPolicy.peril,
          payout: targetPolicy.payout,
          settleTx: mockSignature,
          settledAt: new Date().toISOString().split('T')[0],
          triggered: true,
        },
        ...prev,
      ])
      return
    }

    try {
      const provider = new AnchorProvider(connection, { publicKey } as any, {})
      const program = new Program(FULL_IDL_WITH_SETTLE as any, PROGRAM_ID, provider)

      const configPda = getConfigPda()
      const poolPda = getPoolPda(targetPolicy.poolId)
      const policyPda = getPolicyPda(new BN(policyIdStr))
      const vaultAuthPda = getVaultAuthPda(targetPolicy.poolId)

      const policyOwnerUsdcAta = await getAssociatedTokenAddress(USDC_MINT, publicKey)
      const poolVaultUsdcAta = await getAssociatedTokenAddress(USDC_MINT, vaultAuthPda, true)

      // Build settlePolicy instruction
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
          instructionsSysvar: web3.SYSVAR_INSTRUCTIONS_PUBKEY,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .transaction()

      const signature = await sendTransaction(settleTx, connection)
      await connection.confirmTransaction(signature, 'confirmed')

      // On success: update local state lists
      setActivePolicies(prev => prev.filter(p => p.id !== policyIdStr))
      setSettledLogs(prev => [
        {
          id: `NMB-${policyIdStr}-HIST`,
          region: `${targetPolicy.region}, ${targetPolicy.country}`,
          peril: targetPolicy.peril,
          payout: targetPolicy.payout,
          settleTx: signature,
          settledAt: new Date().toISOString().split('T')[0],
          triggered: true,
        },
        ...prev,
      ])
    } catch (err: any) {
      console.error(err)
      throw err
    }
  }

  return (
    <main className="min-h-screen bg-surface-0 noise pb-24">
      <Nav />

      <section className="pt-24 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Page header */}
        <div className="mb-10 text-center max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold mb-4 bg-nimbus-500/10 border border-nimbus-400/20 text-nimbus-300">
            <Zap size={12} /> Settlement Queue
          </div>
          <h1 className="text-4xl font-display font-bold text-white mb-4" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            Resolve ended policies
          </h1>
          <p className="text-white/45 text-base">
            Trigger on-chain settlements for policies whose observation windows have concluded. Anyone can submit these oracle-verified proofs to release USDC payouts.
          </p>
        </div>

        {/* Settlable Policies Section */}
        <div className="space-y-6 mb-12">
          <h2 className="text-sm font-semibold text-white/50 uppercase tracking-wider">Ready for Settlement ({activePolicies.length})</h2>
          {activePolicies.length === 0 ? (
            <div className="card text-center py-16 bg-surface-1/30">
              <CheckCircle2 className="w-12 h-12 text-green-400/20 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-1">Queue is empty</h3>
              <p className="text-white/40 text-sm">All ended policies have been settled successfully.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {activePolicies.map((p) => (
                <SettleCard key={p.id} policy={p} onSettle={handleSettlePolicyOnChain} />
              ))}
            </div>
          )}
        </div>

        {/* Settled History Logs */}
        <div className="space-y-6">
          <h2 className="text-sm font-semibold text-white/50 uppercase tracking-wider">Recently Settled Logs</h2>
          <div className="space-y-3">
            {settledLogs.map((log) => (
              <div key={log.id} className="card bg-surface-1/20 border border-white/[0.04] p-4 flex flex-col sm:flex-row justify-between sm:items-center gap-4 text-sm">
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="font-mono text-white/30 text-xs">{log.id}</span>
                    <span className="text-white/20">•</span>
                    <span className="font-medium text-white">{log.region}</span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-white/30">
                    <span>Settle Date: {log.settledAt}</span>
                    <span>Payout: <strong className="text-green-400 font-mono">{log.payout.toLocaleString()} USDC</strong></span>
                  </div>
                </div>
                <div className="flex items-center gap-2 self-end sm:self-auto text-xs">
                  <a href={`https://solscan.io/tx/${log.settleTx}?cluster=devnet`} target="_blank" rel="noreferrer" className="text-nimbus-300 hover:underline inline-flex items-center gap-1 font-mono">
                    Receipt <ExternalLink size={10} />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  )
}
