# Quick Start: Fetching Uniswap V4 Pool Keys

Get up and running in 2 minutes! 🚀

## TL;DR

```bash
cd hardhat
npm run fetch-pools
```

That's it! Pool keys will be saved to `./pool-keys/`

## Quick Commands

### Fetch all mainnet pools
```bash
npm run fetch-pools
```

### Include testnets
```bash
npm run fetch-pools:testnets
```

### Custom output directory
```bash
npx ts-node scripts/fetchAllPoolKeys.ts --output=./my-data
```

## What You'll Get

After running, you'll find:

```
pool-keys/
├── summary.json          # Quick overview of all chains
├── all-pools.json        # Everything in one file
├── ethereum.json         # 🔵 Ethereum pools
├── base.json             # 🔵 Base pools
├── arbitrum-one.json     # 🔴 Arbitrum pools
├── optimism.json         # 🔴 Optimism pools
└── ...                   # All other chains
```

## Output Format

Each pool contains:

```json
{
  "currency0": "0xtoken1address",
  "currency1": "0xtoken2address",
  "fee": 3000,
  "tickSpacing": 60,
  "hooks": "0xhooksaddress",
  "poolId": "0xpoolid",
  "blockNumber": 12345678,
  "transactionHash": "0xtxhash"
}
```

## Using Specific Chains

Want only specific chains? Use the example script:

```bash
# Edit fetchSpecificChains.example.ts
# Uncomment the example you want
npx ts-node scripts/fetchSpecificChains.example.ts
```

Examples included:
- ✅ Single chain (e.g., just Base)
- ✅ Multiple chains (e.g., Base + Ethereum)
- ✅ Only L2 chains (faster!)
- ✅ Find pools with specific tokens
- ✅ Compare pool counts

## Performance Tips

### Faster Results
Use premium RPC endpoints:

```bash
export BASE_RPC_URL=https://base-mainnet.g.alchemy.com/v2/YOUR_KEY
export ETHEREUM_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY
npm run fetch-pools
```

### Recommended Providers
- [Alchemy](https://www.alchemy.com/) - 300M compute units/month free
- [Infura](https://www.infura.io/) - 100k requests/day free
- [QuickNode](https://www.quicknode.com/) - Fast and reliable

## Common Use Cases

### 1. Find liquidity for a token pair
```bash
# Run the script
npm run fetch-pools

# Then search the output
grep -r "0xYOURTOKENADDRESS" pool-keys/
```

### 2. Get pools for DeFi integration
```bash
# Fetch only L2s for cheaper gas
# Edit fetchSpecificChains.example.ts -> uncomment fetchL2Chains()
npx ts-node scripts/fetchSpecificChains.example.ts
```

### 3. Monitor new pools
```bash
# Run regularly and compare outputs
npm run fetch-pools
# Check the latest blockNumber in summary.json
```

## Troubleshooting

### "Could not detect network"
- Check your internet connection
- Try using a different RPC endpoint
- Some chains may have temporary issues

### "Rate limit exceeded"
- Use premium RPC providers
- Add delays between requests
- Run during off-peak hours

### "No pools found"
- The chain might be very new
- Verify the chain RPC is working
- Check [Uniswap docs](https://docs.uniswap.org/contracts/v4/deployments) for updates

## Need More?

See the full documentation:
- [`POOLKEYS_FETCHER.md`](./POOLKEYS_FETCHER.md) - Complete documentation
- [`fetchAllPoolKeys.ts`](./fetchAllPoolKeys.ts) - Main script
- [`fetchSpecificChains.example.ts`](./fetchSpecificChains.example.ts) - Programmatic examples

## Supported Chains

✅ **14 Mainnets**: Ethereum, Base, Arbitrum, Optimism, Polygon, Unichain, Blast, Zora, Worldchain, Ink, Soneium, Avalanche, BNB, Celo

✅ **4 Testnets**: Sepolia, Base Sepolia, Arbitrum Sepolia, Unichain Sepolia

Full list in [POOLKEYS_FETCHER.md](./POOLKEYS_FETCHER.md)

---

**Questions?** Check the main documentation or review the source code for advanced usage!

