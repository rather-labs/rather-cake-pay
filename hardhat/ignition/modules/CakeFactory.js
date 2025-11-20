const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

/**
 * CakeFactory Deployment Module
 * 
 * This module deploys the CakeFactory contract which manages groups of people (cakes)
 * and their shared cake ingredients for bill splitting functionality.
 * 
 * The contract constructor takes no parameters, so deployment is straightforward.
 * 
 * Usage:
 *   npx hardhat ignition deploy ignition/modules/CakeFactory.js --network <network>
 * 
 * Networks configured in hardhat.config.js:
 *   - localhost: Local development network
 *   - sepolia: Ethereum Sepolia testnet
 *   - baseSepolia: Base Sepolia testnet
 */
module.exports = buildModule("CakeFactoryModule", (m) => {
  // Deploy CakeFactory contract
  // The contract has no constructor parameters, so no arguments are needed
  const cakeFactory = m.contract("CakeFactory");

  return { cakeFactory };
});

