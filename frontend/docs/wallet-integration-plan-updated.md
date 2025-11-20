# Multi-Wallet Integration Plan (Updated)

**Project**: Rather Cake Pay
**Date**: 2025-01-20 (Updated)
**Status**: Wagmi/RainbowKit ✅ Already Implemented | Lemon & Farcaster 🚧 To Be Implemented

---

## Executive Summary

Analysis of the current codebase shows that **Wagmi with RainbowKit is already fully implemented**. This update focuses on adding Lemon Cash and Farcaster Mini App integrations while maintaining compatibility with the existing Wagmi implementation.

---

## Current State Analysis

### ✅ Already Implemented (Wagmi + RainbowKit)

**Installed Dependencies:**
- `wagmi` v2.19.4
- `viem` v2.39.3
- `@tanstack/react-query` v5.90.10
- `@wagmi/connectors`
- `@rainbow-me/rainbowkit` v2.2.9

**Files Created:**
- ✅ `frontend/lib/wagmi/config.ts` - Wagmi configuration with RainbowKit
- ✅ `frontend/app/providers.tsx` - Wagmi + RainbowKit + React Query providers
- ✅ `frontend/contexts/UserContext.tsx` - Wallet context using Wagmi hooks
- ✅ `frontend/app/layout.tsx` - Root layout with providers
- ✅ `frontend/app/dashboard/page.tsx` - Using `ConnectButton` from RainbowKit

**Current Implementation:**
```typescript
// frontend/lib/wagmi/config.ts
export const config = getDefaultConfig({
  appName: 'CakePay',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'YOUR_PROJECT_ID',
  chains: [mainnet, sepolia, localhost],
  ssr: true,
})

// frontend/contexts/UserContext.tsx
export function useUserContext() {
  const { address, isConnected } = useAccount()
  const { disconnect } = useDisconnect()
  const { openConnectModal } = useConnectModal()

  return {
    walletAddress,
    connectWallet,
    disconnectWallet,
    isConnecting,
  }
}
```

**What's Working:**
- ✅ Standard Web3 wallet connections (MetaMask, WalletConnect, etc.)
- ✅ RainbowKit modal for wallet selection
- ✅ `useUserContext()` hook provides wallet address
- ✅ `ConnectButton` component in dashboard
- ✅ SSR support enabled

### 🚧 To Be Implemented

**Installed SDKs:**
- ✅ `@lemoncash/mini-app-sdk` - Installed but not configured
- ✅ `@farcaster/miniapp-sdk` - Installed but not configured
- ✅ `@farcaster/quick-auth` - Installed but not configured

**Missing:**
- ❌ Lemon SDK client and hooks
- ❌ Farcaster SDK client and hooks
- ❌ Environment detection (Lemon vs Farcaster vs Web)
- ❌ Auto-connection in native apps
- ❌ Unified wallet abstraction layer

---

## Updated Architecture

### Three-Tier System

```
┌─────────────────────────────────────────────────┐
│     Enhanced UserContext (Unified Layer)       │
│  - Detects environment (web, Lemon, Farcaster) │
│  - Auto-connects in native apps                │
│  - Maintains backward compatibility            │
└─────────────────────────────────────────────────┘
                      │
        ┌─────────────┼─────────────┐
        │             │             │
   ┌────▼───┐   ┌────▼───┐   ┌─────▼────┐
   │ Wagmi  │   │ Lemon  │   │ Farcaster│
   │Rainbow │   │  SDK   │   │   SDK    │
   │  Kit   │   │        │   │          │
   └────────┘   └────────┘   └──────────┘
  ✅ DONE      🚧 TODO      🚧 TODO
```

### Strategy

Instead of replacing the existing implementation, we'll **extend** it:

1. Keep existing Wagmi/RainbowKit implementation as-is
2. Add Lemon and Farcaster SDKs alongside
3. Enhance `UserContext` to detect environment and auto-select SDK
4. Maintain backward compatibility with existing code

