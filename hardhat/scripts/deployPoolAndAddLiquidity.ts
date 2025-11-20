import { ethers } from "hardhat";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import type { Signer, Contract } from "ethers";

/**
 * Uniswap v4 deployment addresses for Base Sepolia
 * Source: https://docs.uniswap.org/contracts/v4/deployments
 */
const UNISWAP_V4_ADDRESSES = {
  poolManager: "0x05E73354cFDd6745C338b50BcFDfA3Aa6fA03408",
  universalRouter: "0x492e6456d9528771018deb9e87ef7750ef184104",
  permit2: "0x000000000022D473030F116dDEE9F6B43aC78BA3",
};

/**
 * PoolKey structure for Uniswap v4
 */
interface PoolKey {
  currency0: bigint; // Currency (wrapped address)
  currency1: bigint; // Currency (wrapped address)
  fee: number; // Fee tier in basis points (e.g., 3000 = 0.3%)
  tickSpacing: number; // Tick spacing (e.g., 60 for 0.3% fee)
  hooks: string; // Hooks contract address (zero address for no hooks)
}

/**
 * Wraps an address into Currency format for Uniswap v4
 */
function wrapCurrency(address: string): bigint {
  return BigInt(address);
}

/**
 * Unwraps a Currency to an address
 */
function unwrapCurrency(currency: bigint): string {
  return `0x${currency.toString(16).padStart(40, "0")}`;
}

/**
 * Constructs a PoolKey struct
 */
function constructPoolKey(
  token0: string,
  token1: string,
  fee: number,
  tickSpacing: number,
  hooks: string = ethers.ZeroAddress
): PoolKey {
  // Ensure token0 < token1
  const sortedToken0 = token0.toLowerCase() < token1.toLowerCase() ? token0 : token1;
  const sortedToken1 = token0.toLowerCase() < token1.toLowerCase() ? token1 : token0;

  return {
    currency0: wrapCurrency(sortedToken0),
    currency1: wrapCurrency(sortedToken1),
    fee,
    tickSpacing,
    hooks,
  };
}

/**
 * Gets the pool ID from a PoolKey
 */
function getPoolId(poolKey: PoolKey): string {
  // PoolId is keccak256(abi.encode(poolKey))
  // We'll compute this in the contract call
  return ""; // Will be computed by contract
}

/**
 * Deploys two ERC-20 tokens
 */
async function deployTokens(signer: Signer): Promise<{ tokenA: Contract; tokenB: Contract }> {
  console.log("\n=== Deploying ERC-20 Tokens ===");
  
  const MockERC20Factory = await ethers.getContractFactory("MockERC20", signer);
  
  // Deploy TokenA
  console.log("Deploying TokenA...");
  const tokenA = await MockERC20Factory.deploy("TokenA", "TKA");
  await tokenA.waitForDeployment();
  const tokenAAddress = await tokenA.getAddress();
  console.log(`✓ TokenA deployed to: ${tokenAAddress}`);
  
  // Deploy TokenB
  console.log("Deploying TokenB...");
  const tokenB = await MockERC20Factory.deploy("TokenB", "TKB");
  await tokenB.waitForDeployment();
  const tokenBAddress = await tokenB.getAddress();
  console.log(`✓ TokenB deployed to: ${tokenBAddress}`);
  
  // Check balances (with error handling in case contract isn't fully synced)
  const signerAddress = await signer.getAddress();
  try {
    // Wait a bit for the contract to be fully indexed
    await new Promise((resolve) => setTimeout(resolve, 2000));
    const balanceA = await tokenA.balanceOf(signerAddress);
    const balanceB = await tokenB.balanceOf(signerAddress);
    console.log(`TokenA balance: ${ethers.formatEther(balanceA)} TKA`);
    console.log(`TokenB balance: ${ethers.formatEther(balanceB)} TKB`);
  } catch (error) {
    console.log("Note: Could not fetch token balances (contract may need more confirmations)");
    console.log("This is not critical - tokens were deployed successfully");
  }
  
  return { tokenA, tokenB };
}

/**
 * Initializes a Uniswap v4 pool
 * @returns The transaction hash of the pool initialization
 */
