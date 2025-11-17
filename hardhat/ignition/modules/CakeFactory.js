const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

module.exports = buildModule("CakeFactoryModule", (m) => {
  // Deploy CakeFactory contract
  const cakeFactory = m.contract("CakeFactory");

  return { cakeFactory };
});