---

## Implementation Plan

### Phase 1: Lemon Cash Integration (Priority 1)

#### 1.1 Create Lemon SDK Client

**File**: `frontend/lib/lemon/client.ts`

```typescript
import {
  authenticate,
  isWebView,
  TransactionResult,
  callSmartContract,
  deposit,
  withdraw,
  ChainId
} from '@lemoncash/mini-app-sdk'

export const lemonClient = {
  isLemonApp: () => isWebView(),

  authenticate: async () => {
    if (!isWebView()) {
      throw new Error('Not in Lemon Cash WebView')
    }

    const result = await authenticate()

    if (result.result === TransactionResult.SUCCESS) {
      return {
        wallet: result.data.wallet,
        signature: result.data.signature,
        message: result.data.message,
      }
    }

    if (result.result === TransactionResult.FAILED) {
      throw new Error(result.error?.message || 'Authentication failed')
    }

    throw new Error('Authentication cancelled by user')
  },

  deposit: async (amount: string, tokenName: string) => {
    return await deposit({ amount, tokenName })
  },

  withdraw: async (amount: string, tokenName: string) => {
    return await withdraw({ amount, tokenName })
  },

  callContract: async (params: {
    contractAddress: string
    functionName: string
    args: any[]
    value?: string
    chainId: ChainId
    permits?: any[]
  }) => {
    return await callSmartContract({
      contracts: [{
        contractAddress: params.contractAddress,
        functionName: params.functionName,
        args: params.args,
        value: params.value || '0',
        chainId: params.chainId,
        permits: params.permits,
      }]
    })
  },
}
```

#### 1.2 Create Lemon Wallet Hook

**File**: `frontend/hooks/use-lemon-wallet.ts`

```typescript
'use client'

import { useState, useEffect } from 'react'
import { lemonClient } from '@/lib/lemon/client'

export function useLemonWallet() {
  const [wallet, setWallet] = useState<string | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [isLemonApp, setIsLemonApp] = useState(false)
  const [signature, setSignature] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    setIsLemonApp(lemonClient.isLemonApp())
  }, [])

  const connect = async () => {
    setIsLoading(true)
    try {
      const auth = await lemonClient.authenticate()
      setWallet(auth.wallet)
      setSignature(auth.signature)
      setIsConnected(true)
      return auth
    } catch (error) {
      console.error('Lemon authentication failed:', error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  const disconnect = () => {
    setWallet(null)
    setSignature(null)
    setIsConnected(false)
  }

  return {
    address: wallet,
    isConnected,
    isLemonApp,
    signature,
    isLoading,
    connect,
    disconnect,
    lemonClient,
  }
}
```

---

### Phase 2: Farcaster Integration (Priority 2)

#### 2.1 Create Farcaster SDK Client

**File**: `frontend/lib/farcaster/client.ts`

```typescript
import { sdk } from '@farcaster/miniapp-sdk'

export const farcasterClient = {
  isInMiniApp: async () => {
    return await sdk.isInMiniApp()
  },

  ready: async () => {
    await sdk.actions.ready()
  },

  quickAuth: {
    getToken: async (force = false) => {
      return await sdk.quickAuth.getToken({ force })
    },

    fetch: async (url: string, options?: RequestInit) => {
      return await sdk.quickAuth.fetch(url, options)
    },
  },

  getEthereumProvider: async () => {
    return await sdk.wallet.getEthereumProvider()
  },

  signIn: async (nonce: string) => {
    return await sdk.actions.signIn({
      nonce,
      acceptAuthAddress: true
    })
  },

  getContext: () => sdk.context,

  getCapabilities: async () => {
    return await sdk.getCapabilities()
  },

  actions: {
    composeCast: async (text: string, embeds?: string[]) => {
      return await sdk.actions.composeCast({ text, embeds })
    },

    viewProfile: async (fid: number) => {
      return await sdk.actions.viewProfile({ fid })
    },

    close: async () => {
      return await sdk.actions.close()
    },
  },
}
```

