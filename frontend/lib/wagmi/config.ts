import { getDefaultConfig } from '@rainbow-me/rainbowkit'
import { mainnet, sepolia, localhost } from 'wagmi/chains'

export const config = getDefaultConfig({
  appName: 'CakePay',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'YOUR_PROJECT_ID',
  chains: [mainnet, sepolia, ...(process.env.NODE_ENV === 'development' ? [localhost] : [])],
  ssr: true, // If your dApp uses server side rendering (SSR)
})



