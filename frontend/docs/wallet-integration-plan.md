# Multi-Wallet Integration Plan

**Project**: Rather Cake Pay
**Date**: 2025-01-19
**Purpose**: Implement three different wallet connection methods for maximum compatibility

---

## Table of Contents

1. [Current State Analysis](#current-state-analysis)
2. [Architecture Overview](#architecture-overview)
3. [Integration 1: Wagmi (Standard Web3)](#integration-1-wagmi-standard-web3)
4. [Integration 2: Lemon MiniApp SDK](#integration-2-lemon-miniapp-sdk)
5. [Integration 3: Farcaster MiniApp SDK](#integration-3-farcaster-miniapp-sdk)
6. [Unified Wallet Context](#unified-wallet-context)
7. [Implementation Checklist](#implementation-checklist)
8. [Environment Variables](#environment-variables)
9. [Testing Strategy](#testing-strategy)

---

## Current State Analysis

### Existing Infrastructure

- **Framework**: Next.js 14 with App Router
- **Styling**: Tailwind CSS with pixel-art theme
- **Database**: Supabase for off-chain data
- **Blockchain**: Ethers.js v6 (installed but not used)
- **State**: Currently using `TEST_USER_ID` hardcoded value
- **Wallet Connection**: None implemented

### Files to Update

- `frontend/app/layout.tsx` - Add wallet providers
- `frontend/app/dashboard/page.tsx` - Replace hardcoded user with wallet address
- `frontend/components/ui/` - Add wallet connection components

---

## Architecture Overview

### Three-Tier Wallet System

```
┌─────────────────────────────────────────────────┐
│          Wallet Provider (Context)              │
│  - Detects environment (web3, Lemon, Farcaster) │
│  - Manages connection state                     │
│  - Exposes unified interface                    │
└─────────────────────────────────────────────────┘
                      │
        ┌─────────────┼─────────────┐
        │             │             │
   ┌────▼───┐   ┌────▼───┐   ┌─────▼────┐
   │ Wagmi  │   │ Lemon  │   │ Farcaster│
   │Connector│   │  SDK   │   │   SDK    │
   └────────┘   └────────┘   └──────────┘
```

### Auto-Detection Logic

1. **On mount**: Check if running in Lemon Cash WebView
2. **On mount**: Check if running in Farcaster Mini App
3. **Fallback**: Show standard Web3 connection options (Wagmi)

### Unified Interface

```typescript
interface WalletContextType {
  address: string | null
  isConnected: boolean
  walletType: 'wagmi' | 'lemon' | 'farcaster' | null
  connect: (type?: WalletType) => Promise<void>
  disconnect: () => void
  chainId?: number
  fid?: number | null  // Farcaster ID (only for Farcaster)
}
```

---

## Integration 1: Wagmi (Standard Web3)

### Purpose

Allow users to connect with standard Web3 wallets when accessing the app through a regular browser:
- MetaMask
- WalletConnect
- Coinbase Wallet
- Injected wallets

### Dependencies

```bash
npm install wagmi viem @tanstack/react-query @wagmi/connectors
```

### File Structure

```
frontend/
├── lib/
│   └── wagmi/
│       └── config.ts              # Wagmi configuration
├── components/
│   └── providers/
│       └── wagmi-provider.tsx     # Wagmi + React Query wrapper
└── hooks/
    └── use-wagmi-wallet.ts        # Wagmi wallet hook
```

### Implementation Steps

#### Step 1: Create Wagmi Configuration

**File**: `frontend/lib/wagmi/config.ts`

```typescript
import { http, createConfig } from 'wagmi'
import { mainnet, sepolia, polygon, base } from 'wagmi/chains'
import { injected, walletConnect, metaMask, coinbaseWallet } from 'wagmi/connectors'

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID!

export const wagmiConfig = createConfig({
  chains: [mainnet, sepolia, polygon, base],
  connectors: [
    injected(),
    metaMask(),
    walletConnect({ projectId }),
    coinbaseWallet({ appName: 'Rather Cake Pay' }),
  ],
  transports: {
    [mainnet.id]: http(),
    [sepolia.id]: http(),
    [polygon.id]: http(),
    [base.id]: http(),
  },
})
```

**Key Points**:
- Supports multiple chains (Mainnet, Sepolia testnet, Polygon, Base)
- Includes popular wallet connectors
- Requires WalletConnect Project ID

#### Step 2: Create Wagmi Provider Wrapper

**File**: `frontend/components/providers/wagmi-provider.tsx`

```typescript
'use client'

import { WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { wagmiConfig } from '@/lib/wagmi/config'
import { useState } from 'react'

export function WagmiProviderWrapper({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient())

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  )
}
```

**Key Points**:
- Wraps app with Wagmi and React Query providers
- React Query is required for Wagmi hooks to work

#### Step 3: Create Wagmi Connection Hook

**File**: `frontend/hooks/use-wagmi-wallet.ts`

```typescript
import { useAccount, useConnect, useDisconnect } from 'wagmi'

export function useWagmiWallet() {
  const { address, isConnected, chain } = useAccount()
  const { connect, connectors } = useConnect()
  const { disconnect } = useDisconnect()

  return {
    address,
    isConnected,
    chainId: chain?.id,
    connect: () => connect({ connector: connectors[0] }),
    disconnect,
    connectors,
  }
}
```

**Key Points**:
- Simplifies Wagmi's hooks into a single interface
- Exposes address, connection status, chain ID
- Provides connect/disconnect methods

---

## Integration 2: Lemon MiniApp SDK

### Purpose

Enable seamless wallet authentication within the Lemon Cash mobile app using their Mini App SDK.

### Key Features

- **SIWE Authentication**: Uses Sign In With Ethereum
- **Deposit/Withdraw**: Transfer funds between Lemon Wallet and Mini App Wallet
- **Smart Contract Calls**: Execute transactions with Permit2 support
- **WebView Detection**: Automatically detects Lemon Cash environment

### Dependencies

```bash
npm install @lemoncash/mini-app-sdk
```

### File Structure

```
frontend/
├── lib/
│   └── lemon/
│       └── client.ts              # Lemon SDK utilities
└── hooks/
    └── use-lemon-wallet.ts        # Lemon wallet hook
```

### Implementation Steps

#### Step 1: Create Lemon SDK Client

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
  /**
   * Check if running in Lemon Cash WebView
   */
  isLemonApp: () => isWebView(),

  /**
   * Authenticate user with SIWE
   * Returns wallet address, signature, and message
   */
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

  /**
   * Deposit funds from Lemon Wallet to Mini App Wallet
   * Note: Blocked on testnet
   */
  deposit: async (amount: string, tokenName: string) => {
    return await deposit({ amount, tokenName })
  },

  /**
   * Withdraw funds from Mini App Wallet to Lemon Wallet
   */
  withdraw: async (amount: string, tokenName: string) => {
    return await withdraw({ amount, tokenName })
  },

  /**
   * Call smart contract with optional Permit2 support
   */
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

**Key Points**:
- All methods check for WebView environment
- SIWE signature can be verified on backend
- Deposits are blocked on testnet (use faucets instead)
- Supports Permit2 for gasless approvals

#### Step 2: Create Lemon Wallet Hook

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

  useEffect(() => {
    setIsLemonApp(lemonClient.isLemonApp())
  }, [])

  const connect = async () => {
    try {
      const auth = await lemonClient.authenticate()
      setWallet(auth.wallet)
      setSignature(auth.signature)
      setIsConnected(true)
      return auth
    } catch (error) {
      console.error('Lemon authentication failed:', error)
      throw error
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
    connect,
    disconnect,
    lemonClient,
  }
}
```

**Key Points**:
- Auto-detects Lemon environment on mount
- Stores wallet address and signature
- Exposes Lemon SDK client for advanced usage

### Testing on Lemon Cash

1. **Deploy to public URL** (required for Lemon)
2. **Use testnet** (Polygon testnet recommended)
3. **Get testnet tokens** from faucets (deposits blocked on testnet)
4. **Open in Lemon Cash app** using deeplink

---

## Integration 3: Farcaster MiniApp SDK

### Purpose

Enable wallet authentication and interaction within Farcaster clients (Warpcast) using their Mini App SDK.

### Key Features

- **Quick Auth**: JWT-based authentication (easiest method)
- **Sign In with Farcaster**: Traditional SIWF flow
- **EIP-1193 Provider**: Standard Ethereum provider
- **Farcaster Context**: Access to FID, cast data, etc.
- **Native Actions**: Compose casts, view profiles, etc.

### Dependencies

```bash
npm install @farcaster/miniapp-sdk
npm install @farcaster/quick-auth  # For backend validation
```

### File Structure

```
frontend/
├── lib/
│   └── farcaster/
│       ├── client.ts              # Farcaster SDK client
│       └── wagmi-connector.ts     # Custom Wagmi connector
├── hooks/
│   └── use-farcaster-wallet.ts    # Farcaster wallet hook
└── public/
    └── .well-known/
        └── farcaster.json         # Manifest file (required)
```

### Implementation Steps

#### Step 1: Create Farcaster SDK Client

**File**: `frontend/lib/farcaster/client.ts`

```typescript
import { sdk } from '@farcaster/miniapp-sdk'

export const farcasterClient = {
  /**
   * Check if running in Farcaster Mini App
   */
  isInMiniApp: async () => {
    return await sdk.isInMiniApp()
  },

  /**
   * Initialize app - MUST be called when app loads
   * Hides splash screen and displays content
   */
  ready: async () => {
    await sdk.actions.ready()
  },

  /**
   * Quick Auth - easiest authentication method
   * Returns a JWT that can be validated on backend
   */
  quickAuth: {
    getToken: async (force = false) => {
      return await sdk.quickAuth.getToken({ force })
    },

    fetch: async (url: string, options?: RequestInit) => {
      return await sdk.quickAuth.fetch(url, options)
    },
  },

  /**
   * Get EIP-1193 Ethereum Provider
   * Compatible with Wagmi, Ethers, etc.
   */
  getEthereumProvider: async () => {
    return await sdk.wallet.getEthereumProvider()
  },

  /**
   * Sign In with Farcaster (alternative to Quick Auth)
   * Returns SIWF credential that must be verified on backend
   */
  signIn: async (nonce: string) => {
    return await sdk.actions.signIn({
      nonce,
      acceptAuthAddress: true  // Support auth addresses
    })
  },

  /**
   * Get Farcaster context (FID, cast data, etc.)
   */
  getContext: () => sdk.context,

  /**
   * Check what capabilities the host supports
   */
  getCapabilities: async () => {
    return await sdk.getCapabilities()
  },

  /**
   * Native Farcaster actions
   */
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

**Key Points**:
- **MUST call `ready()`** or users see infinite loading screen
- Quick Auth is simplest (returns JWT)
- EIP-1193 provider works with existing Web3 tools
- Context provides Farcaster-specific data (FID, casts, etc.)

#### Step 2: Create Farcaster Wallet Hook

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

  /**
   * Connect using Quick Auth (recommended)
   */
  const connectWithQuickAuth = async () => {
    try {
      const { token: authToken } = await farcasterClient.quickAuth.getToken()
      setToken(authToken)

      // Decode JWT to get FID (without verification - backend does that)
      const payload = JSON.parse(atob(authToken.split('.')[1]))
      setFid(payload.sub)

      // Get Ethereum provider
      const ethProvider = await farcasterClient.getEthereumProvider()
      setProvider(ethProvider)

      // Get wallet address from provider
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
    connect: connectWithQuickAuth,
    disconnect,
    farcasterClient,
  }
}
```

**Key Points**:
- Automatically calls `ready()` when in Farcaster
- Quick Auth returns JWT with FID
- Provider is EIP-1193 compatible
- FID (Farcaster ID) is unique to Farcaster

#### Step 3: Create Farcaster Wagmi Connector (Optional)

**File**: `frontend/lib/farcaster/wagmi-connector.ts`

```typescript
import { createConnector } from 'wagmi'
import { farcasterClient } from './client'

export function farcasterConnector() {
  return createConnector((config) => ({
    id: 'farcaster',
    name: 'Farcaster Wallet',
    type: 'farcasterConnector',

    async connect() {
      const provider = await farcasterClient.getEthereumProvider()
      const accounts = await provider.request({
        method: 'eth_requestAccounts'
      })

      return {
        accounts: accounts as `0x${string}`[],
        chainId: await provider.request({ method: 'eth_chainId' }),
      }
    },

    async disconnect() {
      // Farcaster doesn't have explicit disconnect
    },

    async getAccounts() {
      const provider = await farcasterClient.getEthereumProvider()
      const accounts = await provider.request({
        method: 'eth_accounts'
      })
      return accounts as `0x${string}`[]
    },

    async getProvider() {
      return await farcasterClient.getEthereumProvider()
    },

    async isAuthorized() {
      return await farcasterClient.isInMiniApp()
    },

    async getChainId() {
      const provider = await farcasterClient.getEthereumProvider()
      const chainId = await provider.request({ method: 'eth_chainId' })
      return parseInt(chainId as string, 16)
    },
  }))
}
```

**Key Points**:
- Allows using Farcaster wallet with Wagmi hooks
- Implements standard Wagmi connector interface
- Optional but provides better DX

#### Step 4: Create Manifest File

**File**: `public/.well-known/farcaster.json`

```json
{
  "accountAssociation": {
    "header": "...",
    "payload": "...",
    "signature": "..."
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
    "requiredChains": ["eip155:1", "eip155:137"],
    "requiredCapabilities": [
      "actions.signIn",
      "wallet.getEthereumProvider"
    ]
  }
}
```

**Generate `accountAssociation`**:
1. Go to [https://farcaster.xyz/~/developers/mini-apps/manifest](https://farcaster.xyz/~/developers/mini-apps/manifest)
2. Sign with your Farcaster account
3. Copy the generated `accountAssociation` object

### Testing on Farcaster

1. **Enable Developer Mode** in Farcaster settings
2. **Host manifest** at `/.well-known/farcaster.json`
3. **Create manifest** using Farcaster developer tools
4. **Test in Warpcast** using developer preview

---

## Unified Wallet Context

### Purpose

Provide a single, unified interface for all wallet types that auto-detects the environment and manages state.

### File Structure

```
frontend/
└── components/
    └── providers/
        └── wallet-provider.tsx    # Unified wallet context
```

### Implementation

**File**: `frontend/components/providers/wallet-provider.tsx`

```typescript
'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useWagmiWallet } from '@/hooks/use-wagmi-wallet'
import { useLemonWallet } from '@/hooks/use-lemon-wallet'
import { useFarcasterWallet } from '@/hooks/use-farcaster-wallet'

type WalletType = 'wagmi' | 'lemon' | 'farcaster' | null

interface WalletContextType {
  address: string | null
  isConnected: boolean
  walletType: WalletType
  connect: (type?: WalletType) => Promise<void>
  disconnect: () => void
  chainId?: number
  fid?: number | null
}

const WalletContext = createContext<WalletContextType | undefined>(undefined)

export function WalletProvider({ children }: { children: ReactNode }) {
  const wagmi = useWagmiWallet()
  const lemon = useLemonWallet()
  const farcaster = useFarcasterWallet()

  const [walletType, setWalletType] = useState<WalletType>(null)

  // Auto-detect environment on mount
  useEffect(() => {
    const autoConnect = async () => {
      if (lemon.isLemonApp) {
        setWalletType('lemon')
        try {
          await lemon.connect()
        } catch (error) {
          console.error('Auto-connect to Lemon failed:', error)
        }
      } else if (farcaster.isFarcasterApp) {
        setWalletType('farcaster')
        try {
          await farcaster.connect()
        } catch (error) {
          console.error('Auto-connect to Farcaster failed:', error)
        }
      }
    }

    autoConnect()
  }, [lemon.isLemonApp, farcaster.isFarcasterApp])

  const connect = async (type?: WalletType) => {
    const selectedType = type || walletType

    if (!selectedType) {
      // Default to wagmi if no type specified
      await wagmi.connect()
      setWalletType('wagmi')
      return
    }

    switch (selectedType) {
      case 'wagmi':
        await wagmi.connect()
        setWalletType('wagmi')
        break
      case 'lemon':
        await lemon.connect()
        setWalletType('lemon')
        break
      case 'farcaster':
        await farcaster.connect()
        setWalletType('farcaster')
        break
    }
  }

  const disconnect = () => {
    wagmi.disconnect()
    lemon.disconnect()
    farcaster.disconnect()
    setWalletType(null)
  }

  const value: WalletContextType = {
    address:
      walletType === 'wagmi' ? wagmi.address as string :
      walletType === 'lemon' ? lemon.address :
      walletType === 'farcaster' ? farcaster.address :
      null,
    isConnected:
      walletType === 'wagmi' ? wagmi.isConnected :
      walletType === 'lemon' ? lemon.isConnected :
      walletType === 'farcaster' ? farcaster.isConnected :
      false,
    walletType,
    connect,
    disconnect,
    chainId: walletType === 'wagmi' ? wagmi.chainId : undefined,
    fid: walletType === 'farcaster' ? farcaster.fid : null,
  }

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  )
}

export function useWallet() {
  const context = useContext(WalletContext)
  if (!context) {
    throw new Error('useWallet must be used within WalletProvider')
  }
  return context
}
```

**Key Features**:
- Auto-detects Lemon or Farcaster environments
- Automatically connects in native apps
- Provides unified interface for all wallet types
- Type-safe with TypeScript

### Update Root Layout

**File**: `frontend/app/layout.tsx`

```typescript
import { WagmiProviderWrapper } from '@/components/providers/wagmi-provider'
import { WalletProvider } from '@/components/providers/wallet-provider'

export default function RootLayout({
  children
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <WagmiProviderWrapper>
          <WalletProvider>
            {children}
          </WalletProvider>
        </WagmiProviderWrapper>
      </body>
    </html>
  )
}
```

### Update Dashboard

**File**: `frontend/app/dashboard/page.tsx`

Replace the Connect Wallet button:

```typescript
import { useWallet } from '@/components/providers/wallet-provider'

export default function Dashboard() {
  const { address, isConnected, connect, disconnect, walletType } = useWallet()

  return (
    // ... existing code
    <Button
      variant="outline"
      className="pixel-button border-2 border-[#B4E7CE]"
      onClick={isConnected ? disconnect : () => connect()}
    >
      {isConnected
        ? `${address?.slice(0, 6)}...${address?.slice(-4)}`
        : 'Connect Wallet'
      }
    </Button>
    // ...
  )
}
```

---

## Implementation Checklist

### Phase 1: Setup & Dependencies

- [ ] Install Wagmi dependencies
  ```bash
  npm install wagmi viem @tanstack/react-query @wagmi/connectors
  ```
- [ ] Install Lemon SDK
  ```bash
  npm install @lemoncash/mini-app-sdk
  ```
- [ ] Install Farcaster SDK
  ```bash
  npm install @farcaster/miniapp-sdk @farcaster/quick-auth
  ```
- [ ] Get WalletConnect Project ID from [cloud.walletconnect.com](https://cloud.walletconnect.com)

### Phase 2: Wagmi Integration

- [ ] Create `frontend/lib/wagmi/config.ts`
- [ ] Create `frontend/components/providers/wagmi-provider.tsx`
- [ ] Create `frontend/hooks/use-wagmi-wallet.ts`
- [ ] Add Wagmi provider to `app/layout.tsx`

### Phase 3: Lemon Integration

- [ ] Create `frontend/lib/lemon/client.ts`
- [ ] Create `frontend/hooks/use-lemon-wallet.ts`
- [ ] Test WebView detection

### Phase 4: Farcaster Integration

- [ ] Create `frontend/lib/farcaster/client.ts`
- [ ] Create `frontend/hooks/use-farcaster-wallet.ts`
- [ ] Create `frontend/lib/farcaster/wagmi-connector.ts` (optional)
- [ ] Create Farcaster manifest at `public/.well-known/farcaster.json`
- [ ] Sign manifest using Farcaster developer tools

### Phase 5: Unified Context

- [ ] Create `frontend/components/providers/wallet-provider.tsx`
- [ ] Add WalletProvider to `app/layout.tsx`
- [ ] Update `app/dashboard/page.tsx` to use `useWallet()`
- [ ] Remove `TEST_USER_ID` and use `address` instead

### Phase 6: UI Components

- [ ] Create wallet connection modal
- [ ] Add wallet switcher (for non-native environments)
- [ ] Add network switcher
- [ ] Show connection status in header

### Phase 7: Testing

- [ ] Test Wagmi with MetaMask in browser
- [ ] Test WalletConnect flow
- [ ] Deploy to Vercel/production URL
- [ ] Test in Lemon Cash app
- [ ] Test in Farcaster/Warpcast

---

## Environment Variables

### Required Variables

**File**: `frontend/.env.local`

```bash
# Wagmi / WalletConnect
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id_here

# Smart Contract
NEXT_PUBLIC_CONTRACT_ADDRESS=0x...
NEXT_PUBLIC_CHAIN_ID=11155111

# RPC URLs (optional, uses public RPCs by default)
NEXT_PUBLIC_MAINNET_RPC_URL=https://...
NEXT_PUBLIC_SEPOLIA_RPC_URL=https://...
NEXT_PUBLIC_POLYGON_RPC_URL=https://...

# Supabase (existing)
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...

# Farcaster (optional, uses default Quick Auth server)
NEXT_PUBLIC_FARCASTER_QUICK_AUTH_SERVER=https://auth.farcaster.xyz
```

### Get WalletConnect Project ID

1. Go to [cloud.walletconnect.com](https://cloud.walletconnect.com)
2. Sign up / Log in
3. Create a new project
4. Copy the Project ID

---

## Testing Strategy

### 1. Local Testing (Wagmi)

**Environment**: Desktop browser

**Test Cases**:
- [ ] Connect with MetaMask
- [ ] Connect with WalletConnect
- [ ] Connect with Coinbase Wallet
- [ ] Switch networks
- [ ] Disconnect wallet
- [ ] Reconnect on page refresh
- [ ] View account balance
- [ ] Sign message

**How to Test**:
```bash
cd frontend
npm run dev
# Open http://localhost:3000 in browser with MetaMask
```

### 2. Lemon Cash Testing

**Environment**: Lemon Cash mobile app

**Prerequisites**:
- Deploy to public URL (Vercel, Netlify, etc.)
- Use testnet (Polygon Mumbai or Sepolia)
- Get testnet tokens from faucets

**Test Cases**:
- [ ] App opens in Lemon WebView
- [ ] Auto-detects Lemon environment
- [ ] Authenticates with SIWE
- [ ] Shows correct wallet address
- [ ] Can call smart contracts
- [ ] Handles errors gracefully

**How to Test**:
1. Deploy to Vercel: `vercel --prod`
2. Get deeplink: `lemon://miniapp?url=https://your-app.vercel.app`
3. Open in Lemon Cash app
4. Get testnet tokens: [Alchemy Faucet](https://www.alchemy.com/faucets)

**Important Notes**:
- Deposits are **blocked on testnet** (use faucets instead)
- Must use HTTPS URL
- Test on Polygon testnet

### 3. Farcaster Testing

**Environment**: Warpcast or Farcaster client

**Prerequisites**:
- Enable Developer Mode in Farcaster
- Create and sign manifest
- Host manifest at `/.well-known/farcaster.json`
- Deploy to public URL

**Test Cases**:
- [ ] App opens in Farcaster client
- [ ] Splash screen appears then hides
- [ ] Auto-detects Farcaster environment
- [ ] Quick Auth works
- [ ] Shows correct FID
- [ ] Shows correct wallet address
- [ ] Can access Ethereum provider
- [ ] Can send transactions

**How to Test**:
1. Enable Developer Mode:
   - Go to Settings → Developer Tools
   - Toggle on "Developer Mode"
2. Create manifest:
   - Go to [Developer Tools](https://farcaster.xyz/~/developers/mini-apps/manifest)
   - Enter your domain
   - Sign to generate `accountAssociation`
3. Deploy app to production
4. Use preview tool or share in cast

**Troubleshooting**:
- **Infinite loading**: Did you call `sdk.actions.ready()`?
- **Manifest not found**: Check `/.well-known/farcaster.json` is accessible
- **Auth failed**: Ensure you're using latest SDK version (0.0.39+)

### 4. Integration Testing

**Cross-Platform Tests**:
- [ ] Same user address across all platforms
- [ ] Consistent behavior in all environments
- [ ] Graceful fallback if SDK not available
- [ ] No errors when switching between environments

### 5. Edge Cases

- [ ] User rejects connection
- [ ] User cancels transaction
- [ ] Network error during connection
- [ ] Wallet not installed (Wagmi)
- [ ] Invalid environment (trying to use Lemon SDK outside Lemon)
- [ ] Session expiry (Farcaster Quick Auth)

---

## Architecture Diagrams

### Connection Flow

```
┌─────────────────┐
│  App Loads      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Check Env       │
│ - isWebView()?  │
│ - isInMiniApp()?│
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌───────┐  ┌───────────┐
│Lemon  │  │ Farcaster │
│Auto   │  │ Auto      │
│Connect│  │ Connect   │
└───────┘  └───────────┘
    │         │
    │         ▼
    │    ┌─────────┐
    │    │ready()  │
    │    └─────────┘
    │         │
    └─────┬───┘
          │
          ▼
    ┌─────────┐
    │Connected│
    └─────────┘
```

### State Management

```
┌───────────────────────────────┐
│     WalletProvider (State)    │
├───────────────────────────────┤
│ - address: string | null      │
│ - isConnected: boolean        │
│ - walletType: 'wagmi' | ...   │
│ - chainId?: number            │
│ - fid?: number                │
└───────────────────────────────┘
         │
         ├─────────────────┬─────────────────┐
         │                 │                 │
         ▼                 ▼                 ▼
┌────────────────┐ ┌───────────────┐ ┌──────────────┐
│useWagmiWallet  │ │useLemonWallet │ │useFarcaster  │
│                │ │               │ │Wallet        │
│- Wagmi hooks   │ │- Lemon SDK    │ │- Farcaster   │
│- MetaMask      │ │- WebView      │ │  SDK         │
│- WalletConnect │ │- SIWE         │ │- Quick Auth  │
└────────────────┘ └───────────────┘ └──────────────┘
```

---

## Next Steps After Implementation

### Backend Integration

1. **Verify SIWE Signatures** (Lemon)
   - Use `@lemoncash/mini-app-sdk` on backend
   - Verify signature matches wallet address

2. **Validate Farcaster Quick Auth Tokens**
   ```typescript
   import { verifyJwt } from '@farcaster/quick-auth'

   const payload = await verifyJwt(token)
   const fid = payload.sub
   ```

3. **Link Wallet to Supabase User**
   - Update `users` table with wallet address
   - Create sessions based on wallet auth

### Smart Contract Integration

1. **Read Contract Data**
   ```typescript
   import { useReadContract } from 'wagmi'

   const { data } = useReadContract({
     address: contractAddress,
     abi: cakeFactoryAbi,
     functionName: 'getCakeDetails',
     args: [cakeId]
   })
   ```

2. **Write to Contract**
   ```typescript
   import { useWriteContract } from 'wagmi'

   const { writeContract } = useWriteContract()

   await writeContract({
     address: contractAddress,
     abi: cakeFactoryAbi,
     functionName: 'createCake',
     args: [token, memberIds, interestRate]
   })
   ```

### User Experience Improvements

1. **Wallet Connection Modal**
   - Show available connectors
   - Display wallet info
   - Handle errors gracefully

2. **Transaction Notifications**
   - Pending state
   - Success/failure feedback
   - Block explorer links

3. **Network Switching**
   - Auto-switch to correct network
   - Show network mismatch warnings

---

## Resources

### Documentation Links

- **Wagmi**: [wagmi.sh/react](https://wagmi.sh/react)
- **Lemon MiniApp SDK**: [lemoncash.mintlify.app](https://lemoncash.mintlify.app)
- **Farcaster MiniApps**: [miniapps.farcaster.xyz](https://miniapps.farcaster.xyz)
- **WalletConnect**: [cloud.walletconnect.com](https://cloud.walletconnect.com)

### Example Projects

- **Wagmi Examples**: [github.com/wevm/wagmi/examples](https://github.com/wevm/wagmi/tree/main/examples)
- **Farcaster Demo**: [github.com/farcasterxyz/frames-v2-demo](https://github.com/farcasterxyz/frames-v2-demo)

### Support

- **Wagmi Discord**: [wagmi.sh/discord](https://wagmi.sh/discord)
- **Farcaster Developers**: [farcaster.xyz/~/developers](https://farcaster.xyz/~/developers)
- **Lemon Cash Support**: Contact through their developer portal

---

## Conclusion

This implementation plan provides a comprehensive, production-ready multi-wallet integration for Rather Cake Pay. The unified architecture ensures:

✅ **Seamless UX** - Auto-detects environment and connects automatically
✅ **Maximum Reach** - Works on web, Lemon Cash app, and Farcaster
✅ **Type Safety** - Full TypeScript support throughout
✅ **Maintainability** - Clean separation of concerns
✅ **Extensibility** - Easy to add more wallet types

Start with Phase 1 (Setup & Dependencies) and work through each phase sequentially for best results.
