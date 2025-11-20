import { ethers } from "hardhat";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Contract } from "ethers";

async function main() {
  console.log("=== Add Liquidity Script ===\n");

  // 1. Load Pool Key
  const poolKeyPath = join(__dirname, "PoolKeyCreated.json");
  let poolKeyData;
  try {
    const data = readFileSync(poolKeyPath, "utf8");
    poolKeyData = JSON.parse(data);
  } catch (error) {
    console.error("Could not load PoolKeyCreated.json. Run createPool.ts first.");
    process.exit(1);
  }

  console.log(`Network: ${poolKeyData.network}`);
  console.log(`Token A: ${poolKeyData.tokenA}`);
  console.log(`Token B: ${poolKeyData.tokenB}`);
  console.log(`Fee: ${poolKeyData.poolKey.fee}`);

  // 2. Get Signer
  const [signer] = await ethers.getSigners();
  console.log(`Using signer: ${await signer.getAddress()}`);

  // 3. Configuration
  // For Base Sepolia, we need the Position Manager address
  // Address from https://docs.uniswap.org/contracts/v4/deployments#sepolia-11155111 for Base Sepolia (84532)
  // Note: Ensure the address is checksummed correctly.
  const POSITION_MANAGER_ADDRESS = "0x4b2c77d209d3405f41a037ec6c77f7f5b8e2ca80";
  
  // Validate and checksum address
  let checksummedPositionManagerAddress: string;
  try {
      checksummedPositionManagerAddress = ethers.getAddress(POSITION_MANAGER_ADDRESS);
      console.log(`Position Manager Address (Checksummed): ${checksummedPositionManagerAddress}`);
  } catch (error) {
      console.error(`Invalid Position Manager Address: ${POSITION_MANAGER_ADDRESS}`);
      process.exit(1);
  }

  if (checksummedPositionManagerAddress === ethers.ZeroAddress) {
      console.warn("\n⚠ WARNING: POSITION_MANAGER_ADDRESS is not set.");
      process.exit(1);
  }

  // 4. Approve Tokens
  const tokenA = await ethers.getContractAt("IERC20", poolKeyData.tokenA, signer);
  const tokenB = await ethers.getContractAt("IERC20", poolKeyData.tokenB, signer);

  const amountToAdd = ethers.parseEther("10"); // Example amount

  console.log(`\nApproving PositionManager (${checksummedPositionManagerAddress}) to spend tokens...`);
  await (await tokenA.approve(checksummedPositionManagerAddress, amountToAdd)).wait();
  await (await tokenB.approve(checksummedPositionManagerAddress, amountToAdd)).wait();
  console.log("✓ Approved");

  // 5. Mint Position
  const positionManager = await ethers.getContractAt(
      [
          "function mint((address currency0, address currency1, uint24 fee, int24 tickSpacing, address hooks), int24 tickLower, int24 tickUpper, uint256 liquidity, uint256 amount0Max, uint256 amount1Max, address owner, bytes hookData) external payable returns (uint256 tokenId, uint128 liquidity, uint256 amount0, uint256 amount1)"
      ],
      checksummedPositionManagerAddress,
      signer
  );

  const poolKey = {
      currency0: poolKeyData.poolKey.currency0,
      currency1: poolKeyData.poolKey.currency1,
      fee: poolKeyData.poolKey.fee,
      tickSpacing: poolKeyData.poolKey.tickSpacing,
      hooks: poolKeyData.poolKey.hooks
  };

  // Define range (full range for simplicity or specific ticks)
  const tickLower = -887220; // Min tick for tickSpacing 60 (must be divisible by 60)
  const tickUpper = 887220;  // Max tick for tickSpacing 60

  console.log("\nMinting position...");
  try {
      const tx = await positionManager.mint(
          poolKey,
          tickLower,
          tickUpper,
          ethers.parseEther("10"), // Liquidity amount (example)
          amountToAdd, // Max amount0
          amountToAdd, // Max amount1
          await signer.getAddress(),
          "0x" // hookData
      );
      
      console.log("Transaction hash:", tx.hash);
      await tx.wait();
      console.log("✓ Liquidity added!");
  } catch (error) {
      console.error("Failed to add liquidity:", error);
      
      // Try to decode error
      if (error && typeof error === 'object' && 'data' in error && error.data) {
           const errorData = String(error.data);
           console.log("Error data:", errorData);
           // Common errors:
           // 0x645f037a: PoolNotInitialized
      }

      console.log("\nIf this failed, it might be due to:");
      console.log("1. Incorrect PositionManager address");
      console.log("2. Incorrect function signature (check v4-periphery version)");
      console.log("3. Pool not initialized");
  }
}

main().catch(console.error);
