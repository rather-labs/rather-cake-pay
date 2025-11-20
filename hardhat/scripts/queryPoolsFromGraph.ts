import * as fs from "node:fs";
import * as path from "node:path";
import * as dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

/**
 * Token information from The Graph
 */
interface Token {
  id: string;
  symbol: string;
  name: string;
  decimals: string;
}

/**
 * Pool information from The Graph (Uniswap V3)
 */
interface PoolV3 {
  id: string;
  token0: Token;
  token1: Token;
  feeTier: string;
  liquidity: string;
  sqrtPrice: string;
  tick: string;
  totalValueLockedUSD: string;
  volumeUSD: string;
  createdAtTimestamp: string;
  createdAtBlockNumber: string;
}

/**
 * Pool information from The Graph (Uniswap V4)
 */
interface PoolV4 {
  id: string;
  currency0: Token;
  currency1: Token;
  fee: string;
  tickSpacing: string;
  hooks: string;
  liquidity: string;
  sqrtPriceX96: string;
  tick: string;
  createdAtTimestamp: string;
  createdAtBlockNumber: string;
}

/**
 * GraphQL response wrapper
 */
interface GraphQLResponse<T> {
  data: {
    pools?: T[];
    pool?: T;
  };
  errors?: Array<{
    message: string;
    locations?: Array<{ line: number; column: number }>;
    path?: string[];
  }>;
}

/**
 * Configuration for The Graph queries
 */
interface GraphConfig {
  endpoint: string;
  version: "v3" | "v4";
  first?: number;
  skip?: number;
  orderBy?: string;
  orderDirection?: "asc" | "desc";
  where?: Record<string, any>;
}

/**
 * Subgraph IDs for Base Sepolia
 * 
 * To find your subgraph ID:
 * 1. Go to https://thegraph.com/studio
 * 2. Select your subgraph
 * 3. Copy the Subgraph ID from the dashboard
 * 
 * These can be set via environment variables:
 * - GRAPH_SUBGRAPH_ID_V3
 * - GRAPH_SUBGRAPH_ID_V4
 */
const SUBGRAPH_IDS = {
  v3: process.env.GRAPH_SUBGRAPH_ID_V3 || "",
  v4: process.env.GRAPH_SUBGRAPH_ID_V4 || "",
};

/**
 * Default public subgraph endpoints for Base Sepolia
 * 
 * Note: These endpoints may not exist yet or may need to be updated.
 * To find the correct endpoint:
 * 1. Check Uniswap documentation: https://docs.uniswap.org/api/subgraph/overview
 * 2. Visit The Graph Explorer: https://thegraph.com/explorer
 * 3. Search for "uniswap" and filter by "base-sepolia" network
 * 4. Use the subgraph's GraphQL endpoint URL
 */
const DEFAULT_PUBLIC_ENDPOINTS = {
  v3: "https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v3-base-sepolia",
  v4: "https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v4-base-sepolia",
};

/**
 * Builds The Graph Studio endpoint URL
 * 
 * Format: https://gateway.thegraph.com/api/[api-key]/subgraphs/id/[subgraph-id]
 * 
 * @param apiKey The Graph API key from environment
 * @param subgraphId The subgraph ID
 * @returns The Graph Studio endpoint URL
 */
function buildStudioEndpoint(apiKey: string, subgraphId: string): string {
  if (!apiKey) {
    throw new Error("GRAPH_API_KEY is required for Graph Studio endpoint");
  }
  if (!subgraphId) {
    throw new Error("Subgraph ID is required for Graph Studio endpoint");
  }
  return `https://gateway.thegraph.com/api/${apiKey}/subgraphs/id/${subgraphId}`;
}

/**
 * Resolves the endpoint to use based on configuration
 * 
 * Priority:
 * 1. Custom endpoint provided via --endpoint flag
 * 2. Graph Studio endpoint (if GRAPH_API_KEY and subgraph ID are set)
 * 3. Default public endpoint
 * 
 * @param version Uniswap version (v3 or v4)
 * @param customEndpoint Optional custom endpoint from command line
 * @returns The resolved endpoint URL
 */
