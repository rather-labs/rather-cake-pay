# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Rather Cake Pay is a decentralized bill splitting application built with Next.js 14, Supabase, and Solidity smart contracts. The system allows groups ("cakes") to split expenses ("cake ingredients") with weighted distributions and manage payments on-chain.

## Common Commands

### Smart Contracts (hardhat/)

```bash
# Development
cd hardhat
npm run compile                    # Compile Solidity contracts
npm run test                       # Run contract tests
npm run lint                       # Run Solhint linter
npm run format                     # Format contracts with Prettier
npm run format:check               # Check contract formatting

# Local deployment
npm run node                       # Start local Hardhat node
npm run deploy:local               # Deploy to local network (Hardhat Ignition)

# Security analysis (required before PR)
slither . --exclude-dependencies   # Run Slither security analysis
```

### Frontend (frontend/)

```bash
# Development
cd frontend
npm run dev                        # Start Next.js dev server (http://localhost:3000)
npm run build                      # Build for production
npm run start                      # Start production server
npm run lint                       # Run ESLint
npm run format                     # Format code with Prettier
npm run format:check               # Check code formatting
npx tsc --noEmit                   # TypeScript type checking
```

### CI/CD Testing (Root)

```bash
# Run all CI checks locally before submitting PR
./scripts/test-ci.sh               # Test everything (contracts + frontend)
./scripts/test-ci.sh contracts     # Test only smart contracts
./scripts/test-ci.sh frontend      # Test only frontend
```

## Architecture

### Layered Architecture

**Smart Contract Layer** (`hardhat/contracts/`)

- `CakeFactory.sol`: Core contract managing cakes, batched ingredients, user ID mappings, and payments
- Uses Hardhat Ignition for deployment (`hardhat/ignition/modules/CakeFactory.js`)
- All write operations emit events for frontend synchronization

**Frontend Layer** (`frontend/app/`)

- Next.js 14 with App Router
- Server components handle database operations (Supabase)
- Client components handle wallet interactions (ethers.js v6)
- API routes in `frontend/app/api/` (not used in current implementation)

**Data Layer**

- **On-chain**: Core financial data (Cake struct, BatchedCakeIngredients struct)
- **Off-chain (Supabase)**: Extended metadata (descriptions, receipts, contact info)
- Data synchronization happens via blockchain events

### Key Design Patterns

**User ID System**: On-chain mapping from addresses to uint64 IDs for gas optimization across multiple cakes.

**Batched Ingredients**: Multiple expenses are batched off-chain before being submitted on-chain as a single `BatchedCakeIngredients` struct, reducing gas costs.

**Weight-based Splitting**: Each expense has an array of weights (uint8[]) matching the cake's member order, allowing unequal splits.

**Interest Rate System**: Configurable per-cake interest rates (uint16) incentivize timely settlements.

**Voting to Disable**: Members can vote to disable a cake; if ≥50% vote yes, the cake becomes inactive.

## Data Structures

### On-chain (CakeFactory.sol)

**Cake Struct**

```solidity
{
    uint64 createdAt;
    uint64 lastCutAt;
    uint64 lastCutBatchedIngredientsId;  // Last ingredient ID included in a cut
    uint16 interestRate;
    bool active;
    address token;                        // 0x0 for native ETH
    bool[] votesToDisable;
    uint64[] memberIds;                   // References to user IDs
    uint256[] currentBalances;            // Positive = owes, negative = is owed
}
```

**BatchedCakeIngredients Struct**

```solidity
{
    uint64 createdAt;
    uint8[] weights;                      // Same length/order as Cake.memberIds
    uint64[] payerIds;                    // User IDs who paid
    uint256[] payedAmounts;               // Amount each payer paid
}
```

### Off-chain (Supabase)

**Tables**: `users`, `cakes`, `cake_ingredients`, `receipts`

See [README.md](README.md) for detailed database schemas.

## Frontend Structure

### API Client (`frontend/lib/api/`)

All API calls are centralized in typed modules:

- `cakes.ts`: Cake CRUD operations
- `ingredients.ts`: Ingredient operations
- `balances.ts`: Balance queries
- `settlements.ts`: Payment operations
- `users.ts`: User profile operations
- `index.ts`: Re-exports all APIs

**Usage pattern**:

```typescript
import { cakesApi } from "@/lib/api";
const cakes = await cakesApi.getCakes(userAddress);
```

### Supabase Integration (`frontend/lib/supabase/`)

- `client.ts`: Browser client
- `server.ts`: Server component client
- `middleware.ts`: Auth middleware

### Custom Hooks (`frontend/hooks/`)

- `use-cakes.ts`: Fetch user cakes
- `use-toast.ts`: Toast notifications
- `use-mobile.ts`: Responsive breakpoint detection

### UI Components (`frontend/components/ui/`)

Built with Radix UI primitives and Tailwind CSS. All components follow shadcn/ui patterns.

## Development Workflow

### Branching Strategy (Git Flow)

- `master`: Production branch (protected)
- `develop`: Integration branch for features
- `feature/*`: New features (branch from develop)
- `fix/*`: Bug fixes (branch from develop)
- `hotfix/*`: Critical fixes (branch from master)

