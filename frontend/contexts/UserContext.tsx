'use client'

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useAccount, useConnect, useDisconnect } from 'wagmi'
import { useConnectModal } from '@rainbow-me/rainbowkit'
import { useLemonWallet } from '@/hooks/use-lemon-wallet'
import { useFarcasterWallet } from '@/hooks/use-farcaster-wallet'

/**
 * Wallet type enum
 */
export enum WalletType {
  WAGMI = 'wagmi',
  LEMON = 'lemon',
  FARCASTER = 'farcaster',
}

/**
 * User context interface supporting multiple wallet types
 */
interface UserContextType {
  /** Connected wallet address */
  walletAddress: string | null
  /** Deprecated: Use connectWallet/disconnectWallet instead */
  setWalletAddress: (address: string | null) => void
  /** Connect wallet (auto-detects environment) */
  connectWallet: () => Promise<void>
  /** Disconnect wallet */
  disconnectWallet: () => void
  /** Whether connection is in progress */
  isConnecting: boolean
  /** Active wallet type */
  walletType: WalletType | null
  /** Farcaster user ID (if using Farcaster) */
  fid: number | null
}

const UserContext = createContext<UserContextType | undefined>(undefined)

/**
 * Provider that automatically detects and manages wallet connections
 * across Wagmi (web), Lemon Cash (mini app), and Farcaster (mini app)
 */
export function UserContextProvider({ children }: { children: React.ReactNode }) {
  // Wagmi hooks
  const { address: wagmiAddress, isConnected: wagmiConnected } = useAccount()
  const { disconnect: wagmiDisconnect } = useDisconnect()
  const { openConnectModal } = useConnectModal()
  const { isPending: wagmiConnecting } = useConnect()

  // Lemon hooks
  const lemon = useLemonWallet()

  // Farcaster hooks
  const farcaster = useFarcasterWallet()

  // Local state
  const [walletType, setWalletType] = useState<WalletType | null>(null)
  const [isAutoConnecting, setIsAutoConnecting] = useState(false)

  /**
   * Auto-detect environment and set wallet type on mount
   */
  useEffect(() => {
    const detectEnvironment = async () => {
      console.log('[UserContext] Detecting environment...')
      console.log('[UserContext] lemon.isLemonApp:', lemon.isLemonApp)
      console.log('[UserContext] farcaster.isInMiniApp:', farcaster.isInMiniApp)

      // Check Lemon first (synchronous check)
      if (lemon.isLemonApp) {
        console.log('[UserContext] ✅ Lemon detected!')
        setWalletType(WalletType.LEMON)
        // Auto-connect in Lemon app
        if (!lemon.isConnected) {
          console.log('[UserContext] Starting Lemon auto-connect...')
          setIsAutoConnecting(true)
          try {
            await lemon.connect()
            console.log('[UserContext] ✅ Lemon auto-connect successful!')
          } catch (error) {
            console.error('[UserContext] ❌ Auto-connect to Lemon failed:', error)
          } finally {
            setIsAutoConnecting(false)
          }
        } else {
          console.log('[UserContext] Lemon already connected')
        }
        return
      }

      // Check Farcaster (asynchronous check)
      if (farcaster.isInMiniApp) {
        console.log('[UserContext] ✅ Farcaster detected!')
        setWalletType(WalletType.FARCASTER)
        // Auto-connect in Farcaster app
        if (!farcaster.isConnected) {
          console.log('[UserContext] Starting Farcaster auto-connect...')
          setIsAutoConnecting(true)
          try {
            await farcaster.connect()
            console.log('[UserContext] ✅ Farcaster auto-connect successful!')
          } catch (error) {
            console.error('[UserContext] ❌ Auto-connect to Farcaster failed:', error)
          } finally {
            setIsAutoConnecting(false)
          }
        } else {
          console.log('[UserContext] Farcaster already connected')
        }
        return
      }

      // Default to Wagmi for standard web
      console.log('[UserContext] No Mini App detected, using Wagmi')
      setWalletType(WalletType.WAGMI)
    }

    detectEnvironment()
    // Only depend on the detection flags, not connection status
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lemon.isLemonApp, farcaster.isInMiniApp])

  /**
   * Get current wallet address based on active wallet type
   */
  const walletAddress = (() => {
    switch (walletType) {
      case WalletType.LEMON:
        return lemon.address
      case WalletType.FARCASTER:
        return farcaster.address
      case WalletType.WAGMI:
      default:
        return wagmiConnected && wagmiAddress ? wagmiAddress : null
    }
  })()

  /**
   * Get connection status based on active wallet type
   */
  const isConnecting = (() => {
    if (isAutoConnecting) return true
    switch (walletType) {
      case WalletType.LEMON:
        return lemon.isLoading
      case WalletType.FARCASTER:
        return farcaster.isLoading
      case WalletType.WAGMI:
      default:
        return wagmiConnecting
    }
  })()

  /**
   * Get Farcaster FID if using Farcaster wallet
   */
  const fid = walletType === WalletType.FARCASTER ? farcaster.fid : null

  /**
   * Connect wallet based on environment
   */
  const connectWallet = useCallback(async () => {
    switch (walletType) {
      case WalletType.LEMON:
        await lemon.connect()
        break
      case WalletType.FARCASTER:
        await farcaster.connect()
        break
      case WalletType.WAGMI:
      default:
        if (openConnectModal) {
          openConnectModal()
        }
        break
    }
  }, [walletType, lemon, farcaster, openConnectModal])

  /**
   * Disconnect wallet based on environment
   */
  const disconnectWallet = useCallback(() => {
    switch (walletType) {
      case WalletType.LEMON:
        lemon.disconnect()
        break
      case WalletType.FARCASTER:
        farcaster.disconnect()
        break
      case WalletType.WAGMI:
      default:
        wagmiDisconnect()
        break
    }
  }, [walletType, lemon, farcaster, wagmiDisconnect])

  /**
   * Deprecated: Use connectWallet/disconnectWallet instead
   */
  const setWalletAddress = useCallback((address: string | null) => {
    console.warn('setWalletAddress is deprecated. Use connectWallet/disconnectWallet instead.')
  }, [])

  return (
    <UserContext.Provider
      value={{
        walletAddress,
        setWalletAddress,
        connectWallet,
        disconnectWallet,
        isConnecting,
        walletType,
        fid,
      }}
    >
      {children}
    </UserContext.Provider>
  )
}

/**
 * Hook that provides wallet connection functionality across all wallet types
 * Automatically detects and manages Wagmi, Lemon, and Farcaster wallets
 */
export function useUserContext() {
  const context = useContext(UserContext)
  if (context === undefined) {
    throw new Error('useUserContext must be used within a UserContextProvider')
  }
  return context
}