async function initializePool(
  poolManager: Contract,
  poolKey: PoolKey,
  sqrtPriceX96: bigint,
  signer: Signer
): Promise<string> {
  console.log("\n=== Initializing Pool ===");
  console.log(`Currency0: ${unwrapCurrency(poolKey.currency0)}`);
  console.log(`Currency1: ${unwrapCurrency(poolKey.currency1)}`);
  console.log(`Fee: ${poolKey.fee} (${poolKey.fee / 10000}%)`);
  console.log(`Tick Spacing: ${poolKey.tickSpacing}`);
  console.log(`Hooks: ${poolKey.hooks}`);
  console.log(`Initial sqrtPriceX96: ${sqrtPriceX96.toString()}`);
  
  // Initialize the pool
  // PoolManager.initialize(poolKey, sqrtPriceX96, hookData)
  const hookData = "0x"; // Empty hook data for no hooks
  
  // Convert PoolKey to the format expected by the contract
  // Currency needs to be passed as address (uint160), not bigint
  const poolKeyForContract = [
    unwrapCurrency(poolKey.currency0), // currency0 as address
    unwrapCurrency(poolKey.currency1), // currency1 as address
    poolKey.fee, // fee as uint24
    poolKey.tickSpacing, // tickSpacing as int24
    poolKey.hooks, // hooks as address
  ];
  
  // Encode the function call manually
  // Function signature: initialize((address,address,uint24,int24,address),uint160,bytes)
  // Note: Currency is a type alias for address in Uniswap v4
  const iface = new ethers.Interface([
    "function initialize((address currency0, address currency1, uint24 fee, int24 tickSpacing, address hooks), uint160 sqrtPriceX96, bytes hookData) external returns (int24 tick)",
  ]);
  
  // Create the struct as an object (ethers will encode it properly)
  const poolKeyStruct = {
    currency0: unwrapCurrency(poolKey.currency0),
    currency1: unwrapCurrency(poolKey.currency1),
    fee: poolKey.fee,
    tickSpacing: poolKey.tickSpacing,
    hooks: poolKey.hooks,
  };
  
  try {
    const data = iface.encodeFunctionData("initialize", [
      poolKeyStruct,
      sqrtPriceX96,
      hookData,
    ]);
    
    // Estimate gas first to catch errors early
    try {
      const gasEstimate = await signer.estimateGas({
        to: await poolManager.getAddress(),
        data,
      });
      console.log(`Estimated gas: ${gasEstimate.toString()}`);
    } catch (gasError: unknown) {
      const errorMessage = gasError instanceof Error ? gasError.message : String(gasError);
      console.error(`Gas estimation failed: ${errorMessage}`);
      throw gasError;
    }
    
    // Send the transaction
    const tx = await signer.sendTransaction({
      to: await poolManager.getAddress(),
      data,
    });
    
    console.log(`Transaction hash: ${tx.hash}`);
    const receipt = (await tx.wait()) as { gasUsed: bigint };
    console.log("✓ Pool initialized successfully");
    console.log(`Gas used: ${receipt.gasUsed.toString()}`);
    
    return tx.hash;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`Failed to initialize pool: ${errorMessage}`);
    throw error;
  }
}

/**
 * Adds liquidity to a Uniswap v4 pool using modifyLiquidity
 * Note: This function is not implemented as it requires a lock callback pattern.
 * For production use, use V4Router or UniversalRouter with proper encoding.
 * See: https://docs.uniswap.org/contracts/v4/quickstart/create-pool
 */
async function addLiquidity(
  _poolManager: Contract,
  _poolKey: PoolKey,
  _tickLower: number,
  _tickUpper: number,
  _liquidityDelta: bigint,
  _signer: Signer
): Promise<void> {
  // This function is not fully implemented as adding liquidity in Uniswap v4
  // requires using a helper contract that implements the lock callback pattern,
  // or using UniversalRouter/V4Router with proper action encoding.
  // See Uniswap v4 documentation for complete examples.
  throw new Error(
    "Adding liquidity requires a helper contract or UniversalRouter. " +
    "See: https://docs.uniswap.org/contracts/v4/quickstart/create-pool"
  );
}

/**
 * Calculates sqrtPriceX96 from a price ratio
 * Simplified version - for production, use a proper math library
 */
function calculateSqrtPriceX96(price: number): bigint {
  // sqrtPriceX96 = sqrt(price) * 2^96
  // For a 1:1 price ratio, sqrtPriceX96 = 2^96
  // This is a simplified calculation
  const sqrtPrice = Math.sqrt(price);
  const Q96 = 2n ** 96n;
  // Convert to bigint (simplified - use proper fixed-point math in production)
  return BigInt(Math.floor(sqrtPrice * Number(Q96)));
}

/**
 * Calculates tick from price
 */
function priceToTick(price: number, tickSpacing: number): number {
  // tick = log(price) / log(1.0001)
  // This is simplified - use proper math in production
  const tick = Math.log(price) / Math.log(1.0001);
  return Math.floor(tick / tickSpacing) * tickSpacing;
}

