import { ChainId } from '@lemoncash/mini-app-sdk'
import CakeFactoryArtifactAbi from '@/public/contracts/CakeFactory.json'
import { createPublicClient, http } from 'viem'
import { sepolia } from 'viem/chains'

export const CAKE_FACTORY_ABI = CakeFactoryArtifactAbi.abi

export const CONTRACT_ADDRESS_ETH_SEPOLIA = (
  process.env.NEXT_PUBLIC_CONTRACT_ADDRESS_ETH_SEPOLIA || '0xc7637E472A795FBd14709CeF02CE000Beacd24a8'
) as `0x${string}`

const parsedChainId =
  typeof process.env.NEXT_PUBLIC_CHAIN_ID !== 'undefined'
    ? Number(process.env.NEXT_PUBLIC_CHAIN_ID)
    : ChainId.ETH_SEPOLIA

export const CAKE_FACTORY_CHAIN_ID: ChainId = Number.isFinite(parsedChainId)
  ? (parsedChainId as ChainId)
  : ChainId.ETH_SEPOLIA

// Create a public client for reading contract data
const publicClient = createPublicClient({
  chain: sepolia,
  transport: http('https://sepolia.gateway.tenderly.co'),
})

/**
 * Get the on-chain user ID for a wallet address
 * @param walletAddress - The wallet address to query
 * @returns The on-chain user ID (0 if not registered)
 */
export async function getOnChainUserId(walletAddress: string): Promise<bigint> {
  try {
    const userId = await publicClient.readContract({
      address: CONTRACT_ADDRESS_ETH_SEPOLIA,
      abi: CAKE_FACTORY_ABI,
      functionName: 'userIds',
      args: [walletAddress as `0x${string}`],
    })
    return userId as bigint
  } catch (error) {
    console.error(`Failed to get user ID for ${walletAddress}:`, error)
    return BigInt(0)
  }
}

/**
 * Get on-chain user IDs for multiple wallet addresses
 * @param walletAddresses - Array of wallet addresses to query
 * @returns Array of on-chain user IDs
 */
export async function getOnChainUserIds(walletAddresses: string[]): Promise<bigint[]> {
  const promises = walletAddresses.map((address) => getOnChainUserId(address))
  return Promise.all(promises)
}
