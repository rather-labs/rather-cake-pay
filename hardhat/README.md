# Rather Cake Pay - Hardhat Project

This is a Hardhat project for deploying Solidity smart contracts using Hardhat Ignition.

## Quick Start

1. Install dependencies:
```bash
npm install
```

2. Compile contracts:
```bash
npm run compile
```

3. Run tests:
```bash
npm run test
```

4. Deploy contracts:
```bash
npm run deploy:local
```

5. Start local Hardhat node:
```bash
npm run node
```

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

## TODOs

- Implement on-chain contract