### Commit Convention

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <subject>

Types: feat, fix, docs, style, refactor, test, chore, perf, ci, security
Scopes: contracts, frontend, api, db, config
```

### PR Requirements

1. Run `./scripts/test-ci.sh` locally - all checks must pass
2. **Contracts**: Slither security analysis is MANDATORY (build fails if issues found)
3. **Frontend**: Type checking, linting, and build must succeed
4. Follow checklist in [CONTRIBUTING.md](CONTRIBUTING.md)
5. At least one maintainer approval required

## Important Patterns

### Smart Contract Development

**Gas Optimization**:

- Use uint256 for calculations, smaller types (uint8, uint16, uint64) for storage
- Struct packing: order fields by size for optimal storage slots
- User IDs (uint64) instead of addresses save ~20 bytes per member reference

**Security Requirements**:

- All contract changes require Slither analysis (no exceptions)
- Use OpenZeppelin patterns where applicable
- Test for reentrancy, overflow, and access control issues

**Testing** (when tests are added):

- Unit tests for all public functions
- Edge case coverage (empty arrays, zero amounts, etc.)
- Gas reporting enabled in tests

### Frontend Development

**Data Fetching Pattern**:

1. Server components fetch from Supabase directly
2. Client components use API client from `@/lib/api`
3. Blockchain reads use ethers.js providers
4. Blockchain writes require wallet signatures

**Environment Variables**:

```
NEXT_PUBLIC_CHAIN_ID=11155111
NEXT_PUBLIC_CONTRACT_ADDRESS=0x...
NEXT_PUBLIC_RPC_URL=https://...
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

**Never commit** `.env.local` or any file containing secrets.

### Blockchain Event Synchronization

The system relies on events emitted by CakeFactory.sol:

- `CakeCreated(uint128 indexed cakeId)`
- `BatchedCakeIngredientsAdded(uint128 indexed batchedCakeIngredientsId, uint128 indexed cakeId)`
- `CakeCutted(uint128 indexed cakeId)`

Frontend listens to these events and updates Supabase accordingly.

## Key Files to Understand

### Smart Contracts

- [hardhat/contracts/CakeFactory.sol](hardhat/contracts/CakeFactory.sol): Main contract (see README for detailed function docs)

### Frontend Core

- [frontend/lib/api/index.ts](frontend/lib/api/index.ts): API client entry point
- [frontend/lib/supabase/server.ts](frontend/lib/supabase/server.ts): Supabase server client
- [frontend/app/page.tsx](frontend/app/page.tsx): Landing page
- [frontend/app/dashboard/page.tsx](frontend/app/dashboard/page.tsx): Main dashboard

### Configuration

- [hardhat/hardhat.config.js](hardhat/hardhat.config.js): Hardhat configuration
- [hardhat/.solhint.json](hardhat/.solhint.json): Solidity linting rules
- [frontend/tsconfig.json](frontend/tsconfig.json): TypeScript configuration

## Testing Strategy

### Current State

- Tests are not yet implemented (contracts marked with TODO)
- CI/CD workflows are configured but tests will fail until implemented

### When Adding Tests

- Contracts: Use Hardhat testing framework with ethers.js
- Frontend: Use Next.js testing utilities
- Follow patterns in [CONTRIBUTING.md](CONTRIBUTING.md#testing-requirements)

## Security Considerations

**Critical Rules**:

1. Slither analysis is MANDATORY - builds fail if security issues found
2. Never commit private keys, mnemonics, or API secrets
3. All smart contract changes require security-focused review
4. Use established patterns (OpenZeppelin) for common functionality

**Common Vulnerabilities to Check**:

- Reentrancy attacks (especially in payment functions)
- Integer overflow/underflow (Solidity 0.8.24 has built-in checks)
- Access control (who can call what?)
- Gas limits and DoS vectors

## CI/CD Workflows

### Contracts CI (`.github/workflows/contracts-ci.yml`)

Triggers on changes to `hardhat/**`:

1. Lint (Solhint + Prettier)
2. Compile
3. Test
4. Security (Slither + npm audit)

### Frontend CI (`.github/workflows/frontend-ci.yml`)

Triggers on changes to `frontend/**`:

1. Lint (ESLint + TypeScript)
2. Type check
3. Build
4. Security (npm audit)

### Deployment (`.github/workflows/contracts-deploy.yml`)

Manual deployment workflow (configured but deployment details not in scope).

## Known TODOs

From [README.md](README.md):

- Receipt upload integration needs implementation
- Smart contract functions are declared but not implemented (marked as TODO in CakeFactory.sol)
- Tests need to be written for all contracts and frontend code

## Additional Resources

- Full architecture and API documentation: [README.md](README.md)
- Contributing guidelines: [CONTRIBUTING.md](CONTRIBUTING.md)
- Contract deployment: [hardhat/README.md](hardhat/README.md)

Always use context7 when I need code generation, setup or configuration steps, or
library/API documentation. This means you should automatically use the Context7 MCP
tools to resolve library id and get library docs without me having to explicitly ask.
