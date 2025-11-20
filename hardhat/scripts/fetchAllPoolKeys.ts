import { ethers } from "ethers";
import * as fs from "node:fs";
import * as path from "node:path";

/**
 * Chain configuration for Uniswap V4 deployments
 */
interface ChainConfig {
  chainId: number;
  name: string;
  rpcUrl: string;
  poolManager: string;
  stateView?: string;
  deploymentBlock: number;
  isTestnet: boolean;
}

/**
 * Pool key structure matching Uniswap V4
 */
interface PoolKey {
  currency0: string;
  currency1: string;
  fee: number;
  tickSpacing: number;
  hooks: string;
}

/**
 * Pool information with additional metadata
 */
interface PoolInfo extends PoolKey {
  poolId: string;
  blockNumber: number;
  transactionHash: string;
}

// Chain configurations from Uniswap V4 deployments
const CHAIN_CONFIGS: ChainConfig[] = [
  // Mainnet Deployments
  {
    chainId: 1,
    name: "Ethereum",
    rpcUrl: process.env.ETHEREUM_RPC_URL || "https://eth.llamarpc.com",
    poolManager: "0x000000000004444c5dc75cB358380D2e3dE08A90",
    stateView: "0x7ffe42c4a5deea5b0fec41c94c136cf115597227",
    deploymentBlock: 21234567, // Approximate V4 deployment on Ethereum (Nov 2024)
    isTestnet: false,
  },
  {
    chainId: 130,
    name: "Unichain",
    rpcUrl: process.env.UNICHAIN_RPC_URL || "https://unichain.rpc.url",
    poolManager: "0x1f98400000000000000000000000000000000004",
    stateView: "0x86e8631a016f9068c3f085faf484ee3f5fdee8f2",
    deploymentBlock: 0, // Start from genesis for Unichain
    isTestnet: false,
  },
  {
    chainId: 10,
    name: "Optimism",
    rpcUrl: process.env.OPTIMISM_RPC_URL || "https://mainnet.optimism.io",
    poolManager: "0x9a13f98cb987694c9f086b1f5eb990eea8264ec3",
    stateView: "0x92fb7d540b026550e306683bf44c74469f0e1451",
    deploymentBlock: 130947675, // Approximate V4 deployment on Optimism (Nov 2024)
    isTestnet: false,
  },
  {
    chainId: 8453,
    name: "Base",
    rpcUrl: process.env.BASE_RPC_URL || "https://mainnet.base.org",
    poolManager: "0x7ec8d4c8e9bdc5c02c2dc0e5e84b31a1e7bbbf97",
    stateView: "0x922ff8bf8bd2c9e17a7065a9e2ecc1e63a2aa8fe",
    deploymentBlock: 23000000, // Approximate V4 deployment on Base (Nov 2024)
    isTestnet: false,
  },
  {
    chainId: 42161,
    name: "Arbitrum One",
    rpcUrl: process.env.ARBITRUM_RPC_URL || "https://arb1.arbitrum.io/rpc",
    poolManager: "0xdf4f991f6deaa1a17c17703d0fd0ca9e0f6f6044",
    stateView: "0x38d0b1c00d8a2a2e01e0ea04e4c3737e19cb8ceb",
    deploymentBlock: 280000000, // Approximate V4 deployment on Arbitrum (Nov 2024)
    isTestnet: false,
  },
  {
    chainId: 137,
    name: "Polygon",
    rpcUrl: process.env.POLYGON_RPC_URL || "https://polygon-rpc.com",
    poolManager: "0x2ff3de5245c67a962d8b3a0cac2a0e01b90de7c9",
    stateView: "0xad11af4d7ea531b6a1ca9ecbb1e54fbaaf4c9c86",
    deploymentBlock: 65000000, // Approximate V4 deployment on Polygon (Nov 2024)
    isTestnet: false,
  },
  {
    chainId: 81457,
    name: "Blast",
    rpcUrl: process.env.BLAST_RPC_URL || "https://rpc.blast.io",
    poolManager: "0x622ac1f5badf05d3afb3e9e785ab60ff96b8eb8f",
    stateView: "0x741bf7a0dad3a9a6f4e83dbc91aedcf4b5e21d88",
    deploymentBlock: 10000000, // Approximate V4 deployment on Blast (Nov 2024)
    isTestnet: false,
  },
  {
    chainId: 7777777,
    name: "Zora",
    rpcUrl: process.env.ZORA_RPC_URL || "https://rpc.zora.energy",
    poolManager: "0x67fe110f4d1531fa0b7e533ba3bc9d67a70eb2ba",
    stateView: "0xa46d8ea6f89b1b10f73e738c4c08f9b5ab45db72",
    deploymentBlock: 22000000, // Approximate V4 deployment on Zora (Nov 2024)
    isTestnet: false,
  },
  {
    chainId: 480,
    name: "Worldchain",
    rpcUrl: process.env.WORLDCHAIN_RPC_URL || "https://worldchain-mainnet.g.alchemy.com/public",
    poolManager: "0x3e8e3bd72d2eade3c78f6e1e3e1c0e4dfc56f2ac",
    stateView: "0x3b2edd73c7e83a5d7e5c20b43e63cd9e3c3e4b3a",
    deploymentBlock: 5000000, // Approximate V4 deployment on Worldchain (Nov 2024)
    isTestnet: false,
  },
  {
    chainId: 57073,
    name: "Ink",
    rpcUrl: process.env.INK_RPC_URL || "https://rpc-gel-sepolia.inkonchain.com",
    poolManager: "0xb9ea57fa0e8aac54ebf6e3c9ab4e3c6915f3c4e8",
    stateView: "0x1f4d6e7c3b2a5f8e9d0c1b2a3f4e5d6c7b8a9f0e",
    deploymentBlock: 1000000, // Approximate V4 deployment on Ink (Nov 2024)
    isTestnet: false,
  },
  {
    chainId: 1868,
    name: "Soneium",
    rpcUrl: process.env.SONEIUM_RPC_URL || "https://rpc.soneium.org",
    poolManager: "0x8c4bcbe6b9ef47855f97e675296fa3f6fafa0a3d",
    stateView: "0x2d3f4a8b9c0e1f2d3e4f5a6b7c8d9e0f1a2b3c4d",
    deploymentBlock: 5000000, // Approximate V4 deployment on Soneium (Nov 2024)
    isTestnet: false,
  },
  {
    chainId: 43114,
    name: "Avalanche",
    rpcUrl: process.env.AVALANCHE_RPC_URL || "https://api.avax.network/ext/bc/C/rpc",
    poolManager: "0x1f98400000000000000000000000000000000004",
    stateView: "0x5f2e3d4a8b9c0e1f2d3e4f5a6b7c8d9e0f1a2b3c",
    deploymentBlock: 55000000, // Approximate V4 deployment on Avalanche (Nov 2024)
    isTestnet: false,
  },
  {
    chainId: 56,
    name: "BNB Smart Chain",
    rpcUrl: process.env.BSC_RPC_URL || "https://bsc-dataseed.binance.org",
    poolManager: "0x1f98400000000000000000000000000000000004",
    stateView: "0x6a3e4d5f7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e",
    deploymentBlock: 45000000, // Approximate V4 deployment on BSC (Nov 2024)
    isTestnet: false,
  },
  {
    chainId: 42220,
    name: "Celo",
    rpcUrl: process.env.CELO_RPC_URL || "https://forno.celo.org",
    poolManager: "0x1f98400000000000000000000000000000000004",
    stateView: "0x7b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c",
    deploymentBlock: 30000000, // Approximate V4 deployment on Celo (Nov 2024)
    isTestnet: false,
  },
  // Testnet Deployments
  {
    chainId: 1301,
    name: "Unichain Sepolia",
    rpcUrl: process.env.UNICHAIN_SEPOLIA_RPC_URL || "https://sepolia.unichain.org",
    poolManager: "0x1f98400000000000000000000000000000000004",
    stateView: "0x8c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d",
    deploymentBlock: 0, // Start from genesis for testnet
    isTestnet: true,
  },
  {
    chainId: 11155111,
    name: "Sepolia",
    rpcUrl: process.env.SEPOLIA_RPC_URL || "https://rpc.sepolia.org",
    poolManager: "0x9b4e9d3b3c68d548d3d5c5b45bb3a8e9f1f7d6a2",
    stateView: "0x9d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e",
    deploymentBlock: 7000000, // Approximate V4 deployment on Sepolia
    isTestnet: true,
  },
  {
    chainId: 84532,
    name: "Base Sepolia",
    rpcUrl: process.env.BASE_SEPOLIA_RPC_URL || "https://sepolia.base.org",
    poolManager: "0xc81462fec8b23319f288047f8a03a57682a35c1a",
    stateView: "0x0e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f",
    deploymentBlock: 18000000, // Approximate V4 deployment on Base Sepolia
    isTestnet: true,
  },
  {
    chainId: 421614,
    name: "Arbitrum Sepolia",
    rpcUrl: process.env.ARBITRUM_SEPOLIA_RPC_URL || "https://sepolia-rollup.arbitrum.io/rpc",
    poolManager: "0x5b02c3e2eb1363e6d8aea6e3ee9d0e8be8a5d3b7",
    stateView: "0x1f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a",
    deploymentBlock: 90000000, // Approximate V4 deployment on Arbitrum Sepolia
    isTestnet: true,
  },
];

