import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { WalletContextProvider } from '../components/WalletProvider'
import NetworkStatus from '../components/NetworkStatus'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
})

export const metadata: Metadata = {
  title: 'ClimaFi | Parametric Climate Cover on Solana',
  description: 'Buy parametric rainfall insurance on Solana. Automatic payouts when weather triggers hit. No paperwork, no claims process.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`dark ${inter.variable}`}>
      <body className={`min-h-screen ${inter.className}`}>
        <WalletContextProvider>
          <NetworkStatus />
          {children}
        </WalletContextProvider>
      </body>
    </html>
  )
}
