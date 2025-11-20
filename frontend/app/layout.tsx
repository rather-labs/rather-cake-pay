import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { Providers } from './providers'
import { WalletDebug } from '@/components/WalletDebug'
import './globals.css'

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: 'CakePay - Split Bills Like Splitting Cake',
  description: 'Pay in any crypto, settle in stablecoins. No gas fees, no hassle. The easiest way to split expenses with friends.',
  icons: {
    icon: [
      {// TODO: add theme-specific icons
        url: '/cake-icon.jpg',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/cake-icon.jpg',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/cake-icon.jpg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/cake-icon.jpg',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} antialiased`}>
        <Providers>
          {children}
          <WalletDebug />
        </Providers>
        <Analytics />
      </body>
    </html>
  )
}
