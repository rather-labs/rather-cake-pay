'use client'

import { useAccount, useConnect, useDisconnect } from 'wagmi'
import { useConnectModal } from '@rainbow-me/rainbowkit'

/**
 * Hook that provides wallet connection functionality using Wagmi
 * This maintains compatibility with the existing useUserContext API
 */
export function useUserContext() {
  const { address, isConnected } = useAccount()
  const { disconnect } = useDisconnect()
  const { openConnectModal } = useConnectModal()
  const { isPending: isConnecting } = useConnect()

  const walletAddress = isConnected && address ? address : null

  const connectWallet = async () => {
    if (openConnectModal) {
      openConnectModal()
    }
  }

  const disconnectWallet = () => {
    disconnect()
  }

  return {
    walletAddress,
    setWalletAddress: () => {
      // No-op: Wagmi manages address state
      console.warn('setWalletAddress is deprecated. Use connectWallet/disconnectWallet instead.')
    },
    connectWallet,
    disconnectWallet,
    isConnecting,
  }
}