function resolveEndpoint(
  version: "v3" | "v4",
  customEndpoint?: string
): string {
  // Use custom endpoint if provided
  if (customEndpoint) {
    return customEndpoint;
  }

  // Try to use Graph Studio if API key and subgraph ID are available
  const apiKey = process.env.GRAPH_API_KEY;
  const subgraphId = SUBGRAPH_IDS[version];

  if (apiKey && subgraphId) {
    try {
      const studioEndpoint = buildStudioEndpoint(apiKey, subgraphId);
      console.log(`   Using Graph Studio endpoint for ${version.toUpperCase()}`);
      return studioEndpoint;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.log(`   ⚠️  Could not build Studio endpoint: ${errorMsg}`);
      console.log(`   Falling back to public endpoint`);
    }
  } else {
    if (!apiKey) {
      console.log(`   ℹ️  GRAPH_API_KEY not set, using public endpoint`);
    }
    if (!subgraphId) {
      console.log(`   ℹ️  GRAPH_SUBGRAPH_ID_${version.toUpperCase()} not set, using public endpoint`);
    }
  }

  // Fall back to default public endpoint
  return DEFAULT_PUBLIC_ENDPOINTS[version];
}

/**
 * GraphQL query for Uniswap V3 pools
 */
function buildV3Query(config: GraphConfig): string {
  const first = config.first || 100;
  const skip = config.skip || 0;
  const orderBy = config.orderBy || "totalValueLockedUSD";
  const orderDirection = config.orderDirection || "desc";

  let whereClause = "";
  if (config.where && Object.keys(config.where).length > 0) {
    const conditions = Object.entries(config.where)
      .map(([key, value]) => `${key}: "${value}"`)
      .join(", ");
    whereClause = `where: { ${conditions} }`;
  }

  return `
    {
      pools(
        first: ${first}
        skip: ${skip}
        orderBy: ${orderBy}
        orderDirection: ${orderDirection}
        ${whereClause}
      ) {
        id
        token0 {
          id
          symbol
          name
          decimals
        }
        token1 {
          id
          symbol
          name
          decimals
        }
        feeTier
        liquidity
        sqrtPrice
        tick
        totalValueLockedUSD
        volumeUSD
        createdAtTimestamp
        createdAtBlockNumber
      }
    }
  `;
}

/**
 * GraphQL query for Uniswap V4 pools
 */
function buildV4Query(config: GraphConfig): string {
  const first = config.first || 100;
  const skip = config.skip || 0;
  const orderBy = config.orderBy || "liquidity";
  const orderDirection = config.orderDirection || "desc";

  let whereClause = "";
  if (config.where && Object.keys(config.where).length > 0) {
    const conditions = Object.entries(config.where)
      .map(([key, value]) => `${key}: "${value}"`)
      .join(", ");
    whereClause = `where: { ${conditions} }`;
  }

  return `
    {
      pools(
        first: ${first}
        skip: ${skip}
        orderBy: ${orderBy}
        orderDirection: ${orderDirection}
        ${whereClause}
      ) {
        id
        currency0 {
          id
          symbol
          name
          decimals
        }
        currency1 {
          id
          symbol
          name
          decimals
        }
        fee
        tickSpacing
        hooks
        liquidity
        sqrtPriceX96
        tick
        createdAtTimestamp
        createdAtBlockNumber
      }
    }
  `;
}

/**
 * Executes a GraphQL query against The Graph endpoint
 */
async function queryGraph<T>(
  endpoint: string,
  query: string
): Promise<GraphQLResponse<T>> {
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query }),
    });

    if (!response.ok) {
      throw new Error(
        `HTTP error! status: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();
    return data as GraphQLResponse<T>;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to query The Graph: ${errorMsg}`);
  }
}

/**
 * Fetches all pools with pagination
 */
async function fetchAllPools(
  config: GraphConfig
): Promise<PoolV3[] | PoolV4[]> {
  console.log(`\n📡 Querying ${config.version.toUpperCase()} pools from The Graph...`);
  console.log(`   Endpoint: ${config.endpoint}`);
  console.log(`   Fetching pools (first: ${config.first || 100})...`);

  const query =
    config.version === "v3" ? buildV3Query(config) : buildV4Query(config);

  try {
    if (config.version === "v3") {
      const response = await queryGraph<PoolV3>(config.endpoint, query);
      if (response.errors) {
        console.error("❌ GraphQL errors:");
        for (const error of response.errors) {
          console.error(`   ${error.message}`);
        }
        throw new Error("GraphQL query failed");
      }
      const pools = response.data.pools || [];
      console.log(`✅ Found ${pools.length} pools`);
      return pools as PoolV3[];
    } else {
      const response = await queryGraph<PoolV4>(config.endpoint, query);
      if (response.errors) {
        console.error("❌ GraphQL errors:");
        for (const error of response.errors) {
          console.error(`   ${error.message}`);
        }
        throw new Error("GraphQL query failed");
      }
      const pools = response.data.pools || [];
      console.log(`✅ Found ${pools.length} pools`);
      return pools as PoolV4[];
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`❌ Error fetching pools: ${errorMsg}`);
    throw error;
  }
}

