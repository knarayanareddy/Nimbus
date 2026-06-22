import './globals.css'
import type { Metadata } from 'next'
import { WalletContextProvider } from '../components/WalletProvider'

export const metadata: Metadata = {
  title: 'ClimaFi | Parametric Climate Cover',
  description: 'Buy parametric rainfall insurance on Solana. Automatic payouts when weather triggers hit.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen">
        <WalletContextProvider>
          {children}
        </WalletContextProvider>
      </body>
    </html>
  )
}
