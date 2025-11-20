import { ethers } from "hardhat";
import { readFileSync } from "node:fs";
import { join } from "node:path";

async function main() {
  console.log("=== Testing Pool Initialization ===\n");
  
  const [signer] = await ethers.getSigners();
  console.log(`Signer: ${signer.address}`);
  
  // Read tokens
  const tokenData = JSON.parse(readFileSync(join(__dirname, "tokens.json"), "utf8"));
  console.log(`TokenA: ${tokenData.tokenA.address}`);
  console.log(`TokenB: ${tokenData.tokenB.address}`);
  
  const poolManagerAddress = "0x05E73354cFDd6745C338b50BcFDfA3Aa6fA03408";
  
  // Sort tokens
  const token0 = tokenData.tokenA.address.toLowerCase() < tokenData.tokenB.address.toLowerCase() 
    ? tokenData.tokenA.address 
    : tokenData.tokenB.address;
  const token1 = tokenData.tokenA.address.toLowerCase() < tokenData.tokenB.address.toLowerCase() 
    ? tokenData.tokenB.address 
    : tokenData.tokenA.address;
  
  console.log(`\nSorted - Token0: ${token0}`);
  console.log(`Sorted - Token1: ${token1}`);
  
  const sqrtPriceX96 = 2n ** 96n;
  
  // Test initialize call
  console.log("\n=== Testing initialize call ===");
  
  const iface = new ethers.Interface([
    "function initialize((address,address,uint24,int24,address),uint160,bytes) external returns (int24)"
  ]);
  
  const data = iface.encodeFunctionData("initialize", [
    [token0, token1, 3000, 60, ethers.ZeroAddress],
    sqrtPriceX96,
    "0x"
  ]);
  
  console.log(`Function selector: ${data.slice(0, 10)}`);
  console.log(`Data length: ${data.length} characters`);
  
  try {
    const result = await ethers.provider.call({
      to: poolManagerAddress,
      data,
      from: signer.address
    });
    console.log("\n✓ Success! Result:", result);
    const decoded = iface.decodeFunctionResult("initialize", result);
    console.log("Initial tick:", decoded[0].toString());
  } catch (error: unknown) {
    console.log("\n✗ Call failed");
    
    if (error && typeof error === "object") {
      const err = error as any;
      console.log("Error:", err.message);
      
      if (err.data) {
        console.log("Error data:", err.data);
        
        // Try to decode error
        if (typeof err.data === "string" && err.data.startsWith("0x")) {
          const errorSelector = err.data.slice(0, 10);
          console.log("Error selector:", errorSelector);
          
          const knownErrors: Record<string, string> = {
            "0x82b42900": "PoolAlreadyInitialized()",
            "0x4e487b71": "Panic(uint256)",
            "0x08c379a0": "Error(string)",
            "0x": "Generic revert"
          };
          
          if (errorSelector in knownErrors) {
            console.log("Decoded error:", knownErrors[errorSelector]);
          }
        }
      }
      
      if (err.code) {
        console.log("Error code:", err.code);
      }
    }
    
    throw error;
  }
}

main().catch((error) => {
  console.error("\nTest failed:", error.message);
  process.exit(1);
});

