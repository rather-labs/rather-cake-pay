# Pool Keys Guide: Querying and Submitting to CakeFactory

This guide explains how to discover Uniswap pools using The Graph and submit their pool keys to your deployed CakeFactory contract.

## Overview

The workflow consists of two main steps:
1. **Query pools from The Graph** - Discover available Uniswap pools on Base Sepolia
2. **Submit pool keys to CakeFactory** - Register pool keys so the contract can perform swaps

## Prerequisites

- Node.js and npm installed
- Hardhat project dependencies installed (`npm install` in `hardhat/` directory)
- Deployed CakeFactory contract address
- Owner private key or account with owner permissions
- (Optional) The Graph Studio API key for premium endpoints

## Step 1: Query Pools from The Graph

### Setup Environment Variables

Create or update your `.env` file in the `hardhat/` directory:

```bash
# Required: Your deployed CakeFactory contract address
CAKE_FACTORY_ADDRESS=0xYourCakeFactoryAddress

# Optional: The Graph Studio API key (for premium endpoints)
GRAPH_API_KEY=your_graph_api_key_here

# Optional: Subgraph IDs for Graph Studio
GRAPH_SUBGRAPH_ID_V3=your_v3_subgraph_id
GRAPH_SUBGRAPH_ID_V4=your_v4_subgraph_id

# Network configuration (if not using default)
BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
BASE_SEPOLIA_PRIVATE_KEY=your_private_key_here
```

### Finding Subgraph Endpoints

#### Option 1: Public Endpoints (Default)

The script uses public Uniswap subgraph endpoints by default. These may not be available for all networks yet.

#### Option 2: The Graph Studio (Recommended)

