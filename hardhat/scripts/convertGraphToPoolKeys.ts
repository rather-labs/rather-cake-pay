import * as fs from "node:fs";
import * as path from "node:path";

/**
 * Pool key configuration for CakeFactory
 */
interface PoolKeyConfig {
  currency0: string;
  currency1: string;
  fee: number;
  tickSpacing: number;
  hooks: string;
}

/**
 * Graph output pool structure (V3)
 */
interface GraphPoolV3 {
  id: string;
  token0: {
    id: string;
    symbol: string;
    name: string;
    decimals: string;
  };
  token1: {
    id: string;
    symbol: string;
    name: string;
    decimals: string;
  };
  feeTier: string;
  liquidity: string;
  totalValueLockedUSD?: string;
}

/**
 * Graph output pool structure (V4)
 */
interface GraphPoolV4 {
  id: string;
  currency0: {
    id: string;
    symbol: string;
    name: string;
    decimals: string;
  };
  currency1: {
    id: string;
    symbol: string;
    name: string;
    decimals: string;
  };
  fee: string;
  tickSpacing: string;
  hooks: string;
  liquidity: string;
}

/**
 * Graph output file structure
 */
interface GraphOutput {
  version: "v3" | "v4";
  network: string;
  fetchedAt: string;
  poolCount: number;
  pools: GraphPoolV3[] | GraphPoolV4[];
}

/**
 * Output format for CakeFactory
 */
interface PoolKeySubmissionConfig {
  cakeFactoryAddress: string;
  poolKeys: PoolKeyConfig[];
}

/**
 * Map fee tier to tick spacing for Uniswap V3
 * Common mappings based on Uniswap V3 standard
 */
const FEE_TO_TICK_SPACING: Record<number, number> = {
  100: 1,    // 0.01% fee
  500: 10,   // 0.05% fee
  3000: 60,  // 0.3% fee
  10000: 200 // 1% fee
};

/**
 * Converts a V3 pool from Graph format to PoolKey format
 */
function convertV3PoolToPoolKey(pool: GraphPoolV3): PoolKeyConfig {
  const fee = parseInt(pool.feeTier, 10);
  const tickSpacing = FEE_TO_TICK_SPACING[fee] || 60; // Default to 60 if not found

  // Ensure token0 < token1 (address comparison)
  const token0 = pool.token0.id.toLowerCase();
  const token1 = pool.token1.id.toLowerCase();
  const [currency0, currency1] = token0 < token1 ? [token0, token1] : [token1, token0];

  return {
    currency0,
    currency1,
    fee,
    tickSpacing,
    hooks: "0x0000000000000000000000000000000000000000" // V3 pools don't use hooks
  };
}

/**
 * Converts a V4 pool from Graph format to PoolKey format
 */
function convertV4PoolToPoolKey(pool: GraphPoolV4): PoolKeyConfig {
  const fee = parseInt(pool.fee, 10);
  const tickSpacing = parseInt(pool.tickSpacing, 10);

  // Ensure currency0 < currency1 (address comparison)
  const curr0 = pool.currency0.id.toLowerCase();
  const curr1 = pool.currency1.id.toLowerCase();
  const [currency0, currency1] = curr0 < curr1 ? [curr0, curr1] : [curr1, curr0];

  return {
    currency0,
    currency1,
    fee,
    tickSpacing,
    hooks: pool.hooks.toLowerCase() || "0x0000000000000000000000000000000000000000"
  };
}

/**
 * Filters pools by minimum liquidity
 */
function filterByLiquidity(
  pools: (GraphPoolV3 | GraphPoolV4)[],
  minLiquidity: bigint
): (GraphPoolV3 | GraphPoolV4)[] {
  return pools.filter((pool) => {
    const liquidity = BigInt(pool.liquidity || "0");
    return liquidity >= minLiquidity;
  });
}

/**
 * Main conversion function
 */
