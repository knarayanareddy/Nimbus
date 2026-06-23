'use client'

import { useConnection } from '@solana/wallet-adapter-react'
import { useEffect, useState } from 'react'

export default function NetworkStatus() {
  const { connection } = useConnection()
  const [isDown, setIsDown] = useState(false)
  const [retryCount, setRetryCount] = useState(0)

  useEffect(() => {
    let mounted = true
    const check = async () => {
      try {
        await connection.getLatestBlockhash()
        if (mounted) { setIsDown(false); setRetryCount(0) }
      } catch {
        if (mounted) { setIsDown(true); setRetryCount(prev => prev + 1) }
      }
    }

    check()
    const interval = setInterval(check, 15_000)
    return () => { mounted = false; clearInterval(interval) }
  }, [connection])

  if (!isDown) return null

  return (
    <div className="fixed top-0 left-0 right-0 z-[60] bg-red-600/95 backdrop-blur text-white text-center py-2 px-4 text-sm font-medium shadow-lg" role="alert" aria-live="assertive">
      <div className="flex items-center justify-center gap-2">
        <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
        <span>Network connection issue — Solana RPC is unreachable</span>
        {retryCount > 2 && <span className="text-white/70 text-xs ml-2">(retrying...)</span>}
      </div>
    </div>
  )
}
