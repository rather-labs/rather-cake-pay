'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { useUserContext, WalletType } from '@/contexts/UserContext'
import { useLemonWallet } from '@/hooks/use-lemon-wallet'
import { useFarcasterWallet } from '@/hooks/use-farcaster-wallet'
import { formatAddress } from '@/lib/utils/format'

type ReactNativeWindow = Window & {
  ReactNativeWebView?: unknown
}

export function WalletDebug() {
  const [mounted, setMounted] = useState(false)
  const [isExpanded, setIsExpanded] = useState(true)
  const { walletType, walletAddress, isConnecting, connectWallet } = useUserContext()
  const lemon = useLemonWallet()
  const farcaster = useFarcasterWallet()

  // Only render after client-side mount to avoid hydration mismatch
  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return null
  }

  const hasReactNativeWebView =
    typeof window !== 'undefined' &&
    Boolean((window as ReactNativeWindow).ReactNativeWebView)

  // Collapsed view - just a small toggle button
  if (!isExpanded) {
    return (
      <button
        onClick={() => setIsExpanded(true)}
        className="fixed bottom-4 right-4 bg-black/90 text-white p-3 rounded-lg text-xs z-50 hover:bg-black"
      >
        🔍 Debug
      </button>
    )
  }

  const handleManualConnect = async () => {
    try {
      console.log('[WalletDebug] Manual connect clicked')
      console.log('[WalletDebug] walletType:', walletType)
      console.log('[WalletDebug] lemon.isLemonApp:', lemon.isLemonApp)

      await connectWallet()

      console.log('[WalletDebug] Connect completed successfully')
    } catch (error) {
      console.error('[WalletDebug] Manual connect failed:', error)
      // Show alert since console isn't accessible
      alert(`Connection failed: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  return (
    <div className="fixed bottom-4 right-4 bg-black/90 text-white p-4 rounded-lg text-xs max-w-sm z-50 max-h-[80vh] overflow-y-auto">
      <div className="flex justify-between items-center mb-2">
        <div className="font-bold">Wallet Debug Info</div>
        <button
          onClick={() => setIsExpanded(false)}
          className="text-gray-400 hover:text-white"
        >
          ✕
        </button>
      </div>

      <div className="space-y-1">
        <div>Context Wallet Type: {walletType || 'null'}</div>
        <div>Context Address: {walletAddress ? formatAddress(walletAddress) : 'none'}</div>
        <div>Context Loading: {isConnecting ? '✅' : '❌'}</div>

        <div className="border-t border-gray-600 my-2 pt-2">
          <div className="font-semibold">Lemon Hook:</div>
          <div>isLemonApp: {lemon.isLemonApp ? '✅ YES' : '❌ NO'}</div>
          <div>isConnected: {lemon.isConnected ? '✅' : '❌'}</div>
          <div>isLoading: {lemon.isLoading ? '✅' : '❌'}</div>
          <div>address: {lemon.address || 'null'}</div>
        </div>

        <div className="border-t border-gray-600 my-2 pt-2">
          <div className="font-semibold">Farcaster Hook:</div>
          <div>isInMiniApp: {farcaster.isInMiniApp ? '✅ YES' : '❌ NO'}</div>
          <div>isConnected: {farcaster.isConnected ? '✅' : '❌'}</div>
          <div>isLoading: {farcaster.isLoading ? '✅' : '❌'}</div>
          <div>address: {farcaster.address || 'null'}</div>
        </div>

        <div className="border-t border-gray-600 my-2 pt-2">
          <div>window.ReactNativeWebView: {hasReactNativeWebView ? '✅ EXISTS' : '❌ NONE'}</div>
        </div>

        {walletType === WalletType.LEMON && (
          <div className="mt-2 p-2 bg-green-700 rounded flex items-center gap-2">
            <Image
              src="/lemon-logo.svg"
              alt="Lemon"
              width={60}
              height={16}
              className="h-4 w-auto"
            />
            <span>Lemon Detected!</span>
          </div>
        )}
        {walletType === WalletType.FARCASTER && (
          <div className="mt-2 p-2 bg-purple-700 rounded">
            🟣 Farcaster Detected!
          </div>
        )}
        {walletType === WalletType.WAGMI && (
          <div className="mt-2 p-2 bg-blue-700 rounded">
            🌐 Standard Web (Wagmi)
          </div>
        )}

        {walletType === WalletType.WAGMI && (
          <div className="border-t border-gray-600 my-2 pt-2">
            <button
              onClick={handleManualConnect}
              disabled={isConnecting}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 px-3 py-2 rounded text-sm font-medium"
            >
              {isConnecting ? '⏳ Connecting...' : '🔗 Manual Connect'}
            </button>
            <div className="text-[10px] text-gray-400 mt-1">
              Click to open wallet connection modal
            </div>
          </div>
        )}

        <div className="border-t border-gray-600 my-2 pt-2">
          <div className="text-[10px] text-gray-400">
            Check browser console for detailed logs
          </div>
        </div>
      </div>
    </div>
  )
}