1. Go to [The Graph Studio](https://thegraph.com/studio)
2. Create an account or sign in
3. Create a new subgraph or find an existing Uniswap subgraph
4. Copy your **API Key** from the dashboard
5. Copy the **Subgraph ID** for the version you need (V3 or V4)
6. Add both to your `.env` file

The script will automatically use Graph Studio endpoints if both `GRAPH_API_KEY` and the appropriate subgraph ID are set.

### Querying Pools

#### Basic Query (V3 Pools)

```bash
cd hardhat
npx ts-node scripts/queryPoolsFromGraph.ts --version=v3
```

#### Query V4 Pools

```bash
npx ts-node scripts/queryPoolsFromGraph.ts --version=v4
```

#### Filter by Token Address

```bash
npx ts-node scripts/queryPoolsFromGraph.ts --token=0xYourTokenAddress
```

#### Limit Results

```bash
npx ts-node scripts/queryPoolsFromGraph.ts --first=50
```

#### Filter by Minimum Liquidity

```bash
npx ts-node scripts/queryPoolsFromGraph.ts --min-liquidity=1000000
```

#### Use Custom Endpoint

```bash
npx ts-node scripts/queryPoolsFromGraph.ts --endpoint=https://your-custom-endpoint
```

#### Custom Output Directory

```bash
npx ts-node scripts/queryPoolsFromGraph.ts --output=./my-pools
```

### Output Format

The script saves pools to JSON files in the `./pool-keys/` directory (or your custom output directory):

```json
{
  "version": "v3",
  "network": "base-sepolia",
  "fetchedAt": "2024-01-15T10:30:00.000Z",
  "poolCount": 25,
  "pools": [
    {
      "id": "0x...",
      "token0": {
        "id": "0xToken0Address",
        "symbol": "USDC",
        "name": "USD Coin",
        "decimals": "6"
      },
      "token1": {
        "id": "0xToken1Address",
        "symbol": "WETH",
        "name": "Wrapped Ether",
        "decimals": "18"
      },
      "feeTier": "3000",
      "liquidity": "1000000000000",
      "totalValueLockedUSD": "50000.50",
      "volumeUSD": "10000.25"
    }
  ]
}
```

## Step 2: Convert Graph Data to Pool Keys

The Graph query returns pool data, but you need to convert it to the format required by CakeFactory.

### Automatic Conversion (Recommended)

Use the provided conversion script:

```bash
# Convert the most recent Graph output file
npx ts-node scripts/convertGraphToPoolKeys.ts

# Or specify input and output files
npx ts-node scripts/convertGraphToPoolKeys.ts \
  --input=./pool-keys/uniswap-v3-base-sepolia-pools-*.json \
  --output=./pool-keys/poolKeysToSubmit.json \
  --cake-factory=0xYourCakeFactoryAddress

# Filter by minimum liquidity
npx ts-node scripts/convertGraphToPoolKeys.ts \
  --input=./pool-keys/uniswap-v3-base-sepolia-pools-*.json \
  --min-liquidity=1000000
```

The script automatically:
- Converts V3 and V4 pool formats
- Maps fee tiers to tick spacing
- Sorts tokens (token0 < token1)
- Removes duplicates
- Filters by minimum liquidity (optional)

### Manual Conversion

If you prefer to convert manually, here are the key differences:

### V3 Pools
- `feeTier` → `fee` (already in basis points, e.g., 3000 = 0.3%)
- Need to determine `tickSpacing` (typically 60 for 0.3% fee, 10 for 0.05% fee, 200 for 1% fee)
- `token0` and `token1` → `currency0` and `currency1`
- `hooks` is typically `0x0000000000000000000000000000000000000000` for V3

### V4 Pools
- `fee` is already in the correct format
- `tickSpacing` is provided directly
- `currency0` and `currency1` are already in the correct format
- `hooks` address is provided

### Example Conversion Script

You can create a simple script to convert the Graph output:

```typescript
// convertPools.ts
import * as fs from "node:fs";

interface GraphPoolV3 {
  token0: { id: string };
  token1: { id: string };
  feeTier: string;
}

interface PoolKeyConfig {
  currency0: string;
  currency1: string;
  fee: number;
  tickSpacing: number;
  hooks: string;
}

// Map fee tier to tick spacing (common Uniswap V3 values)
const FEE_TO_TICK_SPACING: Record<number, number> = {
  100: 1,    // 0.01%
  500: 10,   // 0.05%
  3000: 60,  // 0.3%
  10000: 200 // 1%
};

function convertV3PoolToPoolKey(pool: GraphPoolV3): PoolKeyConfig {
  const fee = parseInt(pool.feeTier);
  const tickSpacing = FEE_TO_TICK_SPACING[fee] || 60; // Default to 60

  return {
    currency0: pool.token0.id.toLowerCase(),
    currency1: pool.token1.id.toLowerCase(),
    fee: fee,
    tickSpacing: tickSpacing,
    hooks: "0x0000000000000000000000000000000000000000"
  };
}

// Load Graph output
const graphData = JSON.parse(fs.readFileSync("./pool-keys/uniswap-v3-base-sepolia-pools-*.json", "utf8"));

// Convert pools
const poolKeys: PoolKeyConfig[] = graphData.pools.map(convertV3PoolToPoolKey);

// Save in CakeFactory format
const output = {
  cakeFactoryAddress: process.env.CAKE_FACTORY_ADDRESS || "0x0000000000000000000000000000000000000000",
  poolKeys: poolKeys
};

fs.writeFileSync("./pool-keys/poolKeysToSubmit.json", JSON.stringify(output, null, 2));
console.log(`Converted ${poolKeys.length} pools to pool keys format`);
```

## Step 3: Submit Pool Keys to CakeFactory

### Method 1: Using JSON Configuration File

1. Create a JSON file with your pool keys (see `poolKeys.example.json`):

```json
{
  "cakeFactoryAddress": "0xYourCakeFactoryAddress",
  "poolKeys": [
    {
      "currency0": "0xToken0Address",
      "currency1": "0xToken1Address",
      "fee": 3000,
      "tickSpacing": 60,
      "hooks": "0x0000000000000000000000000000000000000000"
    },
    {
      "currency0": "0xAnotherToken0",
      "currency1": "0xAnotherToken1",
      "fee": 500,
      "tickSpacing": 10,
      "hooks": "0x0000000000000000000000000000000000000000"
    }
  ]
}
```

2. Submit using the JSON file:

```bash
npx hardhat run scripts/submitPoolKeys.ts --network baseSepolia poolKeysToSubmit.json
```

### Method 2: Using Command Line Arguments

```bash
npx hardhat run scripts/submitPoolKeys.ts --network baseSepolia \
  "0xYourCakeFactoryAddress" \
  "0xToken0Address" \
  "0xToken1Address" \
  3000 \
  60 \
  "0x0000000000000000000000000000000000000000"
```

Arguments:
1. CakeFactory address
2. Token0 address
3. Token1 address
4. Fee (in basis points, e.g., 3000 for 0.3%)
5. Tick spacing (e.g., 60)
6. Hooks address (optional, defaults to zero address)

### Method 3: Using Environment Variables

Set `CAKE_FACTORY_ADDRESS` in your `.env` file, then use command line arguments:

```bash
npx hardhat run scripts/submitPoolKeys.ts --network baseSepolia \
  "0xToken0Address" \
  "0xToken1Address" \
  3000 \
  60
```

### Alternative: Using addPoolKeys Script

The `addPoolKeys.ts` script works similarly but uses a slightly different interface:

```bash
npx hardhat run scripts/addPoolKeys.ts --network baseSepolia poolKeysToSubmit.json
```

## Complete Workflow Example

Here's a complete example workflow:

```bash
# 1. Navigate to hardhat directory
cd hardhat

# 2. Query V3 pools from The Graph
npx ts-node scripts/queryPoolsFromGraph.ts --version=v3 --first=10

# 3. Convert Graph output to pool keys format
npx ts-node scripts/convertGraphToPoolKeys.ts \
  --cake-factory=0xYourCakeFactoryAddress \
  --min-liquidity=1000000

# 4. Review the converted file (optional)
cat pool-keys/poolKeysToSubmit.json

# 5. Submit pool keys to your deployed contract
npx hardhat run scripts/submitPoolKeys.ts --network baseSepolia pool-keys/poolKeysToSubmit.json
```

### Quick One-Liner Workflow

```bash
# Query, convert, and prepare for submission
npx ts-node scripts/queryPoolsFromGraph.ts --version=v3 --first=20 && \
npx ts-node scripts/convertGraphToPoolKeys.ts && \
echo "Ready to submit! Run: npx hardhat run scripts/submitPoolKeys.ts --network baseSepolia pool-keys/poolKeysToSubmit.json"
```

## Understanding Pool Key Parameters

### Fee Tiers

Common Uniswap fee tiers:
- **100** (0.01%) - Very low fee, high tick spacing
- **500** (0.05%) - Low fee, typically tick spacing 10
- **3000** (0.3%) - Standard fee, typically tick spacing 60
- **10000** (1%) - High fee, typically tick spacing 200

### Tick Spacing

Tick spacing determines the granularity of price ticks in a pool. Common values:
- **1** - For 0.01% fee pools
- **10** - For 0.05% fee pools
- **60** - For 0.3% fee pools
- **200** - For 1% fee pools

### Hooks

For most pools, hooks will be the zero address (`0x0000000000000000000000000000000000000000`). Only use a hooks address if the pool specifically uses Uniswap V4 hooks.

## Troubleshooting

### "GRAPH_API_KEY not set, using public endpoint"

This is informational - the script will use public endpoints. To use Graph Studio:
1. Get your API key from [The Graph Studio](https://thegraph.com/studio)
2. Add `GRAPH_API_KEY=your_key` to `.env`

### "No pools found"

Possible causes:
- The subgraph endpoint is incorrect
- No pools exist on Base Sepolia yet
- The subgraph hasn't indexed any pools
- Network connectivity issues

**Solutions:**
- Verify the endpoint URL
- Check if pools exist on the network using a block explorer
- Try a different version (`--version=v3` or `--version=v4`)
- Use a custom endpoint with `--endpoint=`

### "Signer is not the owner"

Only the contract owner can submit pool keys. Ensure:
- Your private key in `.env` matches the owner account
- You're using the correct network
- The contract is deployed and you have the owner address

### "Transaction failed"

Common issues:
- Insufficient gas
- Invalid pool key parameters
- Token addresses don't exist on the network
- Network congestion

**Solutions:**
- Increase gas limit
- Verify token addresses are correct
- Check fee and tick spacing values are valid
- Retry during lower network activity

## Best Practices

1. **Start Small**: Test with 1-2 pool keys before submitting many
2. **Verify Tokens**: Ensure token addresses exist on Base Sepolia
3. **Check Liquidity**: Only submit pools with sufficient liquidity for your use case
4. **Monitor Gas**: Pool key submission costs gas - batch when possible
5. **Backup Data**: Keep copies of your pool keys JSON files
6. **Use Graph Studio**: For production, use Graph Studio endpoints for better reliability

## Additional Resources

- [The Graph Documentation](https://thegraph.com/docs/)
- [Uniswap V4 Documentation](https://docs.uniswap.org/contracts/v4/overview)
- [Uniswap Subgraph Guide](https://docs.uniswap.org/api/subgraph/overview)
- [Hardhat Documentation](https://hardhat.org/docs)

## Scripts Reference

- `queryPoolsFromGraph.ts` - Query pools from The Graph API
- `convertGraphToPoolKeys.ts` - Convert Graph output to CakeFactory pool keys format
- `submitPoolKeys.ts` - Submit pool keys to CakeFactory contract
- `addPoolKeys.ts` - Alternative script for adding pool keys
- `fetchAllPoolKeys.ts` - Fetch pool keys from on-chain events (different approach)

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review the script source code for detailed comments
3. Check Uniswap and The Graph documentation
4. Verify your environment variables are set correctly

