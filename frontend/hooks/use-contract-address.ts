import { useChainId } from 'wagmi'
import { getContractAddressOrThrow } from '@/lib/contracts'

/**
 * Hook to get the contract address for the currently connected chain
 * @returns The contract address for the current chain
 * @throws Error if the contract address is not configured for the current chain
 */
export function useContractAddress(): `0x${string}` {
  const chainId = useChainId()
  return getContractAddressOrThrow(chainId)
}

