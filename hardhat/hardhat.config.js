require("dotenv").config();
require("@nomicfoundation/hardhat-toolbox");
require("@nomicfoundation/hardhat-ignition");

const {
  SEPOLIA_RPC_URL,
  SEPOLIA_PRIVATE_KEY,
  BASE_SEPOLIA_RPC_URL,
  BASE_SEPOLIA_PRIVATE_KEY,
  ETHERSCAN_API_KEY,
  BASESCAN_API_KEY,
} = process.env;

const withAccounts = (privateKey) =>
  privateKey && privateKey.trim() !== "" ? [privateKey] : [];

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
    sepolia: {
      url: SEPOLIA_RPC_URL || "https://sepolia.drpc.org",
      chainId: 11155111,
      accounts: withAccounts(SEPOLIA_PRIVATE_KEY),
    },
    baseSepolia: {
      url: BASE_SEPOLIA_RPC_URL || "https://sepolia.base.org",
      chainId: 84532,
      accounts: withAccounts(BASE_SEPOLIA_PRIVATE_KEY),
    },
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
  etherscan: {
    apiKey: {
      sepolia: ETHERSCAN_API_KEY || "",
      baseSepolia: BASESCAN_API_KEY || "",
    },
    customChains: [
      {
        network: "baseSepolia",
        chainId: 84532,
        urls: {
          apiURL: "https://api-sepolia.basescan.org/api",
          browserURL: "https://sepolia.basescan.org",
        },
      },
    ],
  },
  ignition: {
    blockPollingInterval: 1000,
    timeBeforeBumpingFees: 30000,
    maxFeeBumps: 1,
    requiredConfirmations: 1,
  },
};