#### 2.2 Create Farcaster Wallet Hook

**File**: `frontend/hooks/use-farcaster-wallet.ts`

```typescript
'use client'

import { useState, useEffect } from 'react'
import { farcasterClient } from '@/lib/farcaster/client'

export function useFarcasterWallet() {
  const [address, setAddress] = useState<string | null>(null)
  const [fid, setFid] = useState<number | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [isFarcasterApp, setIsFarcasterApp] = useState(false)
  const [provider, setProvider] = useState<any>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    const checkEnvironment = async () => {
      const isInApp = await farcasterClient.isInMiniApp()
      setIsFarcasterApp(isInApp)

      if (isInApp) {
        // CRITICAL: Must call ready() to hide splash screen
        await farcasterClient.ready()
      }
    }

    checkEnvironment()
  }, [])

  const connect = async () => {
    setIsLoading(true)
    try {
      const { token: authToken } = await farcasterClient.quickAuth.getToken()
      setToken(authToken)

      // Decode JWT to get FID
      const payload = JSON.parse(atob(authToken.split('.')[1]))
      setFid(payload.sub)

      // Get Ethereum provider
      const ethProvider = await farcasterClient.getEthereumProvider()
      setProvider(ethProvider)

      // Get wallet address
      const accounts = await ethProvider.request({
        method: 'eth_requestAccounts'
      })
      setAddress(accounts[0])
      setIsConnected(true)

      return {
        address: accounts[0],
        fid: payload.sub,
        token: authToken
      }
    } catch (error) {
      console.error('Farcaster Quick Auth failed:', error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  const disconnect = () => {
    setAddress(null)
    setFid(null)
    setIsConnected(false)
    setProvider(null)
    setToken(null)
  }

  return {
    address,
    fid,
    isConnected,
    isFarcasterApp,
    provider,
    token,
    isLoading,
    connect,
    disconnect,
    farcasterClient,
  }
}
```

> ✅ **Ready handshake guard**: The hook now calls `sdk.actions.ready()` as soon as it detects the Farcaster Mini App environment (and guards against duplicate calls). This prevents the Warpcast preview warning about "`sdk.actions.ready()` not called" while still allowing subsequent manual connections to reuse the same handshake.

#### 2.3 Create Farcaster Manifest

**File**: `public/.well-known/farcaster.json`

```json
{
  "accountAssociation": {
    "header": "WILL_BE_GENERATED",
    "payload": "WILL_BE_GENERATED",
    "signature": "WILL_BE_GENERATED"
  },
  "miniapp": {
    "version": "1",
    "name": "Rather Cake Pay",
    "iconUrl": "https://your-domain.com/icon.png",
    "homeUrl": "https://your-domain.com",
    "imageUrl": "https://your-domain.com/og-image.png",
    "buttonTitle": "Split Bills",
    "splashImageUrl": "https://your-domain.com/splash.png",
    "splashBackgroundColor": "#FF69B4",
    "requiredChains": ["eip155:1", "eip155:11155111"],
    "requiredCapabilities": [
      "actions.signIn",
      "wallet.getEthereumProvider"
    ]
  }
}
```

---

### Phase 3: Enhanced UserContext (Unified Layer)

#### 3.1 Update UserContext to Support All Three

**File**: `frontend/contexts/UserContext.tsx` (Enhanced)

