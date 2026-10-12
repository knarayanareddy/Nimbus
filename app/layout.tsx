import './globals.css'
import type { Metadata } from 'next'
import { Inter, Space_Grotesk } from 'next/font/google'
import { WalletContextProvider } from '../components/WalletProvider'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
})

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-space-grotesk',
})

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Nimbus | Verifiable Rainfall Evidence on Solana',
  description: 'Replay historical rainfall, inspect data provenance and verify deterministic test-policy outcomes. Anchor receipt integrity on Solana devnet. Hackathon prototype, no real-fund coverage.',
  keywords: ['parametric', 'climate', 'solana', 'USDC', 'rainfall', 'coverage', 'defi'],
  openGraph: {
    title: 'Nimbus Protocol',
    description: 'Deterministic weather risk coverage on Solana',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`dark ${inter.variable} ${spaceGrotesk.variable}`}>
      <body className={`min-h-screen font-sans`}>
        <WalletContextProvider>
          {children}
        </WalletContextProvider>
      </body>
    </html>
  )
}