function convertGraphToPoolKeys(
  inputFile: string,
  outputFile: string,
  cakeFactoryAddress: string,
  minLiquidity?: string
): void {
  console.log("🔄 Converting Graph output to Pool Keys format...");
  console.log(`   Input: ${inputFile}`);
  console.log(`   Output: ${outputFile}`);

  // Read Graph output file
  if (!fs.existsSync(inputFile)) {
    throw new Error(`Input file not found: ${inputFile}`);
  }

  const graphData: GraphOutput = JSON.parse(fs.readFileSync(inputFile, "utf8"));
  console.log(`   Found ${graphData.poolCount} pools (version: ${graphData.version})`);

  // Filter by liquidity if specified
  let pools = graphData.pools;
  if (minLiquidity) {
    const minLiq = BigInt(minLiquidity);
    pools = filterByLiquidity(pools, minLiq);
    console.log(`   Filtered to ${pools.length} pools with liquidity >= ${minLiquidity}`);
  }

  // Convert pools based on version
  const poolKeys: PoolKeyConfig[] = pools.map((pool) => {
    if (graphData.version === "v3") {
      return convertV3PoolToPoolKey(pool as GraphPoolV3);
    } else {
      return convertV4PoolToPoolKey(pool as GraphPoolV4);
    }
  });

  // Remove duplicates (same token pair, fee, tick spacing)
  const uniquePoolKeys = poolKeys.filter((key, index, self) =>
    index === self.findIndex((k) =>
      k.currency0 === key.currency0 &&
      k.currency1 === key.currency1 &&
      k.fee === key.fee &&
      k.tickSpacing === key.tickSpacing
    )
  );

  if (uniquePoolKeys.length < poolKeys.length) {
    console.log(`   Removed ${poolKeys.length - uniquePoolKeys.length} duplicate pool keys`);
  }

  // Create output structure
  const output: PoolKeySubmissionConfig = {
    cakeFactoryAddress: cakeFactoryAddress || "0x0000000000000000000000000000000000000000",
    poolKeys: uniquePoolKeys
  };

  // Write output file
  const outputDir = path.dirname(outputFile);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(outputFile, JSON.stringify(output, null, 2));
  console.log(`✅ Converted ${uniquePoolKeys.length} pools to pool keys format`);
  console.log(`   Saved to: ${outputFile}`);
}

/**
 * Main execution
 */
function main() {
  const args = process.argv.slice(2);

  // Parse arguments
  const inputArg = args.find((arg) => arg.startsWith("--input="))?.split("=")[1];
  const outputArg = args.find((arg) => arg.startsWith("--output="))?.split("=")[1];
  const cakeFactoryArg = args.find((arg) => arg.startsWith("--cake-factory="))?.split("=")[1];
  const minLiquidityArg = args.find((arg) => arg.startsWith("--min-liquidity="))?.split("=")[1];

  // Default values
  const inputFile = inputArg || findLatestGraphFile();
  const outputFile = outputArg || "./pool-keys/poolKeysToSubmit.json";
  const cakeFactoryAddress = cakeFactoryArg || process.env.CAKE_FACTORY_ADDRESS || "";

  if (!inputFile) {
    console.error("❌ No input file specified and no Graph output files found");
    console.log("\nUsage:");
    console.log("  npx ts-node scripts/convertGraphToPoolKeys.ts --input=./pool-keys/file.json --output=./pool-keys/poolKeys.json");
    console.log("  npx ts-node scripts/convertGraphToPoolKeys.ts --input=./pool-keys/file.json --cake-factory=0x... --min-liquidity=1000000");
    process.exit(1);
  }

  if (!cakeFactoryAddress) {
    console.warn("⚠️  CAKE_FACTORY_ADDRESS not set. Using placeholder address.");
    console.warn("   Set it via --cake-factory= or CAKE_FACTORY_ADDRESS env var");
  }

  try {
    convertGraphToPoolKeys(inputFile, outputFile, cakeFactoryAddress, minLiquidityArg);
    console.log("\n✨ Conversion complete!");
    console.log("\nNext step: Submit pool keys to your contract:");
    console.log(`  npx hardhat run scripts/submitPoolKeys.ts --network baseSepolia ${outputFile}`);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`\n❌ Error: ${errorMsg}`);
    process.exit(1);
  }
}

/**
 * Finds the most recent Graph output file
 */
function findLatestGraphFile(): string | null {
  const poolKeysDir = "./pool-keys";
  
  if (!fs.existsSync(poolKeysDir)) {
    return null;
  }

  const files = fs.readdirSync(poolKeysDir)
    .filter((file) => 
      file.startsWith("uniswap-") && 
      file.includes("base-sepolia-pools-") && 
      file.endsWith(".json")
    )
    .map((file) => path.join(poolKeysDir, file));

  if (files.length === 0) {
    return null;
  }

  // Sort by modification time (newest first)
  files.sort((a, b) => {
    const statA = fs.statSync(a);
    const statB = fs.statSync(b);
    return statB.mtimeMs - statA.mtimeMs;
  });

  return files[0];
}

// Run if executed directly
if (require.main === module) {
  main();
}

export { convertGraphToPoolKeys, convertV3PoolToPoolKey, convertV4PoolToPoolKey };

