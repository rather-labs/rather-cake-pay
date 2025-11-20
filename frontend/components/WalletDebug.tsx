'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { useUserContext, WalletType } from '@/contexts/UserContext'
import { useLemonWallet } from '@/hooks/use-lemon-wallet'
import { useFarcasterWallet } from '@/hooks/use-farcaster-wallet'
import { formatAddress } from '@/lib/utils/format'
import { useAccount } from 'wagmi'
import { createPublicClient, http, formatEther, type Address } from 'viem'
import { sepolia } from 'viem/chains'
import { lemonClient } from '@/lib/lemon/client'
import { CONTRACT_ADDRESS_ETH_SEPOLIA, CAKE_FACTORY_CHAIN_ID } from '@/lib/contracts/cakeFactory'

const sepoliaClient = createPublicClient({
  chain: sepolia,
  transport: http('https://sepolia.gateway.tenderly.co'),
})

type ReactNativeWindow = Window & {
  ReactNativeWebView?: unknown
}

export function WalletDebug() {
  const [mounted, setMounted] = useState(false)
  const [isExpanded, setIsExpanded] = useState(true)
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'error'>('idle')
  const { walletType, walletAddress, isConnecting, connectWallet } = useUserContext()
  const lemon = useLemonWallet()
  const farcaster = useFarcasterWallet()
  const { chain } = useAccount()
  const [balanceStatus, setBalanceStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle')
  const [balanceValue, setBalanceValue] = useState<string>('')
  const [isTestingDeposit, setIsTestingDeposit] = useState(false)
  const [depositResult, setDepositResult] = useState<string>('')
  const [isTestingCreateCake, setIsTestingCreateCake] = useState(false)
  const [createCakeResult, setCreateCakeResult] = useState<string>('')

  // Only render after client-side mount to avoid hydration mismatch
  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!walletAddress || !walletAddress.startsWith('0x')) {
      setBalanceStatus('idle')
      setBalanceValue('')
      return
    }

    let cancelled = false

    const fetchBalance = async () => {
      setBalanceStatus('loading')
      try {
        const value = await sepoliaClient.getBalance({
          address: walletAddress as Address,
        })
        if (cancelled) return
        setBalanceValue(formatEther(value))
        setBalanceStatus('ready')
      } catch (error) {
        console.error('[WalletDebug] Failed to fetch Sepolia balance:', error)
        if (!cancelled) {
          setBalanceStatus('error')
        }
      }
    }

    fetchBalance()

    return () => {
      cancelled = true
    }
  }, [walletAddress])

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

  const handleCopyAddress = async () => {
    if (!walletAddress || typeof navigator === 'undefined' || !navigator.clipboard) {
      setCopyStatus('error')
      return
    }

    try {
      await navigator.clipboard.writeText(walletAddress)
      setCopyStatus('copied')
      setTimeout(() => setCopyStatus('idle'), 1500)
    } catch (error) {
      console.error('[WalletDebug] Copy failed:', error)
      setCopyStatus('error')
      setTimeout(() => setCopyStatus('idle'), 1500)
    }
  }

  const renderBalance = () => {
    if (!walletAddress) {
      return 'n/a'
    }

    if (!walletAddress.startsWith('0x')) {
      return 'Unsupported wallet format'
    }

    switch (balanceStatus) {
      case 'loading':
        return 'loading...'
      case 'error':
        return 'error fetching balance'
      case 'ready':
        return `${balanceValue || '0'} ETH`
      default:
        return 'n/a'
    }
  }

  const renderChain = () => {
    if (walletType === WalletType.LEMON) {
      return 'Ethereum Sepolia (Lemon Cash)'
    }

    if (walletType === WalletType.FARCASTER) {
      return 'Warpcast Mini App (host managed)'
    }

    if (chain?.name) {
      return `${chain.name} (ID: ${chain.id})`
    }

    return 'n/a'
  }

  const handleTestDeposit = async () => {
    if (!lemon.isLemonApp) {
      setDepositResult('❌ Not in Lemon app')
      return
    }

    if (!walletAddress) {
      setDepositResult('❌ No wallet connected')
      return
    }

    setIsTestingDeposit(true)
    setDepositResult('🔄 Testing callContract...')

    try {
      console.log('[WalletDebug] Testing Lemon callContract function')

      // Test with a simple USDC approve call on Sepolia
      // USDC Sepolia: 0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238
      const usdcSepoliaAddress = '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238'
      const spender = '0x0000000000000000000000000000000000000001' // Burn address for testing
      const amount = '1000000' // 1 USDC (6 decimals)

      const result = await lemonClient.callContract({
        contractAddress: usdcSepoliaAddress as Address,
        functionName: 'approve',
        args: [spender, amount],
        chainId: 11155111, // Sepolia
        value: '0',
      })

      console.log('[WalletDebug] callContract result:', result)

      if (result.result === 'SUCCESS' && result.data?.txHash) {
        setDepositResult(`✅ Success! TX: ${result.data.txHash.slice(0, 10)}...`)
      } else if (result.result === 'CANCELLED') {
        setDepositResult('⚠️ Transaction cancelled by user')
      } else if (result.result === 'FAILED') {
        setDepositResult(`❌ Failed: ${result.error?.message || 'Unknown error'}`)
      } else {
        setDepositResult('❌ Unexpected response')
      }
    } catch (error) {
      console.error('[WalletDebug] callContract test error:', error)
      setDepositResult(`❌ Error: ${error instanceof Error ? error.message : String(error)}`)
    } finally {
      setIsTestingDeposit(false)
    }
  }

  const handleTestCreateCake = async () => {
    if (!lemon.isLemonApp) {
      setCreateCakeResult('❌ Not in Lemon app')
      return
    }

    if (!walletAddress) {
      setCreateCakeResult('❌ No wallet connected')
      return
    }

    setIsTestingCreateCake(true)
    setCreateCakeResult('🔄 Testing createCake...')

    try {
      // Simulate the same data structure as dashboard
      const memberIds = ['1', '2'] // Test with user IDs 1 and 2
      const weights = [5000, 5000] // 50/50 split
      const interestRate = '500' // 5% = 500 BPS
      const billingPeriod = '2592000' // 30 days in seconds
      const tokenAddress = '0x0000000000000000000000000000000000000000' // ETH

      const formattedArgs = [
        tokenAddress as `0x${string}`,
        memberIds,
        weights,
        interestRate,
        billingPeriod,
      ]

      setCreateCakeResult(`📤 Args: ${JSON.stringify(formattedArgs).slice(0, 50)}...`)

      const result = await lemonClient.callContract({
        contractAddress: CONTRACT_ADDRESS_ETH_SEPOLIA,
        functionName: 'createCake',
        args: formattedArgs,
        chainId: CAKE_FACTORY_CHAIN_ID,
        value: '0',
      })

      if (result.result === 'SUCCESS' && result.data?.txHash) {
        setCreateCakeResult(`✅ Success! TX: ${result.data.txHash.slice(0, 10)}...`)
      } else if (result.result === 'CANCELLED') {
        setCreateCakeResult('⚠️ Transaction cancelled')
      } else if (result.result === 'FAILED') {
        setCreateCakeResult(`❌ Failed: ${result.error?.message || 'Unknown'}`)
      } else {
        setCreateCakeResult(`❌ Unexpected: ${JSON.stringify(result).slice(0, 100)}`)
      }
    } catch (error) {
      setCreateCakeResult(`❌ Error: ${error instanceof Error ? error.message : String(error)}`)
    } finally {
      setIsTestingCreateCake(false)
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
        <div className="flex items-center justify-between gap-2">
          <span>
            Context Address: {walletAddress ? formatAddress(walletAddress) : 'none'}
          </span>
          {walletAddress && (
            <button
              onClick={handleCopyAddress}
              className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-[10px]"
            >
              {copyStatus === 'copied' ? '✅ Copied' : copyStatus === 'error' ? '⚠️ Error' : 'Copy'}
            </button>
          )}
        </div>
        <div>ETH Balance: {renderBalance()}</div>
        <div>Context Loading: {isConnecting ? '✅' : '❌'}</div>
        <div>Connected Chain: {renderChain()}</div>

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
          <>
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

            <div className="border-t border-gray-600 my-2 pt-2">
              <button
                onClick={handleTestDeposit}
                disabled={isTestingDeposit}
                className="w-full bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-600 px-3 py-2 rounded text-sm font-medium mb-2"
              >
                {isTestingDeposit ? '⏳ Testing...' : '🧪 Test callContract (USDC Approve)'}
              </button>
              {depositResult && (
                <div className="text-[10px] text-gray-200 mt-1 p-2 bg-black/30 rounded break-all">
                  {depositResult}
                </div>
              )}
              <div className="text-[10px] text-gray-400 mt-1 mb-3">
                Tests callContract with USDC approve on Sepolia
              </div>

              <button
                onClick={handleTestCreateCake}
                disabled={isTestingCreateCake}
                className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 px-3 py-2 rounded text-sm font-medium mb-2"
              >
                {isTestingCreateCake ? '⏳ Testing...' : '🍰 Test createCake'}
              </button>
              {createCakeResult && (
                <div className="text-[10px] text-gray-200 mt-1 p-2 bg-black/30 rounded break-all">
                  {createCakeResult}
                </div>
              )}
              <div className="text-[10px] text-gray-400 mt-1">
                Tests createCake with dummy data
              </div>
            </div>
          </>
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