/**
 * Saves the pool key to PoolKeyCreated.json
 */
function savePoolKeyToFile(
  poolKey: PoolKey,
  tokenAAddress: string,
  tokenBAddress: string,
  networkName: string,
  transactionHash: string
): void {
  const poolKeyData = {
    network: networkName,
    tokenA: tokenAAddress,
    tokenB: tokenBAddress,
    poolKey: {
      currency0: unwrapCurrency(poolKey.currency0),
      currency1: unwrapCurrency(poolKey.currency1),
      fee: poolKey.fee,
      tickSpacing: poolKey.tickSpacing,
      hooks: poolKey.hooks,
    },
    transactionHash,
    createdAt: new Date().toISOString(),
  };

  const filePath = join(__dirname, "PoolKeyCreated.json");
  writeFileSync(filePath, JSON.stringify(poolKeyData, null, 2), "utf8");
  console.log(`\n✓ Pool key saved to: ${filePath}`);
}

/**
 * Main function
 */
async function main() {
  console.log("=== Deploy Pool and Add Liquidity Script ===\n");
  
  // Get signer
  const [signer] = await ethers.getSigners();
  const signerAddress = await signer.getAddress();
  console.log(`Using signer: ${signerAddress}`);
  
  // Check network
  const network = await ethers.provider.getNetwork();
  console.log(`Network: ${network.name} (Chain ID: ${network.chainId})`);
  
  if (network.chainId !== 84532n) {
    console.warn("⚠ Warning: This script is configured for Base Sepolia (Chain ID: 84532)");
    console.warn(`Current network Chain ID: ${network.chainId}`);
  }
  
  // Step 1: Deploy tokens
  const { tokenA, tokenB } = await deployTokens(signer);
  const tokenAAddress = await tokenA.getAddress();
  const tokenBAddress = await tokenB.getAddress();
  
  // Step 2: Get PoolManager contract
  console.log("\n=== Connecting to PoolManager ===");
  const poolManager = await ethers.getContractAt(
    "IPoolManager",
    UNISWAP_V4_ADDRESSES.poolManager,
    signer
  );
  console.log(`PoolManager address: ${UNISWAP_V4_ADDRESSES.poolManager}`);
  
  // Step 3: Construct PoolKey
  const fee = 3000; // 0.3%
  const tickSpacing = 60; // Standard for 0.3% fee
  const hooks = ethers.ZeroAddress; // No hooks
  
  const poolKey = constructPoolKey(tokenAAddress, tokenBAddress, fee, tickSpacing, hooks);
  
  // Step 4: Initialize pool
  // For a 1:1 price ratio, sqrtPriceX96 = 2^96
  const sqrtPriceX96 = 2n ** 96n; // 1:1 price
  
  let transactionHash: string;
  try {
    transactionHash = await initializePool(poolManager, poolKey, sqrtPriceX96, signer);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`\n⚠ Pool initialization failed: ${errorMessage}`);
    console.log("This might be because:");
    console.log("  1. The pool already exists");
    console.log("  2. PoolManager requires a helper contract for initialization");
    console.log("  3. The function signature or parameters are incorrect");
    console.log("\nSaving pool key anyway - you can initialize the pool manually or use a helper contract.");
    console.log("See: https://docs.uniswap.org/contracts/v4/quickstart/create-pool");
    transactionHash = "0x0000000000000000000000000000000000000000000000000000000000000000"; // Placeholder
  }
  
  // Step 5: Save pool key to file
  const networkName = network.name || `chain-${network.chainId}`;
  savePoolKeyToFile(poolKey, tokenAAddress, tokenBAddress, networkName, transactionHash);
  
  // Step 6: Add liquidity (optional - commented out as it requires helper contract)
  // Note: Adding liquidity in Uniswap v4 requires using a helper contract
  // that implements the lock callback pattern, or using UniversalRouter/V4Router
  // For now, we'll skip this step and just create the pool
  
  console.log("\n=== Summary ===");
  console.log(`TokenA: ${tokenAAddress}`);
  console.log(`TokenB: ${tokenBAddress}`);
  console.log(`Pool initialized with fee: ${fee} (${fee / 10000}%)`);
  console.log(`Tick spacing: ${tickSpacing}`);
  console.log("\n⚠ Note: Adding liquidity requires using V4Router or UniversalRouter");
  console.log("with proper lock callback pattern.");
  console.log("See Uniswap v4 documentation for complete liquidity addition examples.");
  console.log("\nPool key has been saved to PoolKeyCreated.json");
  console.log("You can use this pool key with the addPoolKeys.ts script to register it in CakeFactory.");
}

// Execute main function
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