```typescript
'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { useAccount, useConnect, useDisconnect } from 'wagmi'
import { useConnectModal } from '@rainbow-me/rainbowkit'
import { useLemonWallet } from '@/hooks/use-lemon-wallet'
import { useFarcasterWallet } from '@/hooks/use-farcaster-wallet'

type WalletType = 'wagmi' | 'lemon' | 'farcaster' | null

interface UserContextType {
  walletAddress: string | null
  walletType: WalletType
  fid?: number | null
  connectWallet: () => Promise<void>
  disconnectWallet: () => void
  isConnecting: boolean
  setWalletAddress: (address: string | null) => void  // Deprecated but kept for compatibility
}

const UserContext = createContext<UserContextType | undefined>(undefined)

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

  const [walletType, setWalletType] = useState<WalletType>(null)

  // Auto-detect and connect in native apps
  useEffect(() => {
    const autoConnect = async () => {
      if (lemon.isLemonApp && !lemon.isConnected) {
        setWalletType('lemon')
        try {
          await lemon.connect()
        } catch (error) {
          console.error('Auto-connect to Lemon failed:', error)
        }
      } else if (farcaster.isFarcasterApp && !farcaster.isConnected) {
        setWalletType('farcaster')
        try {
          await farcaster.connect()
        } catch (error) {
          console.error('Auto-connect to Farcaster failed:', error)
        }
      } else if (wagmiConnected) {
        // If Wagmi is already connected (from previous session)
        setWalletType('wagmi')
      }
    }

    autoConnect()
  }, [lemon.isLemonApp, farcaster.isFarcasterApp, wagmiConnected])

  const walletAddress =
    walletType === 'wagmi' ? (wagmiAddress || null) :
    walletType === 'lemon' ? lemon.address :
    walletType === 'farcaster' ? farcaster.address :
    null

  const isConnecting =
    walletType === 'wagmi' ? wagmiConnecting :
    walletType === 'lemon' ? lemon.isLoading :
    walletType === 'farcaster' ? farcaster.isLoading :
    false

  const connectWallet = async () => {
    // In native apps, auto-connection should handle this
    if (lemon.isLemonApp) {
      setWalletType('lemon')
      await lemon.connect()
    } else if (farcaster.isFarcasterApp) {
      setWalletType('farcaster')
      await farcaster.connect()
    } else {
      // Standard web - use RainbowKit
      setWalletType('wagmi')
      if (openConnectModal) {
        openConnectModal()
      }
    }
  }

  const disconnectWallet = () => {
    if (walletType === 'wagmi') {
      wagmiDisconnect()
    } else if (walletType === 'lemon') {
      lemon.disconnect()
    } else if (walletType === 'farcaster') {
      farcaster.disconnect()
    }
    setWalletType(null)
  }

  const value: UserContextType = {
    walletAddress,
    walletType,
    fid: walletType === 'farcaster' ? farcaster.fid : null,
    connectWallet,
    disconnectWallet,
    isConnecting,
    setWalletAddress: () => {
      console.warn('setWalletAddress is deprecated')
    },
  }

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>
}

export function useUserContext() {
  const context = useContext(UserContext)
  if (!context) {
    throw new Error('useUserContext must be used within UserContextProvider')
  }
  return context
}
```

#### 3.2 Update Providers

**File**: `frontend/app/providers.tsx` (Enhanced)

```typescript
'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WagmiProvider } from 'wagmi'
import { RainbowKitProvider } from '@rainbow-me/rainbowkit'
import { UserContextProvider } from '@/contexts/UserContext'
import { config } from '@/lib/wagmi/config'
import '@rainbow-me/rainbowkit/styles.css'

const queryClient = new QueryClient()

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>
          <UserContextProvider>
            {children}
          </UserContextProvider>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}
```

---

## Implementation Checklist

### Phase 1: Lemon Integration

- [ ] Create `frontend/lib/lemon/client.ts`
- [ ] Create `frontend/hooks/use-lemon-wallet.ts`
- [ ] Test Lemon WebView detection
- [ ] Test authentication flow in Lemon app

### Phase 2: Farcaster Integration

