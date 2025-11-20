import { ethers } from "hardhat";
import { writeFileSync } from "node:fs";
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
 * Main function
 */
async function main() {
  console.log("=== Deploy Tokens Script ===\n");
  
  // Get signer
  const [signer] = await ethers.getSigners();
  const signerAddress = await signer.getAddress();
  console.log(`Using signer: ${signerAddress}`);
  
  // Check network
  const network = await ethers.provider.getNetwork();
  console.log(`Network: ${network.name} (Chain ID: ${network.chainId})`);
  
  // Deploy tokens
  const { tokenA, tokenB } = await deployTokens(signer);
  
  // Save to file
  const networkName = network.name || `chain-${network.chainId}`;
  const tokenAAddress = await tokenA.getAddress();
  const tokenBAddress = await tokenB.getAddress();
  
  const tokenData: TokenDeploymentData = {
    network: networkName,
    chainId: network.chainId,
    tokenA: {
      address: tokenAAddress,
      name: "TokenA",
      symbol: "TKA",
    },
    tokenB: {
      address: tokenBAddress,
      name: "TokenB",
      symbol: "TKB",
    },
    deployer: signerAddress,
    deployedAt: new Date().toISOString(),
  };
  
  // Convert BigInt to string for JSON serialization
  const tokenDataSerializable = {
    ...tokenData,
    chainId: network.chainId.toString(),
  };

  const filePath = join(__dirname, "tokens.json");
  writeFileSync(filePath, JSON.stringify(tokenDataSerializable, null, 2), "utf8");
  console.log(`\n✓ Token deployment data saved to: ${filePath}`);
  
  console.log("\n=== Summary ===");
  console.log(`TokenA: ${tokenAAddress}`);
  console.log(`TokenB: ${tokenBAddress}`);
  console.log(`Network: ${networkName} (Chain ID: ${network.chainId})`);
  console.log("\nNext step: Run 'npm run create:pool' to create the pool with these tokens");
}

// Execute main function
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