/**
 * Formats pool data for display
 */
function formatPool(pool: PoolV3 | PoolV4, version: "v3" | "v4"): string {
  if (version === "v3") {
    const p = pool as PoolV3;
    const liquidity = BigInt(p.liquidity || "0");
    const tvl = parseFloat(p.totalValueLockedUSD || "0");
    const fee = parseFloat(p.feeTier) / 10000;

    return `
  Pool ID: ${p.id}
  Pair: ${p.token0.symbol} / ${p.token1.symbol}
  Token0: ${p.token0.name} (${p.token0.id})
  Token1: ${p.token1.name} (${p.token1.id})
  Fee: ${fee}% (${p.feeTier} bps)
  Liquidity: ${liquidity.toString()}
  TVL: $${tvl.toFixed(2)}
  Volume (24h): $${parseFloat(p.volumeUSD || "0").toFixed(2)}
  Created: Block ${p.createdAtBlockNumber} (${new Date(
      parseInt(p.createdAtTimestamp) * 1000
    ).toISOString()})
`;
  } else {
    const p = pool as PoolV4;
    const liquidity = BigInt(p.liquidity || "0");
    const fee = parseFloat(p.fee) / 10000;

    return `
  Pool ID: ${p.id}
  Pair: ${p.currency0.symbol} / ${p.currency1.symbol}
  Currency0: ${p.currency0.name} (${p.currency0.id})
  Currency1: ${p.currency1.name} (${p.currency1.id})
  Fee: ${fee}% (${p.fee} bps)
  Tick Spacing: ${p.tickSpacing}
  Hooks: ${p.hooks}
  Liquidity: ${liquidity.toString()}
  Created: Block ${p.createdAtBlockNumber} (${new Date(
      parseInt(p.createdAtTimestamp) * 1000
    ).toISOString()})
`;
  }
}

/**
 * Saves pools to JSON file
 */
function savePools(
  pools: PoolV3[] | PoolV4[],
  version: "v3" | "v4",
  outputDir = "./pool-keys"
): void {
  console.log(`\n💾 Saving pools to ${outputDir}...`);

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const fileName = `uniswap-${version}-base-sepolia-pools-${Date.now()}.json`;
  const filePath = path.join(outputDir, fileName);

  const output = {
    version,
    network: "base-sepolia",
    fetchedAt: new Date().toISOString(),
    poolCount: pools.length,
    pools,
  };

  fs.writeFileSync(filePath, JSON.stringify(output, null, 2));
  console.log(`   ✅ Saved ${pools.length} pools to ${fileName}`);
}

/**
 * Main execution function
 */
