import {
  authenticate,
  isWebView,
  TransactionResult,
  callSmartContract,
  deposit,
  withdraw,
  ChainId,
  TokenName,
  type Address,
  type Permit,
} from '@lemoncash/mini-app-sdk'

/**
 * Lemon Cash Mini App SDK Client
 *
 * This client provides a typed wrapper around the Lemon Cash Mini App SDK
 * for seamless wallet integration within the Lemon Cash mobile app.
 *
 * Key Features:
 * - SIWE (Sign In With Ethereum) authentication
 * - Deposit/withdraw funds between Lemon Wallet and Mini App Wallet
 * - Smart contract interactions with Permit2 support
 * - WebView environment detection
 */
export const lemonClient = {
  /**
   * Check if the app is running inside Lemon Cash WebView
   * @returns true if running in Lemon Cash app, false otherwise
   */
  isLemonApp: () => {
    return isWebView()
  },

  /**
   * Authenticate user with SIWE (Sign In With Ethereum)
   *
   * Returns wallet address, signature, and signed message that can be
   * verified on the backend to establish user session.
   *
   * @throws Error if not in Lemon WebView or authentication fails
   * @returns Object containing wallet address, signature, and message
   */
  authenticate: async () => {
    console.log('[lemonClient] authenticate() called')
    console.log('[lemonClient] isWebView():', isWebView())

    if (!isWebView()) {
      const error = new Error('Not in Lemon Cash WebView')
      console.error('[lemonClient]', error)
      throw error
    }

    console.log('[lemonClient] Calling authenticate() from SDK...')
    const result = await authenticate()
    console.log('[lemonClient] SDK authenticate() result:', result)

    if (result.result === TransactionResult.SUCCESS) {
      console.log('[lemonClient] ✅ SUCCESS - wallet:', result.data.wallet)
      return {
        wallet: result.data.wallet,
        signature: result.data.signature,
        message: result.data.message,
      }
    }

    if (result.result === TransactionResult.FAILED) {
      const errorMsg = result.error?.message || 'Authentication failed'
      console.error('[lemonClient] ❌ FAILED:', errorMsg, result.error)
      throw new Error(errorMsg)
    }

    console.error('[lemonClient] ❌ CANCELLED by user')
    throw new Error('Authentication cancelled by user')
  },

  /**
   * Deposit funds from Lemon Wallet to Mini App Wallet
   *
   * IMPORTANT: Deposits are blocked on testnet to prevent real money
   * from being deducted. Use faucets to get testnet tokens instead.
   *
   * @param amount - Amount to deposit (in smallest unit, e.g., wei for ETH)
   * @param tokenName - Token name (e.g., TokenName.USDC, TokenName.USDT, TokenName.ETH)
   * @returns Transaction result
   */
  deposit: async (amount: string, tokenName: TokenName) => {
    return await deposit({ amount, tokenName })
  },

  /**
   * Withdraw funds from Mini App Wallet to Lemon Wallet
   *
   * @param amount - Amount to withdraw (in smallest unit)
   * @param tokenName - Token name (e.g., TokenName.USDC, TokenName.USDT, TokenName.ETH)
   * @returns Transaction result
   */
  withdraw: async (amount: string, tokenName: TokenName) => {
    return await withdraw({ amount, tokenName })
  },

  /**
   * Execute a smart contract function call
   *
   * Supports Permit2 for gasless token approvals. The service will
   * automatically handle one-time approval to the Permit2 contract
   * if it hasn't been done already.
   *
   * @param params - Contract call parameters
   * @param params.contractAddress - Target contract address
   * @param params.functionName - Function to call
   * @param params.args - Function arguments (use "PERMIT_PLACEHOLDER_N" for permit args)
   * @param params.value - Native token value to send (default: "0")
   * @param params.chainId - Chain ID (e.g., ChainId.POLYGON)
   * @param params.permits - Array of Permit2 permits (optional)
   * @returns Transaction result
   *
   * @example
   * // Simple contract call
   * await lemonClient.callContract({
   *   contractAddress: "0xCakeFactory...",
   *   functionName: "createCake",
   *   args: [token, memberIds, interestRate],
   *   chainId: ChainId.POLYGON
   * })
   *
   * @example
   * // With Permit2 (gasless approval)
   * await lemonClient.callContract({
   *   contractAddress: "0xDeFiProtocol...",
   *   functionName: "depositWithPermit",
   *   args: ["1000000000000000000", "PERMIT_PLACEHOLDER_0"],
   *   chainId: ChainId.POLYGON,
   *   permits: [{
   *     owner: walletAddress,
   *     token: "0xUSDC...",
   *     spender: "0xDeFiProtocol...",
   *     amount: "1000000000000000000",
   *     deadline: "1735689600",
   *     nonce: "0"
   *   }]
   * })
   */
  callContract: async (params: {
    contractAddress: Address
    functionName: string
    args: unknown[]
    value?: string
    chainId: ChainId
    permits?: Permit[]
  }) => {
    return await callSmartContract({
      contracts: [{
        contractAddress: params.contractAddress,
        functionName: params.functionName,
        functionParams: params.args,
        value: params.value || '0',
        chainId: params.chainId,
        permits: params.permits,
      }]
    })
  },
}

/**
 * Type exports for better TypeScript support
 */
export type LemonAuthResult = Awaited<ReturnType<typeof lemonClient.authenticate>>
export type LemonTransactionResult = Awaited<ReturnType<typeof lemonClient.deposit>>
