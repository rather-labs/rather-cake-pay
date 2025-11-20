<div align="center">

# 🍰 CakePay

### Split Bills Like Slicing Cake - Simple, Sweet, On-Chain

**Built with ❤️ by [Rather Labs](https://www.ratherlabs.com/)**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Next.js](https://img.shields.io/badge/Next.js-14-black)](https://nextjs.org/)
[![Solidity](https://img.shields.io/badge/Solidity-0.8.24-blue)](https://soliditylang.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)

[Live Demo](https://rather-cake-pay.vercel.app/) • [Documentation](#key-features) • [Contributing](#contributing)

</div>

---

## 🎯 What is CakePay?

CakePay is a **decentralized bill-splitting dApp** that makes group expense management as easy as slicing cake. Whether you're splitting rent with roommates, managing team dinners, or tracking shared subscriptions, CakePay provides a transparent, blockchain-powered solution that works seamlessly across **Web3 wallets**, **Lemon Cash**, and **Farcaster Mini Apps**.

### Why CakePay?

- 🎂 **Create "Cakes"**: Group multiple people together for ongoing shared expenses
- 🥧 **Add "Ingredients"**: Track expenses with custom splits and multiple payers
- 🔪 **Cut the Cake**: Batch submit expenses on-chain to update balances
- 💰 **Settle Up**: Pay what you owe or claim what you're owed with transparent on-chain settlement
- 📊 **Track Everything**: Real-time balance updates with complete transaction history
- 🔐 **Trustless & Transparent**: All financial logic lives on the blockchain

---

## ✨ Key Features

### 🏢 Multi-Platform Support

- **Standard Web3**: Full Wagmi + RainbowKit integration
- **Lemon Cash**: Native integration with Lemon Cash Mini App SDK
- **Farcaster**: Seamless Warpcast Mini App experience
- One codebase, three wallet experiences

### 💳 Smart Group Management

- Create groups (cakes) with 2+ members
- Weighted expense splitting (equal or custom ratios)
- Multiple payers per expense
- Configurable interest rates for late payments
- Democratic voting to disable groups

### ⛓️ Blockchain-First Architecture

- **On-Chain**: Core financial data, balances, and settlements
- **Off-Chain**: Extended metadata, descriptions, and receipts
- User ID system for gas-efficient storage
- Batched transactions to minimize gas costs

### 🎨 Beautiful UX

- Pixel-art inspired design
- Real-time balance calculations
- Pending vs settled expense tracking
- Member leaderboards showing who's owed the most
- Mobile-first responsive design

---

## 🏗️ Architecture Overview

CakePay follows a **hybrid on-chain/off-chain architecture** optimized for both security and user experience:

```
┌─────────────────────────────────────────────────────────────┐
│                     CakePay Architecture                     │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │           Frontend Layer (Next.js 14)               │   │
│  │                                                       │   │
│  │  • Wagmi/RainbowKit (Standard Web3)                 │   │
│  │  • Lemon Cash Mini App SDK                          │   │
│  │  • Farcaster/Warpcast SDK                           │   │
│  │  • Server Components (Database APIs)                │   │
│  │  • Client Components (Wallet Interactions)          │   │
│  └────────────────────┬────────────────────────────────┘   │
│                       │                                      │
│  ┌────────────────────┴──────────────────────────────────┐ │
│  │         Smart Contract Layer (Ethereum/L2s)          │ │
│  │                                                        │ │
│  │  CakeFactory.sol                                      │ │
│  │  • User ID Mapping (address → uint64)                │ │
│  │  • Cake Management (groups, members, weights)        │ │
│  │  • Batched Ingredients (expenses with payers)        │ │
│  │  • Balance Tracking (int256[] per cake)              │ │
│  │  • Settlement System (pay/claim functions)           │ │
│  │  • Interest Accrual (configurable rates)             │ │
│  │  • Voting System (disable inactive cakes)            │ │
│  └────────────────────┬──────────────────────────────────┘ │
│                       │                                      │
│  ┌────────────────────┴──────────────────────────────────┐ │
│  │           Data Layer (Supabase)                       │ │
│  │                                                        │ │
│  │  • User Profiles (username, avatar)                  │ │
│  │  • Cake Metadata (name, description, icon)           │ │
│  │  • Ingredient Details (name, description, receipts)  │ │
│  │  • Status Tracking (pending, submitted, settled)     │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

**Creating a Cake:**

1. User fills form with group details → Frontend
2. Validates all members are registered on-chain → Smart Contract Query
3. Submits transaction via wallet → Smart Contract Write
4. Event emitted → Frontend listens
5. Metadata saved → Database

**Adding Expenses:**

1. User adds expense (off-chain) → Database (pending status)
2. Multiple expenses accumulate → Database
3. User clicks "Submit on-chain" → Smart Contract (batched)
4. Balances updated → Smart Contract
5. Status updated to "submitted" → Database

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn
- MetaMask or other Web3 wallet
- (Optional) Lemon Cash app for mini-app testing
- (Optional) Warpcast for Farcaster integration

### Installation

```bash
# Clone the repository
git clone https://github.com/rather-labs/rather-cake-pay.git
cd rather-cake-pay

# Install smart contract dependencies
cd hardhat
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### Smart Contract Deployment

```bash
cd hardhat

# Compile contracts
npm run compile

# Deploy to local network
npm run node          # Terminal 1
npm run deploy:local  # Terminal 2

# Deploy to Sepolia testnet
npm run deploy:sepolia

# Deploy to Base Sepolia
npm run deploy:base-sepolia
```

### Frontend Setup

```bash
cd frontend

# Configure environment variables
cp .env.example .env.local
# Edit .env.local with your values

# Run development server
npm run dev
```

Visit `http://localhost:3000` to see the app!

---

## 📦 Technology Stack

### Smart Contracts

- **Solidity 0.8.24**: Latest secure Solidity version
- **Hardhat**: Development framework
- **Hardhat Ignition**: Deployment system
- **Slither**: Security analysis (mandatory in CI)

### Frontend

- **Next.js 14**: App Router with Server Components
- **React 18**: Modern React with hooks
- **TypeScript**: Full type safety
- **Wagmi**: Ethereum interactions
- **RainbowKit**: Wallet connection UI
- **Viem**: Low-level Ethereum library
- **Lemon Cash SDK**: Mini-app integration
- **Farcaster SDK**: Warpcast mini-app support
- **Tailwind CSS**: Utility-first styling

### Infrastructure

- **Supabase**: PostgreSQL database
- **Vercel**: Frontend hosting (recommended)
- **Tenderly**: RPC provider + debugging

---

## 🎮 User Flows

### 1️⃣ Registration Flow

```
User connects wallet
  → Checks if registered on-chain
  → If not: Transaction to register (gets user ID)
  → Saves profile to database
  → Redirects to dashboard
```

### 2️⃣ Creating a Cake (Group)

```
User clicks "Create Group"
  → Fills form (name, members, interest rate)
  → System validates all members registered on-chain
  → Transaction sent to create cake
  → On-chain user IDs used (not wallet addresses)
  → Cake metadata saved to database
  → User redirected to cake page
```

### 3️⃣ Adding Expenses

```
User clicks "Add Expense"
  → Fills form (name, amount, payers, split)
  → Expense saved to database (status: pending)
  → User can add multiple expenses
  → When ready: "Submit on-chain" button
  → Batches all pending expenses
  → Single transaction updates balances
  → Status changes to "submitted"
```

### 4️⃣ Settling Up

```
User views their balance
  → If positive (owed): Click "Claim"
  → If negative (owes): Click "Pay"
  → Transaction sent with exact amount
  → Balance updated on-chain
  → UI reflects new balance
```

---

## 🏛️ Smart Contract Details

### CakeFactory.sol

The core contract managing all financial logic.

#### Key Data Structures

**Cake (Group)**

```solidity
struct Cake {
    uint64 createdAt;
    uint64 lastCutAt;
    uint64 lastCutBatchedIngredientsId;
    uint16 interestRate;
    bool active;
    address token;              // 0x0 for ETH
    bool[] votesToDisable;
    uint64[] memberIds;         // User IDs (not addresses)
    uint16[] memberWeights;     // BPS (sum = 10000)
    int256[] currentBalances;   // Positive = owes, negative = owed
}
```

**BatchedCakeIngredients (Expense)**

```solidity
struct BatchedCakeIngredients {
    uint64 createdAt;
    uint16[] weights;           // Per-member split
    uint64[] payerIds;          // Who paid
    uint256[] payedAmounts;     // How much each paid
}
```

#### Core Functions

| Function                         | Description                     | Gas Optimization                  |
| -------------------------------- | ------------------------------- | --------------------------------- |
| `registerUser(address)`          | Register wallet and get user ID | One-time per user                 |
| `createCake(...)`                | Create new group                | User IDs instead of addresses     |
| `addBatchedCakeIngredients(...)` | Add expenses batch              | Multiple expenses in one tx       |
| `cutCake(uint128)`               | Update balances                 | Processes all pending ingredients |
| `payCakeSlice(uint128)`          | Pay what you owe                | Direct balance update             |
| `claimCakeSlice(uint128)`        | Claim what you're owed          | Transfers funds to caller         |

---

## 🔧 Configuration

### Environment Variables

**Frontend (`frontend/.env.local`)**

```env
# Contract Deployment
NEXT_PUBLIC_CONTRACT_ADDRESS_ETH_SEPOLIA=0x...
NEXT_PUBLIC_CHAIN_ID=11155111

# RPC
NEXT_PUBLIC_RPC_URL=https://sepolia.gateway.tenderly.co

# Database
NEXT_PUBLIC_SUPABASE_URL=https://...supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...

# Wallets
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=...
```

**Contracts (`hardhat/.env`)**

```env
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/...
SEPOLIA_PRIVATE_KEY=0x...
ETHERSCAN_API_KEY=...
```

---

## 🧪 Testing

### Smart Contracts

```bash
cd hardhat

# Run tests
npm test

# Run with coverage
npm run coverage

# Security analysis (mandatory)
slither . --exclude-dependencies
```

### Frontend

```bash
cd frontend

# Type check
npx tsc --noEmit

# Lint
npm run lint

# Format check
npm run format:check

# Build test
npm run build
```

### CI/CD

```bash
# Test everything locally before pushing
./scripts/test-ci.sh

# Test only contracts
./scripts/test-ci.sh contracts

# Test only frontend
./scripts/test-ci.sh frontend
```

---

## 🛡️ Security

### Smart Contract Security

- **Slither Analysis**: Mandatory in CI pipeline
- **OpenZeppelin Patterns**: Used where applicable
- **Reentrancy Protection**: All external calls protected
- **Integer Overflow**: Built-in Solidity 0.8+ checks
- **Access Control**: Proper member validation

### Best Practices

1. Never commit private keys or secrets
2. All contract changes require security review
3. Slither must pass before merging
4. Use established patterns (OpenZeppelin)
5. Test edge cases thoroughly

---

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guidelines.

### Development Workflow

1. Fork the repository
2. Create feature branch from `develop`
3. Make your changes
4. Run `./scripts/test-ci.sh` locally
5. Submit PR to `develop` branch
6. Wait for review and CI to pass

### Commit Convention

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat(contracts): add voting system
fix(frontend): correct balance calculation
docs(readme): update deployment steps
```

---

## 📚 Additional Resources

- **Smart Contracts**: See [hardhat/README.md](hardhat/README.md)
- **Contributing Guide**: See [CONTRIBUTING.md](CONTRIBUTING.md)
- **Frontend API**: See [frontend/lib/api/](frontend/lib/api/)
- **Database Schema**: See [Database Data Structures](#database-data-structures) section

---

## 🗺️ Roadmap

- [x] Core smart contract implementation
- [x] Multi-wallet support (Web3, Lemon, Farcaster)
- [x] User registration system
- [x] Cake creation and management
- [x] Expense tracking and batching
- [x] Balance calculation and settlement
- [ ] Receipt upload integration
- [ ] Token swaps for multi-currency payments
- [ ] Recurring expense automation
- [ ] Mobile app (React Native)
- [ ] Advanced analytics dashboard
- [ ] Social features (group chat, activity feed)

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

**Built by [Rather Labs](https://www.ratherlabs.com/)** - A leading blockchain development studio specializing in Web3 applications, smart contracts, and decentralized systems.

**Powered by:**

- [Lemon Cash](https://www.lemon.me/) - Crypto banking made simple
- [Farcaster](https://www.farcaster.xyz/) - Decentralized social protocol
- [Ethereum](https://ethereum.org/) - World computer

---

<div align="center">

**Made with 🍰 by Rather Labs**

[Website](https://www.ratherlabs.com/) • [Twitter](https://twitter.com/ratherlabs) • [LinkedIn](https://www.linkedin.com/company/rather-labs/)

</div>
