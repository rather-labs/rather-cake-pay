# Rather Cake Pay - Hardhat Project

This is a Hardhat project for deploying Solidity smart contracts using Hardhat.

## Quick Start

1. Install dependencies (run inside `hardhat/`):
```bash
npm install
```

2. Compile contracts:
```bash
npm run compile
```

3. Run the full test suite:
```bash
npm run test
```

4. Start a standalone Hardhat node:
```bash
npm run node
```

5. Deploy contracts:
   - **Localhost**:
     ```bash
     npm run deploy:localhost
     ```
   - **Sepolia**:
     ```bash
     npm run deploy:sepolia
     ```
   - **Base Sepolia**:
     ```bash
     npm run deploy:base-sepolia
     ```

### Deployment Details

- The deployment script (`scripts/deploy.js`) handles:
  - Deploying the `CakeFactory` contract.
  - Exporting the ABI and deployment metadata to `frontend/public/contract/`.
  - Updating the `.env.example` file in the frontend with the deployed contract address and network details.

### Helper scripts

- `scripts/startNode.sh`: wipes previous Ignition artifacts, recompiles, and boots a node if one isn’t already running.
- `scripts/verifyRegister.sh`: deploys via Ignition on `localhost` and immediately runs `scripts/interact.js` for a sanity check (registers users).

> These scripts are handy when running demos—start the node with `startNode.sh`, then in another terminal execute `verifyRegister.sh` to populate the chain with sample data.

## Project Structure

- `contracts/` - Solidity smart contracts
- `scripts/` - Deployment and interaction scripts
- `test/` - Test files
- `hardhat.config.js` - Hardhat configuration

## Deployment with Ignition

This project uses Hardhat Ignition for declarative contract deployments. Deployment modules are located in `ignition/modules/`.

### Deploy to Hardhat Network
```bash
hardhat ignition deploy ignition/modules/CakeFactory.js --network hardhat
```

### Deploy to Other Networks
```bash
hardhat ignition deploy ignition/modules/CakeFactory.js --network <network-name>
```

### Verify Deployment
```bash
hardhat ignition verify --network <network-name>
```

## Configuration

- Network configurations (e.g., RPC URLs, private keys) are managed via `.env` files.
- Example `.env` file:
  ```env
  SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_INFURA_PROJECT_ID
  SEPOLIA_PRIVATE_KEY=YOUR_PRIVATE_KEY
  BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
  BASE_SEPOLIA_PRIVATE_KEY=YOUR_PRIVATE_KEY
  ETHERSCAN_API_KEY=YOUR_ETHERSCAN_API_KEY
  BASESCAN_API_KEY=YOUR_BASESCAN_API_KEY
  ```

## Core workflows covered by this repo

- **User registration & cake creation** (`registerUser`, `createCake`)
- **Expense batching** (`addBatchedCakeIngredients`) with optional weight overrides and multiple payers
- **Settlement** (`cutCake`) including overdue-interest accrual and balance updates
- **Read helpers** (`getCakeDetails`, `getCakeMembers`, `getCakeMemberBalance`, etc.) for the frontend and scripts

## Testing

- Run all tests:
  ```bash
  npm run test
  ```
- Run a specific test file:
  ```bash
  npx hardhat test test/<test-file>.js
  ```

