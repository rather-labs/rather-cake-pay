import { ethers } from "hardhat";
import { readFileSync } from "node:fs";
import { join } from "node:path";

async function main() {
  console.log("=== Check Pool Liquidity Script ===\n");

  // 1. Load Pool Key
  const poolKeyPath = join(__dirname, "PoolKeyCreated.json");
  let poolKeyData;
  
  try {
    const data = readFileSync(poolKeyPath, "utf8");
    poolKeyData = JSON.parse(data);
    console.log("Loaded pool key from PoolKeyCreated.json");
  } catch (error) {
    console.error("Could not load PoolKeyCreated.json. Please ensure the pool has been created.");
    process.exit(1);
  }

  console.log(`Network: ${poolKeyData.network}`);
  console.log(`Token A: ${poolKeyData.tokenA}`);
  console.log(`Token B: ${poolKeyData.tokenB}`);
  
  // 2. Get Signer
  const [signer] = await ethers.getSigners();
  
  // 3. Calculate Pool ID
  const poolKey = {
    currency0: poolKeyData.poolKey.currency0,
    currency1: poolKeyData.poolKey.currency1,
    fee: poolKeyData.poolKey.fee,
    tickSpacing: poolKeyData.poolKey.tickSpacing,
    hooks: poolKeyData.poolKey.hooks
  };
  
  // Encode PoolKey to get PoolId
  const abiCoder = ethers.AbiCoder.defaultAbiCoder();
  const encodedPoolKey = abiCoder.encode(
    ["tuple(address currency0, address currency1, uint24 fee, int24 tickSpacing, address hooks)"],
    [[poolKey.currency0, poolKey.currency1, poolKey.fee, poolKey.tickSpacing, poolKey.hooks]]
  );
  
  const poolId = ethers.keccak256(encodedPoolKey);
  console.log(`\nPool ID: ${poolId}`);

  // 4. Check Pool Liquidity
  // The StateView contract on Base Sepolia is 	0x571291b572ed32ce6751a2cb2486ebee8defb9b4
  // However, if calls are failing, we can try checking the PositionManager balance (NFTs)
  // or just try to execute a swap quote.
  
  // Let's try using the Quoter contract to see if the pool is usable.
  const QUOTER_ADDRESS = "0x4a6513c898fe1b2d0e78d3b0e0a4a151589b1cba";
  console.log(`\nQuoter: ${QUOTER_ADDRESS}`);
  
  const quoter = await ethers.getContractAt(
      [
          "function quoteExactInputSingle((address currency0, address currency1, uint24 fee, int24 tickSpacing, address hooks), bool zeroForOne, uint128 amountIn, bytes hookData) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)"
      ],
      QUOTER_ADDRESS,
      signer
  );
  
  // Try to quote a small swap
  // Swap 1 token0 for token1
  const zeroForOne = true;
  const amountIn = ethers.parseEther("1"); 
  
  console.log("\nAttempting to quote a swap (1 Token0 -> Token1)...");
  try {
      // We need to simulate the call since quote functions are not view in v4 (they revert with result)
      // But the Quoter contract on deployments usually has a view function or we staticCall it.
      const result = await quoter.quoteExactInputSingle.staticCall(
          poolKey,
          zeroForOne,
          amountIn,
          "0x" // hookData
      );
      
      console.log("\n=== Quote Result ===");
      console.log(`Amount Out: ${ethers.formatEther(result[0])} Token1`);
      console.log(`SqrtPriceX96 After: ${result[1].toString()}`);
      console.log("✓ Pool has liquidity and is swappable!");
      
  } catch (error) {
      console.error("\nFailed to quote swap:", error);
      console.log("This likely means the pool has no liquidity or is not initialized.");
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