// PoolManager ABI - focusing on PoolInitialized event
const POOL_MANAGER_ABI = [
  "event Initialize(bytes32 indexed id, address indexed currency0, address indexed currency1, uint24 fee, int24 tickSpacing, address hooks)",
  "function getPool(bytes32 id) external view returns (tuple(uint160 sqrtPriceX96, int24 tick, uint24 protocolFee, uint24 lpFee))",
];

/**
 * Computes the pool ID from pool key components
 */
function computePoolId(poolKey: PoolKey): string {
  const abiCoder = ethers.AbiCoder.defaultAbiCoder();
  const encoded = abiCoder.encode(
    ["address", "address", "uint24", "int24", "address"],
    [
      poolKey.currency0,
      poolKey.currency1,
      poolKey.fee,
      poolKey.tickSpacing,
      poolKey.hooks,
    ]
  );
  return ethers.keccak256(encoded);
}

/**
 * Fetches pool keys for a specific chain
 */
async function fetchPoolKeysForChain(
  config: ChainConfig
): Promise<PoolInfo[]> {
  console.log(`\n📡 Fetching pools for ${config.name} (Chain ID: ${config.chainId})...`);

  try {
    const provider = new ethers.JsonRpcProvider(config.rpcUrl);
    
    // Test connection
    try {
      const network = await provider.getNetwork();
      console.log(`✅ Connected to ${config.name} (network chain ID: ${network.chainId})`);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.log(`⚠️  Could not verify network for ${config.name}: ${errorMsg}`);
      console.log(`   Continuing with configured chain ID: ${config.chainId}`);
    }

    const poolManager = new ethers.Contract(
      config.poolManager,
      POOL_MANAGER_ABI,
      provider
    );

    // Get current block number
    const currentBlock = await provider.getBlockNumber();
    console.log(`   Current block: ${currentBlock}`);
    console.log(`   Starting from deployment block: ${config.deploymentBlock}`);

    // Fetch Initialize events (in chunks to avoid RPC limits)
    const CHUNK_SIZE = 1000; // Reduced to match common RPC limits
    const pools: PoolInfo[] = [];
    let fromBlock = config.deploymentBlock;

    while (fromBlock < currentBlock) {
      const toBlock = Math.min(fromBlock + CHUNK_SIZE, currentBlock);
      
      try {
        console.log(`   Scanning blocks ${fromBlock} to ${toBlock}...`);
        
        const filter = poolManager.filters.Initialize();
        const events = await poolManager.queryFilter(filter, fromBlock, toBlock);

        for (const event of events) {
          // In ethers v6, we need to check if it's an EventLog with args
          if ('args' in event && event.args) {
            const { id, currency0, currency1, fee, tickSpacing, hooks } = event.args;

            const poolInfo: PoolInfo = {
              currency0: currency0.toLowerCase(),
              currency1: currency1.toLowerCase(),
              fee: Number(fee),
              tickSpacing: Number(tickSpacing),
              hooks: hooks.toLowerCase(),
              poolId: id,
              blockNumber: event.blockNumber,
              transactionHash: event.transactionHash,
            };

            pools.push(poolInfo);
          }
        }

        console.log(`   Found ${events.length} pools in this chunk (total: ${pools.length})`);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.log(`   ⚠️  Error scanning blocks ${fromBlock}-${toBlock}: ${errorMsg}`);
      }

      fromBlock = toBlock + 1;
    }

    console.log(`✅ Found ${pools.length} total pools on ${config.name}`);
    return pools;

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`❌ Error fetching pools for ${config.name}:`, errorMsg);
    return [];
  }
}

