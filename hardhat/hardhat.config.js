require("@nomicfoundation/hardhat-toolbox");
require("@nomicfoundation/hardhat-ignition");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    hardhat: {
      chainId: 1337,
    },
  localhost: {
    url: "http://127.0.0.1:8545", // URL of the standalone Hardhat node
  },    
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
  ignition: {
    blockPollingInterval: 1000,
    timeBeforeBumpingFees: 30000,
    maxFeeBumps: 1,
    requiredConfirmations: 1,
  },
};

