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

export const metadata: Metadata = {
  title: 'Nimbus | Parametric Climate Cover on Solana',
  description: 'Deterministic weather risk coverage on Solana. Oracle-verified rainfall indices trigger automatic USDC payouts. No claims. No adjusters. Just data.',
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
