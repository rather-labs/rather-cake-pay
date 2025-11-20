import { ethers } from "hardhat";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { Signer, Contract } from "ethers";

/**
 * Token deployment data structure
 */
interface TokenDeploymentData {
  network: string;
  chainId: bigint;
  tokenA: {
    address: string;
    name: string;
    symbol: string;
  };
  tokenB: {
    address: string;
    name: string;
    symbol: string;
  };
  deployer: string;
  deployedAt: string;
}

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
 * Pool creation data structure
 */
interface PoolCreationData {
  network: string;
  chainId: bigint;
  tokenA: string;
  tokenB: string;
  poolKey: {
    currency0: string;
    currency1: string;
    fee: number;
    tickSpacing: number;
    hooks: string;
  };
  transactionHash: string;
  createdAt: string;
}

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
 * Loads token deployment data from tokens.json
 */
function loadTokensFromFile(): TokenDeploymentData {
  const filePath = join(__dirname, "tokens.json");
  
  try {
    const fileContent = readFileSync(filePath, "utf8");
    const tokenData: TokenDeploymentData = JSON.parse(fileContent);
    
    // Convert chainId from string to bigint if needed
    if (typeof tokenData.chainId === "string") {
      tokenData.chainId = BigInt(tokenData.chainId);
    }
    
    return tokenData;
  } catch (error) {
    throw new Error(
      `Failed to load tokens.json. Please run 'npm run deploy:tokens' first.\n` +
      `Error: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Initializes a Uniswap v4 pool
 * Based on: https://docs.uniswap.org/contracts/v4/quickstart/create-pool
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
  
  // According to Uniswap v4 docs: IPoolManager(manager).initialize(pool, startingPrice)
  // The function signature is: initialize(PoolKey memory, uint160 sqrtPriceX96)
  // Currency is a type alias for address (uint160)
  
  // Create the PoolKey struct for the contract call
  // Currency needs to be passed as address (uint160), not bigint
  const poolKeyStruct = {
    currency0: unwrapCurrency(poolKey.currency0), // address (Currency type)
    currency1: unwrapCurrency(poolKey.currency1), // address (Currency type)
    fee: poolKey.fee, // uint24
    tickSpacing: poolKey.tickSpacing, // int24
    hooks: poolKey.hooks, // address
  };
  
  // Empty hook data for no hooks (not needed for this version of v4-core)
  // const hookData = "0x";
  
  // According to Uniswap v4 docs, we call: IPoolManager(manager).initialize(pool, startingPrice)
  // The full signature is: initialize(PoolKey memory, uint160 sqrtPriceX96)
  // Let's try calling it directly using the contract
  
  const poolManagerAddress = await poolManager.getAddress();
  
  // Create interface for initialize function
  const iface = new ethers.Interface([
    "function initialize((address currency0, address currency1, uint24 fee, int24 tickSpacing, address hooks), uint160 sqrtPriceX96) external returns (int24 tick)",
  ]);
  
  // Encode the function call
  // Try encoding the struct as a tuple array
  const poolKeyTuple = [
    poolKeyStruct.currency0,
    poolKeyStruct.currency1,
    poolKeyStruct.fee,
    poolKeyStruct.tickSpacing,
    poolKeyStruct.hooks,
  ] as const;
  
  const data = iface.encodeFunctionData("initialize", [
    poolKeyTuple,
    sqrtPriceX96,
  ]);
  
  console.log("Calling PoolManager.initialize...");
  console.log(`PoolManager: ${poolManagerAddress}`);
  
  // Verify parameters
  console.log("\nVerifying parameters:");
  console.log(`  Currency0 < Currency1: ${poolKeyStruct.currency0.toLowerCase() < poolKeyStruct.currency1.toLowerCase()}`);
  console.log(`  Fee: ${poolKeyStruct.fee} (should be > 0)`);
  console.log(`  Tick Spacing: ${poolKeyStruct.tickSpacing} (should match fee tier)`);
  console.log(`  sqrtPriceX96: ${sqrtPriceX96.toString()} (should be > 0)`);
  
  // Check if pool might already exist by trying to read slot0
  /* 
  try {
    const slot0Iface = new ethers.Interface([
      "function getSlot0(bytes32 id) external view returns (uint160 sqrtPriceX96, int24 tick, uint24 protocolFee, uint24 lpFee)",
    ]);
    
    // Calculate pool ID
    const poolIdData = ethers.AbiCoder.defaultAbiCoder().encode(
      ["tuple(address,address,uint24,int24,address)"],
      [[poolKeyStruct.currency0, poolKeyStruct.currency1, poolKeyStruct.fee, poolKeyStruct.tickSpacing, poolKeyStruct.hooks]]
    );
    const poolId = ethers.keccak256(poolIdData);
    
    const slot0Data = slot0Iface.encodeFunctionData("getSlot0", [poolId]);
    const slot0Result = await ethers.provider.call({
      to: poolManagerAddress,
      data: slot0Data,
    });
    
    const decodedSlot0 = slot0Iface.decodeFunctionResult("getSlot0", slot0Result);
    if (decodedSlot0[0] !== 0n) {
      console.log(`\n⚠ Pool already exists!`);
      console.log(`  Current sqrtPriceX96: ${decodedSlot0[0].toString()}`);
      console.log(`  Current tick: ${decodedSlot0[1].toString()}`);
      console.log("  Pool is already initialized, skipping...");
      return "0x0000000000000000000000000000000000000000000000000000000000000000";
    } else {
      console.log("✓ Pool does not exist, proceeding with initialization");
    }
  } catch (checkError) {
    console.log("Note: Could not check pool existence, proceeding anyway");
  }
  */
  
  try {
    // Try calling initialize directly on the contract
    console.log("\nAttempting direct contract call...");
    try {
      // The contract object might still have the old interface if it was created with it
      // So we cast to any and call it, but ensuring we pass only 2 args
      const tx = await (poolManager as any).initialize(
        poolKeyStruct,
        sqrtPriceX96
      );
      
      console.log(`✓ Transaction hash: ${tx.hash}`);
      console.log("Waiting for confirmation...");
      const receipt = (await tx.wait()) as { gasUsed: bigint; status: number };
      
      if (receipt.status === 1) {
        console.log("✓ Pool initialized successfully");
        console.log(`Gas used: ${receipt.gasUsed.toString()}`);
        return tx.hash;
      } else {
        throw new Error("Transaction failed");
      }
    } catch (directError: unknown) {
      console.log("Direct call failed, trying manual encoding...");
      
      // Fall back to manual encoding
      // Estimate gas first
      console.log("Estimating gas...");
      const gasEstimate = await signer.estimateGas({
        to: poolManagerAddress,
        data,
      });
      console.log(`✓ Estimated gas: ${gasEstimate.toString()}`);
      
      // Send the transaction
      console.log("Sending transaction...");
      const tx = await signer.sendTransaction({
        to: poolManagerAddress,
        data,
        gasLimit: gasEstimate + (gasEstimate / 10n), // Add 10% buffer
      });
      
      console.log(`✓ Transaction hash: ${tx.hash}`);
      console.log("Waiting for confirmation...");
      const receipt = (await tx.wait()) as { gasUsed: bigint; status: number };
      
      if (receipt.status === 1) {
        console.log("✓ Pool initialized successfully");
        console.log(`Gas used: ${receipt.gasUsed.toString()}`);
        return tx.hash;
      } else {
        throw new Error("Transaction failed");
      }
    }
  } catch (error: unknown) {
    // Try to extract more information from the error
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    // Check if it's a provider error with data
    if (error && typeof error === "object") {
      if ("data" in error && error.data) {
        const errorData = String(error.data);
        console.error(`\nError details:`);
        console.error(`  Data: ${errorData}`);
        
        // Try to decode as a revert reason
        if (errorData.startsWith("0x08c379a0")) {
          // Error(string) selector
          try {
            const decoded = ethers.AbiCoder.defaultAbiCoder().decode(
              ["string"],
              "0x" + errorData.slice(10)
            );
            console.error(`  Revert reason: ${decoded[0]}`);
          } catch {
            // Ignore decode errors
          }
        }
      }
      
      if ("code" in error) {
        console.error(`  Error code: ${String(error.code)}`);
      }
    }
    
    console.error(`\nFailed to initialize pool: ${errorMessage}`);
    throw error;
  }
}

/**
 * Saves the pool key to PoolKeyCreated.json
 */
function savePoolKeyToFile(
  poolKey: PoolKey,
  tokenAAddress: string,
  tokenBAddress: string,
  networkName: string,
  chainId: bigint,
  transactionHash: string
): void {
  const poolKeyData: PoolCreationData = {
    network: networkName,
    chainId,
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

  // Convert BigInt to string for JSON serialization
  const poolKeyDataSerializable = {
    ...poolKeyData,
    chainId: chainId.toString(),
  };

  const filePath = join(__dirname, "PoolKeyCreated.json");
  writeFileSync(filePath, JSON.stringify(poolKeyDataSerializable, null, 2), "utf8");
  console.log(`\n✓ Pool key saved to: ${filePath}`);
}

/**
 * Main function
 */
async function main() {
  console.log("=== Create Pool Script ===\n");
  
  // Load token data from tokens.json
  console.log("Loading token data from tokens.json...");
  const tokenData = loadTokensFromFile();
  console.log(`✓ Loaded tokens from ${tokenData.network} (Chain ID: ${tokenData.chainId})`);
  console.log(`TokenA: ${tokenData.tokenA.address} (${tokenData.tokenA.symbol})`);
  console.log(`TokenB: ${tokenData.tokenB.address} (${tokenData.tokenB.symbol})`);
  
  // Get signer
  const [signer] = await ethers.getSigners();
  const signerAddress = await signer.getAddress();
  console.log(`Using signer: ${signerAddress}`);
  
  // Check network matches
  const network = await ethers.provider.getNetwork();
  console.log(`Current network: ${network.name} (Chain ID: ${network.chainId})`);
  
  if (network.chainId !== tokenData.chainId) {
    console.warn(
      `⚠ Warning: Network chain ID mismatch!\n` +
      `  tokens.json chain ID: ${tokenData.chainId}\n` +
      `  Current network chain ID: ${network.chainId}\n` +
      `  Make sure you're on the correct network.`
    );
  }
  
  // Step 1: Get PoolManager contract
  console.log("\n=== Connecting to PoolManager ===");
  
  // Try to get the contract with the full ABI if available
  // Otherwise use the interface name
  let poolManager: Contract;
  try {
    poolManager = await ethers.getContractAt(
      "IPoolManager",
      UNISWAP_V4_ADDRESSES.poolManager,
      signer
    );
  } catch {
    // If IPoolManager interface is not found, create a contract with just the initialize function
    const initializeAbi = [
      "function initialize((address currency0, address currency1, uint24 fee, int24 tickSpacing, address hooks), uint160 sqrtPriceX96) external returns (int24 tick)",
    ];
    poolManager = new ethers.Contract(
      UNISWAP_V4_ADDRESSES.poolManager,
      initializeAbi,
      signer
    );
  }
  
  console.log(`PoolManager address: ${UNISWAP_V4_ADDRESSES.poolManager}`);
  
  // Step 2: Construct PoolKey
  const fee = 3000; // 0.3%
  const tickSpacing = 60; // Standard for 0.3% fee
  const hooks = ethers.ZeroAddress; // No hooks
  
  const poolKey = constructPoolKey(
    tokenData.tokenA.address,
    tokenData.tokenB.address,
    fee,
    tickSpacing,
    hooks
  );
  
  // Step 3: Initialize pool
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
  
  // Step 4: Save pool key to file
  const networkName = network.name || `chain-${network.chainId}`;
  savePoolKeyToFile(
    poolKey,
    tokenData.tokenA.address,
    tokenData.tokenB.address,
    networkName,
    network.chainId,
    transactionHash
  );
  
  console.log("\n=== Summary ===");
  console.log(`TokenA: ${tokenData.tokenA.address}`);
  console.log(`TokenB: ${tokenData.tokenB.address}`);
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

