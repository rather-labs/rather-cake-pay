import { sdk } from '@farcaster/miniapp-sdk'

/**
 * Farcaster Mini App SDK Client
 *
 * This client provides a typed wrapper around the Farcaster Mini App SDK
 * for seamless integration within Farcaster/Warpcast Mini Apps.
 *
 * Key Features:
 * - Quick Auth (JWT-based authentication)
 * - Mini App environment detection
 * - Ethereum wallet access (EIP-1193 provider)
 * - User profile information
 */
export const farcasterClient = {
  /**
   * Check if the app is running inside a Farcaster Mini App
   * @returns Promise resolving to true if in Mini App, false otherwise
   */
  isInMiniApp: async () => {
    return await sdk.isInMiniApp()
  },

  /**
   * Get Quick Auth session token
   *
   * Returns a JWT that can be verified on the backend to establish user session.
   * If there's already a valid session token in memory, it will be returned immediately.
   *
   * @throws Error if not in Farcaster Mini App or authentication fails
   * @returns Object containing JWT token
   */
  getAuthToken: async () => {
    const result = await sdk.quickAuth.getToken()
    return {
      token: result.token,
    }
  },

  /**
   * Make an authenticated fetch request
   *
   * Automatically handles Quick Auth token acquisition and includes it
   * as a Bearer token in the Authorization header.
   *
   * @param input - URL or Request object
   * @param init - Optional fetch options
   * @returns Fetch response
   *
   * @example
   * const res = await farcasterClient.authenticatedFetch('/api/user')
   * const userData = await res.json()
   */
  authenticatedFetch: async (
    input: RequestInfo | URL,
    init?: RequestInit
  ): Promise<Response> => {
    return await sdk.quickAuth.fetch(input, init)
  },

  /**
   * Get Ethereum provider (EIP-1193)
   *
   * Returns an EIP-1193 compatible provider that can be used with
   * libraries like Wagmi, Ethers, or directly for blockchain interactions.
   *
   * @returns EIP-1193 Ethereum Provider
   *
   * @example
   * const provider = farcasterClient.getEthereumProvider()
   * const accounts = await provider.request({ method: 'eth_requestAccounts' })
   */
  getEthereumProvider: () => {
    return sdk.wallet.getEthereumProvider()
  },

  /**
   * Get current Farcaster context
   *
   * Returns information about the current user and Mini App context.
   * This includes the user's FID and other contextual data.
   *
   * @returns Context object with user information
   */
  getContext: async () => {
    return await sdk.context
  },

  /**
   * Signal that the app is ready to be shown
   *
   * Call this when your app has finished loading and is ready to display.
   * This dismisses any splash screen shown by the host app.
   */
  ready: () => {
    sdk.actions.ready()
  },

  /**
   * Close the Mini App
   *
   * Dismisses the Mini App and returns the user to the host application.
   */
  close: () => {
    sdk.actions.close()
  },

  /**
   * Open an external URL in the system browser
   *
   * @param url - URL to open
   *
   * @example
   * farcasterClient.openUrl('https://example.com')
   */
  openUrl: (url: string) => {
    sdk.actions.openUrl(url)
  },

  /**
   * Prompt user to add the Mini App to their collection
   *
   * @example
   * await farcasterClient.addMiniApp()
   */
  addMiniApp: async () => {
    return await sdk.actions.addMiniApp()
  },
}

/**
 * Type exports for better TypeScript support
 */
export type FarcasterAuthToken = Awaited<
  ReturnType<typeof farcasterClient.getAuthToken>
>
export type FarcasterContext = Awaited<
  ReturnType<typeof farcasterClient.getContext>
>