- [ ] Create `frontend/lib/farcaster/client.ts`
- [ ] Create `frontend/hooks/use-farcaster-wallet.ts`
- [ ] Create `public/.well-known/farcaster.json`
- [ ] Generate manifest signature at [farcaster.xyz/developers](https://farcaster.xyz/~/developers/mini-apps/manifest)
- [ ] Test in Farcaster/Warpcast

### Phase 3: Unified Layer

- [ ] Enhance `frontend/contexts/UserContext.tsx`
- [ ] Update `frontend/app/providers.tsx`
- [ ] Test auto-detection logic
- [ ] Test all three wallet types
- [ ] Verify backward compatibility

### Phase 4: Testing

- [ ] Test Wagmi/RainbowKit (existing - should still work)
- [ ] Test Lemon Cash app integration
- [ ] Test Farcaster Mini App integration
- [ ] Test switching between wallet types
- [ ] Test with existing dashboard code

---

## Environment Variables

Update `.env.local` with:

```bash
# Existing (Wagmi)
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id_here

# Existing (Contract)
NEXT_PUBLIC_CONTRACT_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3
NEXT_PUBLIC_CHAIN_ID=1337
NEXT_PUBLIC_RPC_URL=http://127.0.0.1:8545

# Existing (Supabase)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# New (Farcaster - optional)
NEXT_PUBLIC_FARCASTER_QUICK_AUTH_SERVER=https://auth.farcaster.xyz
```

---

## Backward Compatibility

### Existing Code Will Continue to Work

All existing code using `useUserContext()` will continue to work:

```typescript
// This still works exactly as before
const { walletAddress, connectWallet, disconnectWallet } = useUserContext()
```

New features are additive:

```typescript
// New features available if needed
const { walletType, fid } = useUserContext()

// Check wallet type
if (walletType === 'farcaster') {
  console.log('User FID:', fid)
}
```

### RainbowKit ConnectButton

The `<ConnectButton />` from RainbowKit will continue to work in standard web environments. In Lemon/Farcaster apps, the auto-connection will take precedence.

---

## Testing Strategy

### 1. Local Testing (Wagmi - Already Works)

```bash
npm run dev
# Test with MetaMask, WalletConnect, etc.
```

### 2. Lemon Cash Testing

1. Deploy to public URL (Vercel recommended)
2. Configure testnet (Polygon Mumbai or Sepolia)
3. Get deeplink: `lemon://miniapp?url=https://your-app.vercel.app`
4. Open in Lemon Cash app
5. Get testnet tokens from [Alchemy Faucet](https://www.alchemy.com/faucets)

### 3. Farcaster Testing

1. Enable Developer Mode in Farcaster
2. Create manifest signature
3. Deploy to production
4. Use Farcaster developer preview tool

---

## Next Steps

1. **Start with Lemon Integration** (Phase 1)
   - Create client and hook files
   - Test WebView detection
   - Test authentication

2. **Then Farcaster Integration** (Phase 2)
   - Create client and hook files
   - Set up manifest
   - Test Quick Auth

3. **Finally Unified Layer** (Phase 3)
   - Enhance UserContext
   - Add auto-detection
   - Test all scenarios

4. **Comprehensive Testing** (Phase 4)
   - Test each wallet type
   - Verify existing code still works
   - Test edge cases

---

## Summary of Changes

### What We're Keeping
- ✅ All existing Wagmi/RainbowKit code
- ✅ `UserContext` API (enhanced, not replaced)
- ✅ `<ConnectButton />` usage
- ✅ Existing provider structure

### What We're Adding
- 🆕 Lemon SDK client and hooks
- 🆕 Farcaster SDK client and hooks
- 🆕 Auto-detection and auto-connection
- 🆕 Wallet type tracking
- 🆕 FID support (Farcaster)

### What's Unchanged
- ✅ Existing dashboard code
- ✅ Existing hooks (use-current-user, use-cakes, etc.)
- ✅ All business logic
- ✅ Database integration

This approach ensures a smooth, non-breaking integration of Lemon and Farcaster SDKs while preserving all existing functionality.
