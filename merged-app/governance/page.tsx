'use client'

import { useState, useEffect } from 'react'
import { useWallet, useConnection } from '@solana/wallet-adapter-react'
import { useWalletModal } from '@solana/wallet-adapter-react-ui'
import Nav from '../components/Nav'
import {
  Shield, Clock, CheckCircle2, AlertCircle, XCircle,
  Users, Lock, Unlock, ChevronDown, ChevronUp,
  ExternalLink, Vote, Activity, TrendingUp, Zap
} from 'lucide-react'

type ProposalStatus = 'active' | 'queued' | 'executed' | 'defeated' | 'expired'

interface Signer {
  address: string
  label: string
  signed: boolean
}

interface Proposal {
  id: string
  title: string
  description: string
  status: ProposalStatus
  category: string
  proposedBy: string
  proposedAt: string
  timelockEnd?: string
  timelockRemaining?: string
  votesFor: number
  votesAgainst: number
  quorum: number
  signers: Signer[]
  risk: 'low' | 'medium' | 'high'
  changes: string[]
}

const PROPOSALS: Proposal[] = [
  {
    id: 'NIP-007',
    title: 'Add Minas Gerais, Brazil to Africa Drought Pool',
    description: 'Expand pool region coverage to include Minas Gerais state in Brazil, using Open-Meteo + NOAA data. Introduces Sum and Mean index methods for the cerrado agricultural zone.',
    status: 'active',
    category: 'Pool Configuration',
    proposedBy: '7xKp...3f9q',
    proposedAt: '2026-06-20',
    votesFor: 7,
    votesAgainst: 1,
    quorum: 6,
    risk: 'low',
    changes: [
      'Add region: Minas Gerais, Brazil (lat -18.51, lng -44.55)',
      'Enable Sum index: threshold range 100–400mm',
      'Enable Mean index: threshold range 2–8mm/day',
      'Oracle: Open-Meteo + NOAA (sources_bitmap: 0b101)',
    ],
    signers: [
      { address: '7xKp...3f9q', label: 'Core Multisig 1', signed: true },
      { address: '4mNr...8j2v', label: 'Core Multisig 2', signed: true },
      { address: '9qLs...5kX1', label: 'Core Multisig 3', signed: true },
      { address: '2dTw...7pB4', label: 'Risk Committee', signed: false },
      { address: '6rYu...1mC8', label: 'Protocol Team', signed: false },
    ],
  },
  {
    id: 'NIP-006',
    title: 'Increase Global Mixed Pool LTV Limit to 85%',
    description: 'Raises the Loan-to-Value limit on the Global Mixed Peril pool from 80% to 85%, allowing greater utilization of deposited USDC for underwriting. Requires 4/5 multisig approval.',
    status: 'queued',
    category: 'Risk Parameters',
    proposedBy: '4mNr...8j2v',
    proposedAt: '2026-06-15',
    timelockEnd: '2026-07-04',
    timelockRemaining: '11d 12h',
    votesFor: 5,
    votesAgainst: 0,
    quorum: 4,
    risk: 'medium',
    changes: [
      'Global Mixed Pool: LTV limit 80% → 85%',
      'New max exposure per policy: $50k USDC → $60k USDC',
      'Effective after 72h timelock (standard)',
    ],
    signers: [
      { address: '7xKp...3f9q', label: 'Core Multisig 1', signed: true },
      { address: '4mNr...8j2v', label: 'Core Multisig 2', signed: true },
      { address: '9qLs...5kX1', label: 'Core Multisig 3', signed: true },
      { address: '2dTw...7pB4', label: 'Risk Committee', signed: true },
      { address: '6rYu...1mC8', label: 'Protocol Team', signed: false },
    ],
  },
  {
    id: 'NIP-005',
    title: 'Update Oracle Authority to New Switchboard Feed',
    description: 'Migrate primary oracle authority from legacy permissioned feed to new Switchboard V2 aggregator for all existing regions. No change to policy parameters.',
    status: 'executed',
    category: 'Oracle',
    proposedBy: '9qLs...5kX1',
    proposedAt: '2026-06-01',
    timelockEnd: '2026-06-04',
    votesFor: 5,
    votesAgainst: 0,
    quorum: 4,
    risk: 'medium',
    changes: [
      'Oracle authority: legacy → Switchboard V2',
      'All existing regions migrated atomically',
      'sources_bitmap updated to reflect new feed IDs',
    ],
    signers: [
      { address: '7xKp...3f9q', label: 'Core Multisig 1', signed: true },
      { address: '4mNr...8j2v', label: 'Core Multisig 2', signed: true },
      { address: '9qLs...5kX1', label: 'Core Multisig 3', signed: true },
      { address: '2dTw...7pB4', label: 'Risk Committee', signed: true },
      { address: '6rYu...1mC8', label: 'Protocol Team', signed: true },
    ],
  },
]

const STATUS_CONFIG: Record<ProposalStatus, { label: string; className: string; icon: any }> = {
  active: {
    label: 'Active',
    className: 'bg-green-500/10 text-green-400 border border-green-500/30',
    icon: <Activity size={11} />,
  },
  queued: {
    label: 'Timelock Queue',
    className: 'bg-orange-500/10 text-orange-400 border border-orange-500/30',
    icon: <Clock size={11} />,
  },
  executed: {
    label: 'Executed',
    className: 'bg-nimbus-500/10 text-nimbus-300 border border-nimbus-400/30',
    icon: <CheckCircle2 size={11} />,
  },
  defeated: {
    label: 'Defeated',
    className: 'bg-status-danger/10 text-status-danger border border-status-danger/30',
    icon: <XCircle size={11} />,
  },
  expired: {
    label: 'Expired',
    className: 'bg-gray-500/10 text-gray-400 border border-gray-500/30',
    icon: <Lock size={11} />,
  },
}

