# Uniswap V4 Pool Keys Fetcher

A comprehensive script to fetch all pool keys from every chain where Uniswap V4 is deployed.

## Overview

This script connects to all Uniswap V4 deployments across multiple chains and fetches pool initialization data by scanning `Initialize` events from the PoolManager contracts.

## Features

- ✅ Supports all mainnet chains (Ethereum, Base, Arbitrum, Optimism, Polygon, etc.)
- ✅ Optional testnet support
- ✅ Automatic chunking to handle RPC limitations
- ✅ Error handling and retry logic
- ✅ Organized output by chain
- ✅ Summary statistics
- ✅ Uses official deployment addresses from [Uniswap docs](https://docs.uniswap.org/contracts/v4/deployments)

## Supported Chains

### Mainnet
- Ethereum (1)
- Unichain (130)
- Optimism (10)
- Base (8453)
- Arbitrum One (42161)
- Polygon (137)
- Blast (81457)
- Zora (7777777)
- Worldchain (480)
- Ink (57073)
- Soneium (1868)
- Avalanche (43114)
- BNB Smart Chain (56)
- Celo (42220)

### Testnet (optional)
- Unichain Sepolia (1301)
- Sepolia (11155111)
- Base Sepolia (84532)
- Arbitrum Sepolia (421614)

## Installation

Ensure you have the required dependencies:

```bash
cd hardhat
npm install
```

## Configuration

### RPC URLs

The script uses environment variables for RPC URLs. You can:

1. **Use default public RPCs** (included in the script)
2. **Set custom RPCs** via environment variables:

```bash
export ETHEREUM_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/YOUR_API_KEY
export BASE_RPC_URL=https://base-mainnet.g.alchemy.com/v2/YOUR_API_KEY
export ARBITRUM_RPC_URL=https://arb-mainnet.g.alchemy.com/v2/YOUR_API_KEY
# ... etc
```

3. **Create a .env file** in the hardhat directory:

```env
ETHEREUM_RPC_URL=https://eth.llamarpc.com
BASE_RPC_URL=https://mainnet.base.org
ARBITRUM_RPC_URL=https://arb1.arbitrum.io/rpc
# ... etc
```

### Recommended RPC Providers

For better rate limits and reliability:
- [Alchemy](https://www.alchemy.com/)
- [Infura](https://www.infura.io/)
- [QuickNode](https://www.quicknode.com/)
- [Ankr](https://www.ankr.com/)

## Usage

### Basic Usage (Mainnet Only)

```bash
npx ts-node scripts/fetchAllPoolKeys.ts
```

### Include Testnets

```bash
npx ts-node scripts/fetchAllPoolKeys.ts --testnets
```

### Custom Output Directory

```bash
npx ts-node scripts/fetchAllPoolKeys.ts --output=./my-pool-data
```

### Combined Options

```bash
npx ts-node scripts/fetchAllPoolKeys.ts --testnets --output=./pool-data
```

## Output

The script creates a directory structure with the following files:

```
pool-keys/
├── summary.json              # Overall statistics
├── all-pools.json            # All pools combined
├── ethereum.json             # Ethereum pools
├── base.json                 # Base pools
├── arbitrum-one.json         # Arbitrum pools
├── optimism.json             # Optimism pools
└── ...                       # Other chains
```

### Output Format

Each pool entry contains:

```json
{
  "currency0": "0x...",           // First token address (lowercase)
  "currency1": "0x...",           // Second token address (lowercase)
  "fee": 3000,                    // Fee tier (e.g., 3000 = 0.3%)
  "tickSpacing": 60,              // Tick spacing
  "hooks": "0x...",               // Hooks contract address (lowercase)
  "poolId": "0x...",              // Pool ID (keccak256 hash)
  "blockNumber": 12345678,        // Block where pool was created
  "transactionHash": "0x..."      // Transaction that created the pool
}
```

## How It Works

1. **Event Scanning**: The script scans the `Initialize` event from each chain's PoolManager contract
2. **Chunking**: Divides the block range into chunks (default 10,000 blocks) to avoid RPC limits
3. **Error Handling**: Continues scanning even if some chunks fail
4. **Rate Limiting**: Adds delays between chains to avoid rate limits
5. **Data Export**: Organizes and saves data to JSON files

## Performance Considerations

- **Time**: Scanning all chains can take 10-30 minutes depending on:
  - Number of pools on each chain
  - RPC provider speed and rate limits
  - Network conditions
  
- **Rate Limits**: The script includes delays, but you may need to:
  - Use premium RPC endpoints for faster scanning
  - Adjust chunk sizes if you encounter issues
  - Run the script during off-peak hours

## Troubleshooting

### RPC Errors

If you see "could not detect network" or connection errors:
- Check your RPC URLs are correct
- Ensure you have internet connectivity
- Try using a premium RPC provider
- Some chains may have temporary RPC issues

### Rate Limiting

If you hit rate limits:
- Reduce the `CHUNK_SIZE` constant in the script
- Add longer delays between requests
- Use paid RPC providers with higher limits

### Incomplete Data

If some chains return 0 pools but you expect more:
- The chain might be new with few pools
- Check the RPC endpoint is working
- Verify the PoolManager address is correct

## Programmatic Usage

You can also import and use the functions in your own scripts:

```typescript
import { fetchAllPoolKeys, fetchPoolKeysForChain, CHAIN_CONFIGS } from './fetchAllPoolKeys';

// Fetch all pools
const allPools = await fetchAllPoolKeys(true); // true = include testnets

// Fetch a specific chain
const ethereumConfig = CHAIN_CONFIGS.find(c => c.chainId === 1);
const ethereumPools = await fetchPoolKeysForChain(ethereumConfig);
```

## Related Scripts

- `retrievePoolKeys.ts` - Retrieves specific pool keys from a pool ID
- `submitPoolKeys.ts` - Submits pool keys to a contract

## References

- [Uniswap V4 Deployments](https://docs.uniswap.org/contracts/v4/deployments)
- [Uniswap V4 Core](https://github.com/Uniswap/v4-core)
- [Uniswap V4 Periphery](https://github.com/Uniswap/v4-periphery)

## License

Same as the parent project.

