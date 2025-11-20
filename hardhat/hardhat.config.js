require("dotenv").config();
require("@nomicfoundation/hardhat-toolbox");
require("@nomicfoundation/hardhat-ignition");
require("hardhat-preprocessor");

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
    compilers: [
      {
        version: "0.8.20",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
          evmVersion: "cancun",
        },
      },
      {
        version: "0.8.24",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
          evmVersion: "cancun",
          viaIR: true,
        },
      },
      {
        version: "0.8.26",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
          evmVersion: "cancun",
          viaIR: true,
        },
      },
    ],
    overrides: {
      "@uniswap/v3-periphery/contracts/libraries/PoolAddress.sol": {
        version: "0.8.20",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    },
  },
  preprocess: {
    eachLine: (hre) => {
      // Track state across lines for multi-line address(uint256(...)) patterns
      const state = { inAddressUint256: false, pendingClose: false };
      return {
        transform: (line) => {
          let transformedLine = line;
          
          // Detect start of address(uint256(...)) pattern
          if (transformedLine.includes("address(") && !transformedLine.includes("uint160")) {
            state.inAddressUint256 = true;
            state.pendingClose = false;
          }
          
          // Transform uint256( to uint160(uint256( when inside address(...)
          if (state.inAddressUint256 && /^\s+uint256\(/.test(transformedLine) && !transformedLine.includes("uint160")) {
            transformedLine = transformedLine.replace(/\buint256\(/g, "uint160(uint256(");
            state.pendingClose = true;
          }
          
          // Add extra closing parenthesis when closing uint256 inside address(uint160(uint256(...)))
          if (state.pendingClose && /^\s+\)\s*$/.test(transformedLine) && !transformedLine.includes("))")) {
            transformedLine = transformedLine.replace(/^\s+\)\s*$/, "            ))");
            state.pendingClose = false;
          }
          
          // Reset state when we see the final closing of address()
          if (state.inAddressUint256 && /^\s+\)\s*;?\s*$/.test(transformedLine) && !state.pendingClose) {
            state.inAddressUint256 = false;
          }
          
          // Rewrite permit2 imports to @uniswap/permit2 (preserve original quote style)
          if (transformedLine.includes("permit2/") && !transformedLine.includes("@uniswap/permit2/")) {
            transformedLine = transformedLine.replace(/from ['"]permit2\//g, (match) => {
              const quote = match.includes("'") ? "'" : '"';
              return `from ${quote}@uniswap/permit2/`;
            });
          }
          // Rewrite ERC721 extension imports to use extensions subdirectory
          if (transformedLine.includes("@openzeppelin/contracts/token/ERC721/IERC721")) {
            transformedLine = transformedLine.replace(
              /@openzeppelin\/contracts\/token\/ERC721\/(IERC721(?:Metadata|Enumerable))\.sol/g,
              "@openzeppelin/contracts/token/ERC721/extensions/$1.sol"
            );
          }
          return transformedLine;
        },
        settings: { strip: false },
      };
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

