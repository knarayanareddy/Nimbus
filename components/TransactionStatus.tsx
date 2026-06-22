'use client'

import { useState, useEffect } from 'react'

export type TxState = 'idle' | 'signing' | 'confirming' | 'success' | 'error'

interface TransactionStatusProps {
  state: TxState
  message?: string
  txSignature?: string
  onDismiss?: () => void
}

export default function TransactionStatus({ state, message, txSignature, onDismiss }: TransactionStatusProps) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (state !== 'idle') {
      setVisible(true)
    }
  }, [state])

  if (!visible || state === 'idle') return null

  const configs: Record<TxState, { bg: string; text: string; icon: string }> = {
    idle: { bg: '', text: '', icon: '' },
    signing: { bg: 'bg-blue-500/10 border-blue-500/20', text: 'text-blue-300', icon: 'Waiting for wallet...' },
    confirming: { bg: 'bg-amber-500/10 border-amber-500/20', text: 'text-amber-300', icon: 'Confirming on-chain...' },
    success: { bg: 'bg-emerald-500/10 border-emerald-500/20', text: 'text-emerald-300', icon: 'Success' },
    error: { bg: 'bg-red-500/10 border-red-500/20', text: 'text-red-300', icon: 'Failed' },
  }

  const config = configs[state]

  return (
    <div
      className={`rounded-xl border p-4 ${config.bg} ${config.text} transition-all animate-in fade-in`}
      role="alert"
      aria-live="polite"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {(state === 'signing' || state === 'confirming') && (
            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" aria-hidden="true" />
          )}
          {state === 'success' && (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          )}
          {state === 'error' && (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          )}
          <div>
            <div className="text-sm font-medium">{config.icon}</div>
            {message && <div className="text-xs opacity-80 mt-0.5">{message}</div>}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {txSignature && (
            <a
              href={`https://explorer.solana.com/tx/${txSignature}?cluster=devnet`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs underline opacity-70 hover:opacity-100"
              aria-label="View transaction on Solana Explorer"
            >
              View TX
            </a>
          )}
          {(state === 'success' || state === 'error') && onDismiss && (
            <button
              onClick={() => { setVisible(false); onDismiss(); }}
              className="p-1 hover:bg-white/10 rounded"
              aria-label="Dismiss notification"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
