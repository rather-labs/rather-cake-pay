import CakeFactoryArtifactAbi from '@/public/contracts/CakeFactory.json'

export const CAKE_FACTORY_ABI = CakeFactoryArtifactAbi.abi

export const CONTRACT_ADDRESS_BASE_SEPOLIA = (
  process.env.NEXT_PUBLIC_CONTRACT_ADDRESS_BASE_SEPOLIA || '0x0000000000000000000000000000000000000000'
) as `0x${string}`
