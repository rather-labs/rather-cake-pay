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

5. Deploy contracts (see `package.json` for all scripts):
   - **Localhost** – `npm run deploy:localhost`
   - **Sepolia** – `npm run deploy:sepolia`
   - **Base Sepolia** – `npm run deploy:base-sepolia`

6. (Optional) Launch the Ignition workflow for localhost demos:
   ```bash
   npm run deploy:local
   ```

### Deployment Details

- The deployment script (`scripts/deploy.js`) handles:
  - Deploying the `CakeFactory` contract.
  - Exporting the ABI and deployment metadata to `frontend/public/contract/`.
  - Updating the `.env.example` file in the frontend with the deployed contract address and network details.

### Helper Scripts

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

Network settings live in `.env` (loaded via `dotenv`). Minimum variables required for public deployments:

```env
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_INFURA_PROJECT_ID
SEPOLIA_PRIVATE_KEY=YOUR_PRIVATE_KEY
BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
BASE_SEPOLIA_PRIVATE_KEY=YOUR_PRIVATE_KEY
ETHERSCAN_API_KEY=YOUR_ETHERSCAN_API_KEY
BASESCAN_API_KEY=YOUR_BASESCAN_API_KEY
UNISWAP_ROUTER_ADDRESS=0x3A9D48AB9751398BbFa63ad67599Bb04e4BdF98b
UNISWAP_ROUTER_ADDRESS_SEPOLIA=0x3A9D48AB9751398BbFa63ad67599Bb04e4BdF98b
LEMON_API_URL=https://api.example.lemon
LEMON_API_URL_SEPOLIA=https://api.example.lemon
SETTLEMENT_TOKEN=0x0000000000000000000000000000000000000000 # e.g. USDC on Sepolia
```

> Network-specific keys (suffix `_SEPOLIA`, `_BASESEPOLIA`, etc.) override the generic ones so `deploy.js` can emit correct metadata for each chain.

## Core Smart-Contract Workflows

- **User onboarding**: `registerUser` manages the shared user ID registry used across cakes.
- **Cake lifecycle**: `createCake` configures member sets, weights, billing period, interest rate, and the contribution token that can later be swapped through Uniswap.
- **Batched expenses**: `addBatchedCakeIngredients` records multiple payers/amounts per billing cycle and validates alignment with member weights.
- **Settlement (“cutting the cake”)**: `cutCake` accrues interest, applies outstanding batched ingredients, and advances the due date.
- **Read helpers**: `getCakeDetails`, `getCakeMembers`, `getCakeIngredientDetails`, `getCakeMemberBalance`, `getUserCakes`, etc., power the frontend dashboards and scripts.

## Testing

- Run all tests: `npm run test`
- Run a targeted test file: `npx hardhat test test/<file>.js`
- Lint Solidity: `npm run lint`
- Format Solidity: `npm run format`
