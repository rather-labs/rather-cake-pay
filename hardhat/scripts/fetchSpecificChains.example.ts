/**
 * Example script showing how to fetch pool keys from specific chains
 * This demonstrates programmatic usage of the fetchAllPoolKeys module
 */

import { fetchPoolKeysForChain, CHAIN_CONFIGS } from "./fetchAllPoolKeys";
import * as fs from "fs";

/**
 * Example 1: Fetch pools from a single chain by name
 */
async function fetchByChainName(chainName: string) {
  console.log(`\n🔍 Fetching pools for ${chainName}...`);
  
  const config = CHAIN_CONFIGS.find(
    (c) => c.name.toLowerCase() === chainName.toLowerCase()
  );
  
  if (!config) {
    console.error(`❌ Chain "${chainName}" not found`);
    return;
  }
  
  const pools = await fetchPoolKeysForChain(config);
  console.log(`✅ Found ${pools.length} pools on ${chainName}`);
  
  return pools;
}

/**
 * Example 2: Fetch pools from multiple specific chains
 */
async function fetchMultipleChains(chainNames: string[]) {
  console.log(`\n🔍 Fetching pools from ${chainNames.length} chains...`);
  
  const results: Record<string, any> = {};
  
  for (const chainName of chainNames) {
    const config = CHAIN_CONFIGS.find(
      (c) => c.name.toLowerCase() === chainName.toLowerCase()
    );
    
    if (config) {
      const pools = await fetchPoolKeysForChain(config);
      results[chainName] = pools;
      
      // Add delay to avoid rate limits
      await new Promise((resolve) => setTimeout(resolve, 1000));
    } else {
      console.warn(`⚠️  Chain "${chainName}" not found, skipping...`);
    }
  }
  
  return results;
}

/**
 * Example 3: Fetch only L2 chains (faster, cheaper to interact with)
 */
async function fetchL2Chains() {
  console.log(`\n🔍 Fetching pools from L2 chains only...`);
  
  const l2Chains = ["Base", "Optimism", "Arbitrum One", "Polygon", "Blast", "Zora"];
  
  return fetchMultipleChains(l2Chains);
}

/**
 * Example 4: Fetch by chain ID
 */
async function fetchByChainId(chainId: number) {
  console.log(`\n🔍 Fetching pools for chain ID ${chainId}...`);
  
  const config = CHAIN_CONFIGS.find((c) => c.chainId === chainId);
  
  if (!config) {
    console.error(`❌ Chain ID ${chainId} not found`);
    return;
  }
  
  const pools = await fetchPoolKeysForChain(config);
  console.log(`✅ Found ${pools.length} pools on ${config.name}`);
  
  return pools;
}

/**
 * Example 5: Find pools with specific tokens
 */
async function findPoolsWithToken(chainName: string, tokenAddress: string) {
  console.log(`\n🔍 Finding pools with token ${tokenAddress} on ${chainName}...`);
  
  const pools = await fetchByChainName(chainName);
  
  if (!pools) return [];
  
  const normalizedAddress = tokenAddress.toLowerCase();
  const matchingPools = pools.filter(
    (pool) =>
      pool.currency0 === normalizedAddress ||
      pool.currency1 === normalizedAddress
  );
  
  console.log(`✅ Found ${matchingPools.length} pools containing ${tokenAddress}`);
  
  return matchingPools;
}

/**
 * Example 6: Compare pool counts across chains
 */
async function compareChainPoolCounts(chainNames: string[]) {
  console.log(`\n📊 Comparing pool counts across chains...`);
  
  const results = await fetchMultipleChains(chainNames);
  
  const comparison = Object.entries(results)
    .map(([chain, pools]) => ({
      chain,
      count: pools.length,
    }))
    .sort((a, b) => b.count - a.count);
  
  console.log("\n📋 Pool count ranking:");
  comparison.forEach((item, index) => {
    console.log(`   ${index + 1}. ${item.chain.padEnd(20)} ${item.count} pools`);
  });
  
  return comparison;
}

/**
 * Main execution - uncomment the example you want to run
 */
async function main() {
  console.log("╔════════════════════════════════════════════════════════════╗");
  console.log("║   Uniswap V4 Pool Keys Fetcher - Examples                 ║");
  console.log("╚════════════════════════════════════════════════════════════╝");

  try {
    // Example 1: Fetch from a single chain
    await fetchByChainName("Base");

    // Example 2: Fetch from multiple chains
    // await fetchMultipleChains(["Base", "Ethereum", "Arbitrum One"]);

    // Example 3: Fetch only L2 chains
    // await fetchL2Chains();

    // Example 4: Fetch by chain ID
    // await fetchByChainId(8453); // Base

    // Example 5: Find pools with specific token
    // const usdcOnBase = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
    // await findPoolsWithToken("Base", usdcOnBase);

    // Example 6: Compare pool counts
    // await compareChainPoolCounts(["Ethereum", "Base", "Arbitrum One", "Optimism"]);

    console.log("\n✨ Examples completed!");

  } catch (error) {
    console.error("\n❌ Error:", error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

// Export functions for use in other scripts
export {
  fetchByChainName,
  fetchMultipleChains,
  fetchL2Chains,
  fetchByChainId,
  findPoolsWithToken,
  compareChainPoolCounts,
};

