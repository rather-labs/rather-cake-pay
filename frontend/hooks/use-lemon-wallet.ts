'use client'

import { useState, useEffect, useCallback } from 'react'
import { authenticate, isWebView, TransactionResult, ChainId } from '@lemoncash/mini-app-sdk'

interface UseLemonWalletReturn {
  /** Wallet address if authenticated */
  address: string | null
  /** Whether wallet is connected */
  isConnected: boolean
  /** Whether running in Lemon Cash app */
  isLemonApp: boolean
  /** Authentication signature data */
  signature: { wallet: string; signature: string; message: string } | null
  /** Whether authentication is in progress */
  isLoading: boolean
  /** Authenticate with Lemon Cash wallet */
  connect: () => Promise<void>
  /** Clear wallet connection state */
  disconnect: () => void
}

/**
 * React hook for Lemon Cash wallet integration
 * Simplified to match the working direct implementation
 */
export function useLemonWallet(): UseLemonWalletReturn {
  const [address, setAddress] = useState<string | null>(null)
  const [signature, setSignature] = useState<{ wallet: string; signature: string; message: string } | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isLemonApp, setIsLemonApp] = useState(false)

  // Detect Lemon WebView environment on mount
  useEffect(() => {
    const detected = isWebView()
    console.log('[useLemonWallet] isWebView():', detected)
    setIsLemonApp(detected)
  }, [])

  /**
   * Authenticate with Lemon Cash wallet - simplified version
   */
  const connect = useCallback(async () => {
    console.log('[useLemonWallet] connect() called')

    if (!isWebView()) {
      throw new Error('Not running in Lemon Cash app')
    }

    setIsLoading(true)
    try {
      console.log('[useLemonWallet] Calling authenticate()...')
      const result = await authenticate({ chainId: ChainId.ETH_SEPOLIA })
      console.log('[useLemonWallet] Result:', result)

      if (result.result === TransactionResult.SUCCESS) {
        console.log('[useLemonWallet] ✅ SUCCESS! Wallet:', result.data.wallet)
        setAddress(result.data.wallet)
        setSignature({
          wallet: result.data.wallet,
          signature: result.data.signature,
          message: result.data.message,
        })
      } else if (result.result === TransactionResult.FAILED) {
        const errorMsg = result.error?.message || 'Authentication failed'
        console.error('[useLemonWallet] ❌ FAILED:', errorMsg)
        throw new Error(errorMsg)
      } else {
        console.log('[useLemonWallet] ⚠️ CANCELLED')
        throw new Error('Authentication cancelled by user')
      }
    } catch (error) {
      console.error('[useLemonWallet] ❌ Exception:', error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }, [])

  /**
   * Clear wallet connection state
   */
  const disconnect = useCallback(() => {
    setAddress(null)
    setSignature(null)
  }, [])

  return {
    address,
    isConnected: !!address,
    isLemonApp,
    signature,
    isLoading,
    connect,
    disconnect,
  }
}
