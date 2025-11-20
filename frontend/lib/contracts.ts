/**
 * Contract address configuration by chain ID
 * 
 * Chain IDs:
 * - 1: Ethereum Mainnet
 * - 11155111: Ethereum Sepolia
 * - 84532: Base Sepolia
 * - 1337: Localhost (Hardhat)
 * - 31337: Hardhat Network
 */

export const CONTRACT_ADDRESSES: Record<number, `0x${string}` | undefined> = {
  // Ethereum Mainnet
  1: process.env.NEXT_PUBLIC_CONTRACT_ADDRESS_MAINNET as `0x${string}` | undefined,
  
  // Ethereum Sepolia
  11155111: process.env.NEXT_PUBLIC_CONTRACT_ADDRESS_SEPOLIA as `0x${string}` | undefined,
  
  // Base Sepolia
  84532: process.env.NEXT_PUBLIC_CONTRACT_ADDRESS_BASE_SEPOLIA as `0x${string}` | undefined,
  
  // Localhost (for development)
  1337: process.env.NEXT_PUBLIC_CONTRACT_ADDRESS_LOCALHOST as `0x${string}` | undefined,
  
  // Hardhat Network
  31337: process.env.NEXT_PUBLIC_CONTRACT_ADDRESS_LOCALHOST as `0x${string}` | undefined,
}

/**
 * Gets the contract address for a given chain ID
 * @param chainId The chain ID to get the contract address for
 * @returns The contract address for the chain, or undefined if not configured
 */
export function getContractAddress(chainId: number): `0x${string}` | undefined {
  return CONTRACT_ADDRESSES[chainId]
}

/**
 * Gets the contract address for a given chain ID, throwing an error if not configured
 * @param chainId The chain ID to get the contract address for
 * @returns The contract address for the chain
 * @throws Error if the contract address is not configured for the given chain
 */
export function getContractAddressOrThrow(chainId: number): `0x${string}` {
  const address = getContractAddress(chainId)
  if (!address) {
    throw new Error(
      `Contract address not configured for chain ID ${chainId}. ` +
      `Please set the appropriate NEXT_PUBLIC_CONTRACT_ADDRESS_* environment variable.`
    )
  }
  return address
}

/**
 * Chain ID to name mapping for better error messages
 */
export const CHAIN_NAMES: Record<number, string> = {
  1: 'Ethereum Mainnet',
  11155111: 'Ethereum Sepolia',
  84532: 'Base Sepolia',
  1337: 'Localhost',
  31337: 'Hardhat Network',
}