function ProposalCard({ proposal }: { proposal: Proposal }) {
  const [expanded, setExpanded] = useState(false)
  const config = STATUS_CONFIG[proposal.status]

  return (
    <div className="card bg-surface-1/40 border border-white/[0.06] rounded-2xl overflow-hidden hover:border-nimbus-500/10 transition-all duration-300">
      <div className="p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-xs font-mono font-bold text-nimbus-300">{proposal.id}</span>
              <span className="text-white/20">•</span>
              <span className="text-xs text-white/40">{proposal.category}</span>
            </div>
            <h3 className="text-lg font-semibold text-white leading-snug">{proposal.title}</h3>
          </div>
          <div className="flex items-center gap-2 self-start md:self-auto">
            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${config.className}`}>
              {config.icon}
              {config.label}
            </span>
          </div>
        </div>

        <p className="text-sm text-white/50 leading-relaxed mb-6">{proposal.description}</p>

        {/* Voting summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="card bg-surface-2/40 p-3 border-none">
            <div className="text-xs text-white/30 mb-0.5">Yes Votes</div>
            <div className="text-base font-bold text-white font-mono">{proposal.votesFor} approval</div>
          </div>
          <div className="card bg-surface-2/40 p-3 border-none">
            <div className="text-xs text-white/30 mb-0.5">No Votes</div>
            <div className="text-base font-bold text-white font-mono">{proposal.votesAgainst} veto</div>
          </div>
          <div className="card bg-surface-2/40 p-3 border-none">
            <div className="text-xs text-white/30 mb-0.5">Quorum Required</div>
            <div className="text-base font-bold text-white font-mono">{proposal.quorum} signatures</div>
          </div>
          <div className="card bg-surface-2/40 p-3 border-none">
            <div className="text-xs text-white/30 mb-0.5">Risk Level</div>
            <div className={`text-base font-bold capitalize font-mono ${
              proposal.risk === 'high' ? 'text-status-danger' :
              proposal.risk === 'medium' ? 'text-orange-400' : 'text-green-400'
            }`}>
              {proposal.risk}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="text-xs text-white/30">
            Proposed by <span className="font-mono text-white/50">{proposal.proposedBy}</span> on {proposal.proposedAt}
          </div>
          <div className="flex gap-2">
            <button onClick={() => setExpanded(!expanded)} className="btn-secondary px-3 py-1.5 rounded-lg text-xs flex items-center gap-1">
              {expanded ? <>Hide Signatures <ChevronUp size={12} /></> : <>Show Signatures <ChevronDown size={12} /></>}
            </button>
          </div>
        </div>
      </div>

      {/* Expanded Signatures & Changes */}
      {expanded && (
        <div className="border-t border-white/[0.04] bg-white/[0.005] p-6 animate-in">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Multisig Members */}
            <div>
              <h4 className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-3">Multisig Signers Progress</h4>
              <div className="space-y-2">
                {proposal.signers.map((signer) => (
                  <div key={signer.address} className="flex items-center justify-between p-2.5 bg-surface-2/50 rounded-xl text-xs">
                    <div>
                      <span className="font-medium text-white">{signer.label}</span>
                      <span className="font-mono text-white/30 ml-2">({signer.address})</span>
                    </div>
                    {signer.signed ? (
                      <span className="text-green-400 font-semibold">Signed ✓</span>
                    ) : (
                      <span className="text-white/20">Pending</span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Contract Changes */}
            <div>
              <h4 className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-3">On-Chain Modifications</h4>
              <ul className="space-y-2">
                {proposal.changes.map((change, i) => (
                  <li key={i} className="text-xs text-white/60 flex items-start gap-2">
                    <span className="text-nimbus-300 font-bold">•</span>
                    <span>{change}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function GovernancePage() {
  const { connected } = useWallet()
  const { setVisible: setWalletVisible } = useWalletModal()

  return (
    <main className="min-h-screen bg-surface-0 noise pb-24">
      <Nav />

      <section className="pt-24 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Page header */}
        <div className="mb-10 text-center max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold mb-4 bg-nimbus-500/10 border border-nimbus-400/20 text-nimbus-300">
            <Users size={12} /> Multisig Governance
          </div>
          <h1 className="text-4xl font-display font-bold text-white mb-4" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            Protocol Decisions &amp; Multi-sig
          </h1>
          <p className="text-white/45 text-base">
            Track parameter updates, pool deployments, and oracle updates. Upgrades require a minimum quorum of authorized multisig keys to execute.
          </p>
        </div>

        {/* Global timelock card */}
        <div className="card p-6 mb-8 bg-surface-1/40 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:border-nimbus-500/10 transition-all duration-300">
          <div>
            <div className="flex items-center gap-2 text-white font-semibold mb-1">
              <Lock size={16} className="text-orange-400" />
              Timelock Config Active
            </div>
            <p className="text-xs text-white/40 max-w-md">
              All approved proposals are queued in a mandatory 72-hour timelock contract to protect underwriters and policy holders.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-xs text-white/30">Timelock Period</div>
              <div className="text-base font-bold text-white font-mono">72 Hours</div>
            </div>
            <div className="text-right">
              <div className="text-xs text-white/30">Execution Quorum</div>
              <div className="text-base font-bold text-white font-mono">3 of 5 Keys</div>
            </div>
          </div>
        </div>

        {/* Proposals list */}
        <div className="space-y-6">
          <h2 className="text-sm font-semibold text-white/50 uppercase tracking-wider">Active &amp; Historical Proposals</h2>
          <div className="space-y-4">
            {PROPOSALS.map((p) => (
              <ProposalCard key={p.id} proposal={p} />
            ))}
          </div>
        </div>
      </section>
    </main>
  )
}