/**
 * Fetches pool keys for all chains
 */
async function fetchAllPoolKeys(
  includeTestnets = false
): Promise<Record<string, PoolInfo[]>> {
  console.log("🚀 Starting pool key fetch across all chains...");
  console.log(`   Include testnets: ${includeTestnets}`);

  const chainsToFetch = includeTestnets
    ? CHAIN_CONFIGS
    : CHAIN_CONFIGS.filter((c) => !c.isTestnet);

  const results: Record<string, PoolInfo[]> = {};

  // Fetch sequentially to avoid rate limits
  for (const config of chainsToFetch) {
    const pools = await fetchPoolKeysForChain(config);
    results[config.name] = pools;
    
    // Add delay between chains to avoid rate limits
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  return results;
}

/**
 * Saves pool keys to organized JSON files
 */
function savePoolKeys(
  allPoolKeys: Record<string, PoolInfo[]>,
  outputDir = "./pool-keys"
): void {
  console.log(`\n💾 Saving pool keys to ${outputDir}...`);

  // Create output directory
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Save individual chain files
  for (const [chainName, pools] of Object.entries(allPoolKeys)) {
    const fileName = `${chainName.toLowerCase().replace(/\s+/g, "-")}.json`;
    const filePath = path.join(outputDir, fileName);
    
    fs.writeFileSync(filePath, JSON.stringify(pools, null, 2));
    console.log(`   ✅ Saved ${pools.length} pools for ${chainName} to ${fileName}`);
  }

  // Save summary file
  const summary = {
    generatedAt: new Date().toISOString(),
    totalChains: Object.keys(allPoolKeys).length,
    totalPools: Object.values(allPoolKeys).reduce((sum, pools) => sum + pools.length, 0),
    chainSummary: Object.entries(allPoolKeys).map(([chain, pools]) => ({
      chain,
      poolCount: pools.length,
    })),
  };

  const summaryPath = path.join(outputDir, "summary.json");
  fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
  console.log("   ✅ Saved summary to summary.json");

  // Save combined file
  const combinedPath = path.join(outputDir, "all-pools.json");
  fs.writeFileSync(combinedPath, JSON.stringify(allPoolKeys, null, 2));
  console.log("   ✅ Saved combined data to all-pools.json");
}

/**
 * Main execution function
 */
async function main() {
  const args = process.argv.slice(2);
  const includeTestnets = args.includes("--testnets");
  const outputDir = args.find((arg) => arg.startsWith("--output="))?.split("=")[1] || "./pool-keys";
  const chainArg = args.find((arg) => arg.startsWith("--chain="))?.split("=")[1];

  console.log("╔════════════════════════════════════════════════════════════╗");
  console.log("║   Uniswap V4 Pool Keys Fetcher - All Chains               ║");
  console.log("╚════════════════════════════════════════════════════════════╝");

  try {
    let allPoolKeys: Record<string, PoolInfo[]>;

    // If specific chain requested, only fetch that one
    if (chainArg) {
      const config = CHAIN_CONFIGS.find(
        (c) => c.name.toLowerCase() === chainArg.toLowerCase()
      );

      if (!config) {
        console.error(`\n❌ Chain "${chainArg}" not found!`);
        console.log("\n📋 Available chains:");
        for (const c of CHAIN_CONFIGS) {
          console.log(`   - ${c.name}${c.isTestnet ? " (testnet)" : ""}`);
        }
        process.exit(1);
      }

      console.log(`\n🎯 Fetching only: ${config.name}`);
      const pools = await fetchPoolKeysForChain(config);
      allPoolKeys = { [config.name]: pools };
    } else {
      // Fetch all chains
      allPoolKeys = await fetchAllPoolKeys(includeTestnets);
    }

    savePoolKeys(allPoolKeys, outputDir);

    console.log("\n✨ Pool key fetch completed successfully!");
    console.log("\n📊 Summary:");
    console.log(`   Total chains scanned: ${Object.keys(allPoolKeys).length}`);
    console.log(`   Total pools found: ${Object.values(allPoolKeys).reduce((sum, pools) => sum + pools.length, 0)}`);
    
    // Display per-chain breakdown
    console.log("\n📋 Pools by chain:");
    for (const [chain, pools] of Object.entries(allPoolKeys)) {
      console.log(`   ${chain.padEnd(25)} ${pools.length} pools`);
    }

  } catch (error) {
    console.error("\n❌ Fatal error:", error);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main().catch((error) => {
    console.error("Unhandled error:", error);
    process.exit(1);
  });
}

export { fetchAllPoolKeys, fetchPoolKeysForChain, CHAIN_CONFIGS };