async function main() {
  const args = process.argv.slice(2);

  // Parse command line arguments
  const versionArg = args.find((arg) => arg.startsWith("--version="))?.split("=")[1] || "v3";
  const endpointArg = args.find((arg) => arg.startsWith("--endpoint="))?.split("=")[1];
  const firstArg = args.find((arg) => arg.startsWith("--first="))?.split("=")[1];
  const outputArg = args.find((arg) => arg.startsWith("--output="))?.split("=")[1];
  const tokenArg = args.find((arg) => arg.startsWith("--token="))?.split("=")[1];
  const minLiquidityArg = args.find((arg) => arg.startsWith("--min-liquidity="))?.split("=")[1];

  const version = (versionArg === "v4" ? "v4" : "v3") as "v3" | "v4";
  const endpoint = resolveEndpoint(version, endpointArg);

  console.log("╔════════════════════════════════════════════════════════════╗");
  console.log("║   Uniswap Pool Query - Base Sepolia (The Graph)           ║");
  console.log("╚════════════════════════════════════════════════════════════╝");

  // Build query configuration
  const config: GraphConfig = {
    endpoint,
    version,
    first: firstArg ? parseInt(firstArg, 10) : 100,
    orderBy: version === "v3" ? "totalValueLockedUSD" : "liquidity",
    orderDirection: "desc",
  };

  // Add filters if provided
  // Note: The Graph uses a different syntax - we'll query twice and merge results
  // or use token0_contains/token1_contains if the subgraph supports it
  if (tokenArg) {
    console.log(`   Filtering by token: ${tokenArg}`);
    // For now, we'll fetch all and filter client-side
    // In production, you might want to use subgraph-specific filters
  }

  try {
    // Fetch pools
    const pools = await fetchAllPools(config);

    if (pools.length === 0) {
      console.log("\n⚠️  No pools found. This could mean:");
      console.log("   - The subgraph endpoint is incorrect");
      console.log("   - No pools exist on Base Sepolia yet");
      console.log("   - The subgraph hasn't indexed any pools");
      console.log("\n💡 Try:");
      console.log("   - Verifying the endpoint URL");
      console.log("   - Checking if pools exist on the network");
      console.log("   - Using a different version (--version=v3 or --version=v4)");
      return;
    }

    // Filter by token if specified
    let filteredPools: PoolV3[] | PoolV4[] = pools;
    if (tokenArg) {
      const tokenLower = tokenArg.toLowerCase();
      if (version === "v3") {
        filteredPools = (pools as PoolV3[]).filter((pool) => {
          return (
            pool.token0.id.toLowerCase() === tokenLower ||
            pool.token1.id.toLowerCase() === tokenLower
          );
        });
      } else {
        filteredPools = (pools as PoolV4[]).filter((pool) => {
          return (
            pool.currency0.id.toLowerCase() === tokenLower ||
            pool.currency1.id.toLowerCase() === tokenLower
          );
        });
      }
      console.log(
        `\n🔍 Filtered to ${filteredPools.length} pools containing token ${tokenArg}`
      );
    }

    // Filter by minimum liquidity if specified
    if (minLiquidityArg) {
      const minLiquidity = BigInt(minLiquidityArg);
      const beforeCount = filteredPools.length;
      if (version === "v3") {
        filteredPools = (filteredPools as PoolV3[]).filter((pool) => {
          const liquidity = BigInt(pool.liquidity || "0");
          return liquidity >= minLiquidity;
        });
      } else {
        filteredPools = (filteredPools as PoolV4[]).filter((pool) => {
          const liquidity = BigInt(pool.liquidity || "0");
          return liquidity >= minLiquidity;
        });
      }
      console.log(
        `\n🔍 Filtered to ${filteredPools.length} pools with liquidity >= ${minLiquidityArg} (from ${beforeCount})`
      );
    }

    // Display summary
    console.log("\n📊 Pool Summary:");
    console.log(`   Total pools found: ${filteredPools.length}`);
    if (version === "v3") {
      const v3Pools = filteredPools as PoolV3[];
      const totalTVL = v3Pools.reduce(
        (sum, p) => sum + parseFloat(p.totalValueLockedUSD || "0"),
        0
      );
      console.log(`   Total TVL: $${totalTVL.toFixed(2)}`);
    }

    // Display top pools
    console.log("\n🏆 Top 10 Pools:");
    const topPools = filteredPools.slice(0, 10);
    for (let i = 0; i < topPools.length; i++) {
      console.log(`\n${i + 1}.${formatPool(topPools[i], version)}`);
    }

    // Save to file
    const outputDir = outputArg || "./pool-keys";
    savePools(filteredPools, version, outputDir);

    console.log("\n✨ Query completed successfully!");
    console.log("\n💡 Usage examples:");
    console.log("   Query V3 pools:");
    console.log("     npx ts-node scripts/queryPoolsFromGraph.ts --version=v3");
    console.log("   Query V4 pools:");
    console.log("     npx ts-node scripts/queryPoolsFromGraph.ts --version=v4");
    console.log("   Filter by token:");
    console.log("     npx ts-node scripts/queryPoolsFromGraph.ts --token=0x...");
    console.log("   Custom endpoint:");
    console.log("     npx ts-node scripts/queryPoolsFromGraph.ts --endpoint=https://...");
    console.log("   Limit results:");
    console.log("     npx ts-node scripts/queryPoolsFromGraph.ts --first=50");
    console.log("\n📝 Environment variables for Graph Studio:");
    console.log("   GRAPH_API_KEY - Your Graph Studio API key");
    console.log("   GRAPH_SUBGRAPH_ID_V3 - V3 subgraph ID (optional)");
    console.log("   GRAPH_SUBGRAPH_ID_V4 - V4 subgraph ID (optional)");
    console.log("\n   If both are set, the script will use Graph Studio endpoints automatically.");
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

export {
  fetchAllPools,
  queryGraph,
  resolveEndpoint,
  buildStudioEndpoint,
  DEFAULT_PUBLIC_ENDPOINTS,
  SUBGRAPH_IDS,
};

