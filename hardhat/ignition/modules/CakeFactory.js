const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

/**
 * CakeFactory Deployment Module
 * 
 * This module deploys the CakeFactory contract which manages groups of people (cakes)
 * and their shared cake ingredients for bill splitting functionality.
 * 
 * The contract constructor requires three addresses:
 *   - router: UniversalRouter address
 *   - poolManager: PoolManager address
 *   - permit2: Permit2 address
 * 
 * Addresses are network-specific and sourced from:
 *   https://docs.uniswap.org/contracts/v4/deployments
 * 
 * Usage:
 *   npx hardhat ignition deploy ignition/modules/CakeFactory.js --network <network>
 * 
 * Networks configured in hardhat.config.js:
 *   - localhost: Local development network (uses mock addresses)
 *   - sepolia: Ethereum Sepolia testnet
 *   - baseSepolia: Base Sepolia testnet
 */

// Uniswap v4 deployment addresses by network
// Source: https://docs.uniswap.org/contracts/v4/deployments
// 
// NOTE: Always verify addresses from the official Uniswap documentation before deploying.
// PoolManager uses CREATE2 deployment, so the address is the same across all networks.
// UniversalRouter and Permit2 addresses may vary by network.
const UNISWAP_V4_ADDRESSES = {
  // Ethereum Mainnet
  mainnet: {
    universalRouter: "0x66a9893cc07d91d95644aedd05d03f95e1dba8af", // UniversalRouterV2
    poolManager: "0x000000000004444c5dc75cB358380D2e3dE08A90",
    permit2: "0x000000000022D473030F116dDEE9F6B43aC78BA3", // Same across all networks
  },
  // Ethereum Sepolia Testnet
  sepolia: {
    universalRouter: "0x3A9D48AB9751398BbFa63ad67599Bb04e4BdF98b", // UniversalRouterV2
    poolManager: "0xE03A1074c86CFeDd5C142C4F04F1a1536e203543", // CREATE2 deployment - same across all networks
    permit2: "0x000000000022D473030F116dDEE9F6B43aC78BA3",
  },
  // Base Sepolia Testnet
  baseSepolia: {
    universalRouter: "0x492e6456d9528771018deb9e87ef7750ef184104", // UniversalRouterV2
    poolManager: "0x05E73354cFDd6745C338b50BcFDfA3Aa6fA03408", // CREATE2 deployment - same across all networks
    permit2: "0x000000000022D473030F116dDEE9F6B43aC78BA3",
  },
  // Localhost/Hardhat (mock addresses for development)
  localhost: {
    universalRouter: "0x0000000000000000000000000000000000000001", // Mock address
    poolManager: "0x0000000000000000000000000000000000000002", // Mock address
    permit2: "0x0000000000000000000000000000000000000003", // Mock address
  },
  hardhat: {
    universalRouter: "0x0000000000000000000000000000000000000001", // Mock address
    poolManager: "0x0000000000000000000000000000000000000002", // Mock address
    permit2: "0x0000000000000000000000000000000000000003", // Mock address
  },
};

module.exports = buildModule("CakeFactoryModule", (m) => {
  // Get network name from Hardhat Runtime Environment
  // The network name is available through the module's context
  const networkName = process.env.HARDHAT_NETWORK || "localhost";
  
  // Get addresses for the current network, default to localhost if not found
  const addresses = UNISWAP_V4_ADDRESSES[networkName] || UNISWAP_V4_ADDRESSES.localhost;
  
  console.log(`Deploying CakeFactory on network: ${networkName}`);
  console.log(`Using addresses:`);
  console.log(`  UniversalRouter: ${addresses.universalRouter}`);
  console.log(`  PoolManager: ${addresses.poolManager}`);
  console.log(`  Permit2: ${addresses.permit2}`);
  
  // Deploy CakeFactory contract with network-specific Uniswap v4 addresses
  const cakeFactory = m.contract("CakeFactory", [
    addresses.universalRouter, // router
    addresses.poolManager,      // poolManager
    addresses.permit2,          // permit2
  ]);

  return { cakeFactory };
});

