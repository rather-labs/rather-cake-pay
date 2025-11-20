import { ChainId } from '@lemoncash/mini-app-sdk'
import CakeFactoryArtifactAbi from '@/public/contracts/CakeFactory.json'

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
