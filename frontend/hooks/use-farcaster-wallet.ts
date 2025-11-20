'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  farcasterClient,
  type FarcasterAuthToken,
  type FarcasterContext,
} from '@/lib/farcaster/client'

interface UseFarcasterWalletReturn {
  /** Ethereum wallet address if authenticated */
  address: string | null
  /** Whether wallet is connected */
  isConnected: boolean
  /** Whether running in Farcaster Mini App */
  isInMiniApp: boolean
  /** Farcaster user ID (FID) */
  fid: number | null
  /** Quick Auth JWT token */
  authToken: FarcasterAuthToken | null
  /** Farcaster context (user info and app context) */
  context: FarcasterContext | null
  /** Whether authentication is in progress */
  isLoading: boolean
  /** Authenticate and get Ethereum wallet address */
  connect: () => Promise<void>
  /** Clear wallet connection state */
  disconnect: () => void
  /** Access to underlying Farcaster SDK client */
  farcasterClient: typeof farcasterClient
}

/**
 * React hook for Farcaster Mini App wallet integration
 *
 * Provides Quick Auth authentication and Ethereum wallet access
 * for Farcaster/Warpcast Mini Apps.
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { address, fid, isConnected, isInMiniApp, connect } = useFarcasterWallet()
 *
 *   if (!isInMiniApp) {
 *     return <div>Please open in Farcaster app</div>
 *   }
 *
 *   if (!isConnected) {
 *     return <button onClick={connect}>Connect Wallet</button>
 *   }
 *
 *   return (
 *     <div>
 *       <div>FID: {fid}</div>
 *       <div>Address: {address}</div>
 *     </div>
 *   )
 * }
 * ```
 */
export function useFarcasterWallet(): UseFarcasterWalletReturn {
  const [address, setAddress] = useState<string | null>(null)
  const [fid, setFid] = useState<number | null>(null)
  const [authToken, setAuthToken] = useState<FarcasterAuthToken | null>(null)
  const [context, setContext] = useState<FarcasterContext | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isInMiniApp, setIsInMiniApp] = useState(false)
  const readySignaledRef = useRef(false)

  const signalReady = useCallback(async () => {
    if (readySignaledRef.current) {
      return
    }
    try {
      await farcasterClient.ready()
      readySignaledRef.current = true
    } catch (error) {
      console.error('Failed to signal Farcaster ready state:', error)
    }
  }, [])

  // Detect Farcaster Mini App environment on mount
  useEffect(() => {
    const checkEnvironment = async () => {
      const inMiniApp = await farcasterClient.isInMiniApp()
      setIsInMiniApp(inMiniApp)

      if (!inMiniApp) {
        return
      }

      // If in Mini App, automatically get context
      try {
        const ctx = await farcasterClient.getContext()
        setContext(ctx)
        // Extract FID from context
        if (ctx.user?.fid) {
          setFid(ctx.user.fid)
        }
      } catch (error) {
        console.error('Failed to get Farcaster context:', error)
      }

      await signalReady()
    }

    checkEnvironment()
  }, [signalReady])

  /**
   * Authenticate with Farcaster and connect Ethereum wallet
   */
  const connect = useCallback(async () => {
    if (!isInMiniApp) {
      throw new Error('Not running in Farcaster Mini App')
    }

    setIsLoading(true)
    try {
      // Get Quick Auth token
      const token = await farcasterClient.getAuthToken()
      setAuthToken(token)

      // Get Ethereum provider and request accounts
      const provider = await farcasterClient.getEthereumProvider()
      if (provider) {
        const accounts = await provider.request({
          method: 'eth_requestAccounts',
        })

        if (accounts && accounts.length > 0) {
          setAddress(accounts[0] as string)
        }
      }

      await signalReady()
    } catch (error) {
      console.error('Farcaster wallet connection failed:', error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }, [isInMiniApp, signalReady])

  /**
   * Clear wallet connection state
   */
  const disconnect = useCallback(() => {
    setAddress(null)
    setAuthToken(null)
  }, [])

  return {
    address,
    isConnected: !!address,
    isInMiniApp,
    fid,
    authToken,
    context,
    isLoading,
    connect,
    disconnect,
    farcasterClient,
  }
}
