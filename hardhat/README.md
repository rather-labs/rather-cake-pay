# Rather Cake Pay - Hardhat Project

This is a Hardhat project for deploying Solidity smart contracts using Hardhat Ignition.

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

4. Deploy contracts to your local node (Ignition – see below):
```bash
npm run deploy:local
```

5. Start a standalone Hardhat node:
```bash
npm run node
```

### Helper scripts

- `scripts/startNode.sh`: wipes previous Ignition artifacts, recompiles, and boots a node if one isn’t already running.
- `scripts/verifyRegister.sh`: deploys via Ignition on `localhost` and immediately runs `scripts/interact.js` for a sanity check (registers users).

> These scripts are handy when running demos—start the node with `startNode.sh`, then in another terminal execute `verifyRegister.sh` to populate the chain with sample data.

## Project Structure

- `contracts/` - Solidity smart contracts
- `ignition/modules/` - Ignition deployment modules
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

The project is configured to use Solidity 0.8.24 with optimizer enabled. Network configurations can be added in `hardhat.config.js`. Ignition-specific settings are also configured in the config file.

## Core workflows covered by this repo

- **User registration & cake creation** (`registerUser`, `createCake`)
- **Expense batching** (`addBatchedCakeIngredients`) with optional weight overrides and multiple payers
- **Settlement** (`cutCake`) including overdue-interest accrual and balance updates
- **Read helpers** (`getCakeDetails`, `getCakeMembers`, `getCakeMemberBalance`, etc.) for the frontend and scripts

## Testing

- Run everything: `npm run test`
- Target a single spec while iterating:

	```bash
	npx hardhat test test/addBatchedCakeIngredients.test.js
	```

