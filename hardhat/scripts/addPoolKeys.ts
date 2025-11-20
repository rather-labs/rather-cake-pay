import { ethers } from "hardhat";
import { readFileSync } from "node:fs";
import type { Signer, Contract } from "ethers";

/**
 * PoolKey structure for Uniswap v4
 * Matches the PoolKey struct from @uniswap/v4-core
 */
interface PoolKeyConfig {
  currency0: string; // Token address (will be wrapped as Currency)
  currency1: string; // Token address (will be wrapped as Currency)
  fee: number; // Fee tier (e.g., 500 for 0.05%, 3000 for 0.3%, 10000 for 1%)
  tickSpacing: number; // Tick spacing for the pool
  hooks: string; // Hooks contract address (use zero address if no hooks)
}

/**
 * Configuration for pool keys to add
 * Can be provided via JSON file or command line arguments
 */
interface PoolKeySubmissionConfig {
  cakeFactoryAddress: string;
  poolKeys: PoolKeyConfig[];
}

/**
 * Wraps an address into Currency format for Uniswap v4
 * Currency is a uint256 that wraps the address
 */
function wrapCurrency(address: string): bigint {
  return BigInt(address);
}

/**
 * Constructs a PoolKey struct for the contract call
 */
function constructPoolKey(config: PoolKeyConfig): {
  currency0: bigint;
  currency1: bigint;
  fee: number;
  tickSpacing: number;
  hooks: string;
} {
  // Ensure token0 < token1 (contract handles this, but we do it here for consistency)
  const token0 = config.currency0.toLowerCase() < config.currency1.toLowerCase() 
    ? config.currency0 
    : config.currency1;
  const token1 = config.currency0.toLowerCase() < config.currency1.toLowerCase() 
    ? config.currency1 
    : config.currency0;

  return {
    currency0: wrapCurrency(token0),
    currency1: wrapCurrency(token1),
    fee: config.fee,
    tickSpacing: config.tickSpacing,
    hooks: config.hooks || ethers.ZeroAddress,
  };
}

/**
 * Adds a single pool key to the CakeFactory contract
 */
async function addPoolKey(
  cakeFactory: Contract,
  config: PoolKeyConfig,
  signer: Signer
): Promise<void> {
  const poolKey = constructPoolKey(config);
  
  // Ensure tokens are sorted (token0 < token1) for consistency with contract
  const token0Address = config.currency0.toLowerCase() < config.currency1.toLowerCase() 
    ? config.currency0 
    : config.currency1;
  const token1Address = config.currency0.toLowerCase() < config.currency1.toLowerCase() 
    ? config.currency1 
    : config.currency0;
  
  console.log("Adding pool key for pair:");
  console.log(`  Token0: ${token0Address}`);
  console.log(`  Token1: ${token1Address}`);
  console.log(`  Fee: ${config.fee} (${config.fee / 10000}%)`);
  console.log(`  Tick Spacing: ${config.tickSpacing}`);
  console.log(`  Hooks: ${config.hooks || "None"}`);

  // Call storePoolKey with addresses and PoolKey struct
  const tx = await cakeFactory.connect(signer).storePoolKey(
    token0Address,
    token1Address,
    poolKey
  );

  console.log("  Transaction hash:", tx.hash);
  const receipt = await tx.wait();
  console.log("  ✓ Pool key added successfully");
  console.log(`  Gas used: ${receipt.gasUsed.toString()}\n`);
}

/**
 * Main function to add pool keys
 */
async function main() {
  // Parse command line arguments
  const args = process.argv.slice(2);
  
  let config: PoolKeySubmissionConfig;

  // Check if config file is provided
  if (args.length > 0 && args[0].endsWith(".json")) {
    // Load from JSON file
    const configPath = args[0];
    const configData = readFileSync(configPath, "utf8");
    config = JSON.parse(configData);
  } else {
    // Use command line arguments or environment variables
    const cakeFactoryAddress = 
      args[0] || 
      process.env.CAKE_FACTORY_ADDRESS || 
      process.env.CAKE_FACTORY;

    if (!cakeFactoryAddress) {
      throw new Error(
        "CakeFactory address required. Provide as first argument or set CAKE_FACTORY_ADDRESS env var"
      );
    }

    // If additional args provided, construct pool key from them
    if (args.length >= 5) {
      config = {
        cakeFactoryAddress,
        poolKeys: [
          {
            currency0: args[1],
            currency1: args[2],
            fee: Number.parseInt(args[3], 10),
            tickSpacing: Number.parseInt(args[4], 10),
            hooks: args[5] || ethers.ZeroAddress,
          },
        ],
      };
    } else {
      // Default example pool keys (can be modified)
      console.log("No pool keys provided. Using example configuration.");
      console.log("\nUsage:");
      console.log("  npx hardhat run scripts/addPoolKeys.ts --network <network> [config.json]");
      console.log("  OR:");
      console.log("  npx hardhat run scripts/addPoolKeys.ts --network <network> <cakeFactoryAddress> <token0> <token1> <fee> <tickSpacing> [hooks]");
      console.log("\nExample:");
      console.log('  npx hardhat run scripts/addPoolKeys.ts --network localhost \\');
      console.log('    "0x1234..." "0xToken0" "0xToken1" 3000 60 "0x0000..."');
      console.log("\nExample JSON config:");
      console.log('  {');
      console.log('    "cakeFactoryAddress": "0x...",');
      console.log('    "poolKeys": [');
      console.log('      {');
      console.log('        "currency0": "0xToken0",');
      console.log('        "currency1": "0xToken1",');
      console.log('        "fee": 3000,');
      console.log('        "tickSpacing": 60,');
      console.log('        "hooks": "0x0000000000000000000000000000000000000000"');
      console.log('      }');
      console.log('    ]');
      console.log('  }');
      return;
    }
  }

  // Get signer (defaults to first account)
  const [signer] = await ethers.getSigners();
  console.log(`Using signer: ${signer.address}\n`);

  // Verify signer is the owner
  const cakeFactory = await ethers.getContractAt(
    "CakeFactory",
    config.cakeFactoryAddress,
    signer
  );

  const owner = await cakeFactory.owner();
  if (signer.address.toLowerCase() !== owner.toLowerCase()) {
    throw new Error(
      `Signer ${signer.address} is not the owner. Owner is ${owner}. Only the owner can add pool keys.`
    );
  }

  console.log(`CakeFactory address: ${config.cakeFactoryAddress}`);
  console.log(`Owner: ${owner}`);
  console.log(`Number of pool keys to add: ${config.poolKeys.length}\n`);

  // Add each pool key
  for (let i = 0; i < config.poolKeys.length; i++) {
    console.log(`[${i + 1}/${config.poolKeys.length}]`);
    try {
      await addPoolKey(cakeFactory, config.poolKeys[i], signer);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`  ✗ Failed to add pool key: ${errorMessage}`);
      if (error && typeof error === "object" && "reason" in error) {
        console.error(`  Reason: ${String(error.reason)}`);
      }
      if (error && typeof error === "object" && "data" in error) {
        console.error(`  Error data: ${String(error.data)}`);
      }
      console.log();
      throw error; // Re-throw to stop execution on error
    }
  }

  console.log("✓ All pool keys added successfully!");
}

// Execute main function
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

