# Rather Cake Pay

A decentralized bill splitting application that allows groups of people to split cake ingredients and manage payments on-chain.

## Overview

Rather Cake Pay enables users to:
- Create groups (called "cakes") with multiple members
- Add expenses (called "cake ingredients") to groups
  - Periodically recurring expenses
- Split bills automatically among group members
- Track and settle payments on-chain (i.e. cut the cake)
- Manage group cake ingredients transparently
- Manage groups in a single token
  - Provide integration with swap protocols to allow payments in any token

## Architecture

Rather Cake Pay follows a decentralized architecture with three main layers:

### System Layers

1. **Smart Contract Layer (Blockchain)**
   - **CakeFactory.sol**: Core on-chain contract managing cakes and cake ingredients
   - Handles user ID mapping, group membership, expense tracking and payment settlements
   - Provides immutable audit trail for all transactions
   - Supports multi-token payments through token address configuration per cake

2. **Frontend Layer (Next.js Application)**
   - Miniapp framework integration (Lemon, Farcaster)
   - Blockchain interaction and wallet connectivity
   - Server-side components for database management and API routes (can be on backend)
   - Client-side components for user interface and wallet interactions

3. **Data Layer**
   - **On-chain**: Core financial and structural data (Cake, BatchedCakeIngredients structs with balances, weights, payment status)
   - **Off-chain Database**: Extended metadata (descriptions, timestamps, user contact information, batching of expenses (cake ingredients)) for enhanced UX
   - Synchronized data model between on-chain and off-chain storage

4. **Backend**
    - Optional, can be next.js server side componentts.
    - Database handling 
    - Batching expenses


### API routes

#### Cakes (Groups)

- `GET /api/cakes` - List all cakes for the authenticated user
  - Query params: `?address=<userAddress>` (optional, defaults to authenticated user)
  - Returns: Array of cake metadata with on-chain data

- `GET /api/cakes/[cakeId]` - Get detailed cake information
  - Returns: Cake metadata (description, imageUrl, category) merged with on-chain data (balances, members, token)

- `POST /api/cakes` - Create cake metadata entry
  - Body: `{ cakeId: string, description?: string, imageUrl?: string, category?: string }`
  - Note: Called after on-chain cake creation to store extended metadata

- `PUT /api/cakes/[cakeId]` - Update cake metadata, syncs with on-chain data for the cake
  - Body: `{ description?: string, imageUrl?: string, category?: string }`

#### Cake Ingredients (Expenses)

- `GET /api/cakes/[cakeId]/ingredients` - List all ingredients for a cake
  - Returns: Array of ingredients with metadata and on-chain status

- `GET /api/ingredients/[cakeId]/[ingredientId]` - Get detailed ingredient information
  - Returns: Ingredient metadata (name, description, receiptUrl) merged with on-chain data (weights, payers, amounts)

- `POST /api/ingredients/[cakeId]` - Create ingredient (stored off-chain, pending submission)
  - Body: `{ cakeId: string, name: string, description?: string, weights: number[], payerAddress: string, amount: string, receiptUrl?: string }`
  - Returns: Created ingredient with pending status

- `GET /api/ingredients/[cakeId]/batch` - Batch all non-submited cake ingredients for a specific cake
  - Returns: Consolidated ingredient information to submit on-chain

- `PUT /api/ingredients/[cakeId]/[ingredientId]` - Update ingredient metadata and non-submited on-chain data
  - Body: `{ name?: string, description?: string, receiptUrl?: string }`
  - Note: For already batched and submited ingredients only updates off-chain metadata, cannot modify submitted ingredients

#### Users

- `GET /api/users/[address]` - Get user metadata
  - Returns: User profile (displayName, email, avatar, createdAt)

- `POST /api/users` - Create or update user metadata
  - Body: `{ address: string, displayName?: string, email?: string, avatar?: string }`
  - Returns: Created/updated user profile

- `PUT /api/users/[address]` - Update user metadata
  - Body: `{ displayName?: string, email?: string, avatar?: string }`

#### Blockchain Operations

- `POST /api/blockchain/sync` - Sync blockchain events to database
  - Body: `{ fromBlock?: number, toBlock?: number, cakeId?: string }`
  - Returns: Sync status and number of events processed
  - Note: Typically called by cron job or webhook

#### Receipts

- `POST /api/receipts/upload` - Upload receipt image
  - Body: `FormData` with file
  - Returns: `{ receiptUrl: string }` (URL to stored receipt)

- `GET /api/receipts/[receiptId]` - Get receipt image
  - Returns: Receipt image file

#### Health & Status

- `GET /api/health` - Health check endpoint
  - Returns: `{ status: "ok", timestamp: number }`

 
### Key Components

- **Cake (Group)**: Represents a bill-splitting group with members, token configuration, current balances, and voting system for disabling
- **Batched Cake Ingredients (Expenses)**: Batched expenses within a cake with weighted payment distribution and payer tracking
- **User Management**: Address-to-ID mapping system for efficient on-chain storage and cross-cake user tracking
- **Cake Cutting**: Batch processing of all pending ingredients to update member balances
- **Payment System**: Members can pay their owed amounts or claim amounts owed to them
- **Interest System**: Configurable interest rates per cake for unpaid amounts to incentivize timely settlements
- **Voting System**: Members can vote to disable a cake (requires majority vote)

### Data Flow

1. User creates a cake via frontend → Transaction sent to CakeFactory contract → sync DB
2. Contract emits events → Frontend listens, updates local state and sync DB
3. Expenses batched on the backend with metadata synced to database
4. User demands unsubmitted expenses to be added to the cake
5. User demands a cake to be cut → User balances are updated acording to cumulative cake ingredients since last cut
6. Payments processed → Users submit payments to the conctact which handles redirections

### Technology Stack

- **Blockchain**: Solidity 0.8.24, Hardhat, Hardhat Ignition
- **Frontend**: Next.js 14, React 18, TypeScript, Ethers.js 6
- **Development**: Hardhat for contract development and testing

## Database Data Structures

The off-chain database stores extended metadata that complements on-chain data. The following structures represent the database schema:

### User

```typescript
{
  id: number;                     // Unique database ID - The same that is used on-chain
  address: string;                // Ethereum wallet address (unique)
  displayName?: string;           // User-friendly display name (Lemon/Farcaster Id?)
  avatar?: string;                // Avatar image URL
  createdAt: timestamp;           // Account creation timestamp
}
```

### Cake (Group)

```typescript
{
  id: string;                    // Unique database ID - The same that is used on-chain
  name: string;                  // Cake/group name
  description?: string;          // Extended description
  imageUrl?: string;             // Group image/icon URL
  category?: string;             // Category/tag for organization
  token: string;                 // Token contract address (0x0 for native ETH)
  interestRate: number;         // Interest rate to be added to unpaid amounts
  lastCutAt: number;             // Timestamp of last cake cut (uint64)
  lastAddedIngredient: number;   // Last added ingredient ID (uint128)
  memberIds: number[];           // Array of user IDs (uint64[])
  currentBalances: string[];     // Current balances per member (uint256[])
  createdAt: timestamp;          // Database record creation timestamp
  updatedAt: timestamp;          // Last update timestamp
}
```

### Cake Ingredient (Expense)

```typescript
{
  id: string;                     // Unique database ID
  batchedIngredientsId?: string;  // On-chain ingredient ID (if batched and submitted)
  cakeId: string;                 // Associated cake ID
  name: string;                   // Ingredient/expense name
  description?: string;           // Extended description
  weights: number[];              // Payment weights per member (uint8[])
  payerIds: number[];             // Ids of payers
  amounts: number[];              // amount paid by each payer (uint256 as string)
  receiptUrl?: string;            // URL to uploaded receipt image
  status: 'pending' | 'submitted' | 'settled';  // Submission status
  createdAt: timestamp;          // Expense creation timestamp
  submittedAt?: timestamp;       // Blockchain submission timestamp
  settledAt?: timestamp;         // Settlement completion timestamp
}
```

### Receipt

```typescript
{
  id: string;                     // Unique receipt ID
  ingredientId: string;           // Associated ingredient ID
  url: string;                    // Storage URL for receipt image
  uploadedAt: timestamp;         // Upload timestamp
}
```

## Smart Contract Structures and Functions

### Contract: CakeFactory.sol

The `CakeFactory` contract manages cake groups, assigns deterministic user IDs, batches expenses, accrues interest, and cuts cakes on-chain. It is the single source of truth for the core financial mechanics that the frontend and backend mirror.

#### Data Structures

**Cake Struct**
```solidity
struct Cake {
    uint64 createdAt;                   // Timestamp of cake creation (64-bit, valid until 2106)
    uint64 lastCutAt;                   // Timestamp of last cake cut (64-bit, valid until 2106)
    uint64 lastCutBatchedIngredientsId; // ID of last ingredients included in a cut
    uint128 latestIngredientId;         // Counter for the last submitted ingredient
    uint64 billingPeriod;               // Expected cadence between cuts
    uint64 nextDueAt;                   // Deadline for the next billing period
    uint16 interestRate;                // Interest rate for unpaid amounts (in basis points)
    bool active;                        // Whether the cake is active (voting can disable it)
    address token;                      // Token contract address (0x0 for native ETH)
    bool[] votesToDisable;              // Votes collected to disable the cake
    uint64[] memberIds;                 // Array of user IDs in the cake
    uint16[] memberWeights;             // Weight per member (same order as memberIds, sum = 10,000)
    int256[] currentBalances;           // Running balances per member
}
```

**BatchedCakeIngredients Struct**
```solidity
struct BatchedCakeIngredients {
    uint64 createdAt;      // Timestamp of batched ingredients creation (64-bit, valid until 2106)
    uint16[] weights;      // Payment weights per member (same order as Cake.memberIds)
    uint64[] payerIds;     // User IDs of payers
    uint256[] payedAmounts; // Amounts paid by each payer
}
```

#### Storage Mappings

```solidity
mapping(address => uint64) public userIds;                                   // Address ➜ user ID
mapping(uint64 => address) public userAddresses;                             // User ID ➜ address
mapping(uint128 => Cake) public cakes;                                       // Cake ID ➜ Cake data
mapping(uint128 => mapping(uint64 => BatchedCakeIngredients)) public batchedIngredientsPerCake; // cake ➜ ingredient ID ➜ ingredient
mapping(uint64 => mapping(uint128 => bool)) public userCakes;                // user ➜ cake participation flag
mapping(uint64 => uint128[]) private userCakeIds;                            // cakes per user (viewed via getter)
mapping(uint128 => mapping(uint64 => uint64)) public cakeMemberIndex;        // cake ➜ member ID ➜ index

uint64 public totalUsers;                         // Count of registered users
uint128 public totalCakes;                        // Count of cakes created
uint128 public totalBatchedCakeIngredients;       // Count of batched ingredient records
```

#### Events
```solidity
event CakeCreated(uint128 indexed cakeId);
event BatchedCakeIngredientsAdded(uint128 indexed batchedCakeIngredientsId, uint128 indexed cakeId);
event CakeCutted(uint128 indexed cakeId);
```

#### Write Functions

**createCake**
```solidity
function createCake(address _token, uint64[] memory _memberIds, uint16 _interestRate) public returns (uint128)
```
- Creates a new cake (group) with specified token, members, and interest rate
- Parameters:
  - `_token`: Token contract address (0x0 for native ETH)
  - `_memberIds`: Array of user IDs that will be members of the cake
  - `_interestRate`: Interest rate for unpaid amounts in the cake
- Returns the new cake ID (uint128)
- Emits `CakeCreated` event
- Note: Currently marked as TODO in implementation

**addBatchedCakeIngredients**
```solidity
function addBatchedCakeIngredients(
    uint128 _cakeId,
    uint8[] memory _weights,
    uint64[] memory _payerIds,
    uint256[] memory _payedAmounts
) public returns (uint128)
```
- Adds a new batch of cake ingredients (expenses) to a cake
- Parameters:
  - `_cakeId`: The ID of the cake
  - `_weights`: Array of payment weights per member (same order as Cake.memberIds)
  - `_payerIds`: Array of user IDs that are payers
  - `_payedAmounts`: Array of amounts that each payer paid
- Returns the new batched ingredients ID (uint128)
- Emits `BatchedCakeIngredientsAdded` event
- Note: Currently marked as TODO in implementation

**cutCake**
```solidity
function cutCake(uint128 _cakeId) public payable
```
- Cuts a cake and updates the balances of all members based on cumulative batched ingredients since last cut
- Parameters:
  - `_cakeId`: The ID of the cake to cut
- Updates `currentBalances` for each member based on weights and paid amounts
- Updates `lastCutAt` and `lastCutBatchedIngredientsId`
- Emits `CakeCutted` event
- Note: Currently marked as TODO in implementation

**voteToDisableCake**
```solidity
function voteToDisableCake(uint128 _cakeId, bool _vote) public
```
- Votes to disable or keep active a cake
- Parameters:
  - `_cakeId`: The ID of the cake
  - `_vote`: True to vote to disable, false to vote to keep active
- If half or more of the members vote to disable, the cake is disabled
- Updates the `votesToDisable` array and `active` status
- Note: Currently marked as TODO in implementation

**payCakeSlice**
```solidity
function payCakeSlice(uint128 _cakeId) public payable
```
- Pays the amount owed by the caller to the cake
- Parameters:
  - `_cakeId`: The ID of the cake
- Reduces the caller's balance in `currentBalances`
- Note: Currently marked as TODO in implementation

**claimCakeSlice**
```solidity
function claimCakeSlice(uint128 _cakeId) public payable
```
- Claims the slice of the cake that the caller is owed (negative balance)
- Parameters:
  - `_cakeId`: The ID of the cake
- Transfers funds to the caller if they have a negative balance (are owed money)
- Note: Currently marked as TODO in implementation

#### View Functions

**isMember**
```solidity
function isMember(uint128 _cakeId, uint64 _memberId) public view returns (bool)
```
- Checks if a member ID is a member of a cake
- Parameters:
  - `_cakeId`: The ID of the cake
  - `_memberId`: The ID of the member to check
- Returns true if the member is a member of the cake
- Note: Currently marked as TODO in implementation

**getCakeDetails**
```solidity
function getCakeDetails(uint128 _cakeId) public view returns (
    uint64[] memory memberIds,
    uint256[] memory currentBalances,
    uint16 interestRate,
    bool active,
    address token,
    uint64 lastCutAt,
    uint64 lastCutBatchedIngredientsId
)
```
- Gets detailed information about a cake
- Returns: member IDs, current balances, interest rate, active status, token address, last cut timestamp, and last cut batched ingredients ID

**getCakeMembers**
```solidity
function getCakeMembers(uint128 _cakeId) public view returns (uint64[] memory)
```
- Gets all member IDs of a cake
- Parameters:
  - `_cakeId`: The ID of the cake
- Returns array of user IDs (uint64), not addresses

**getCakeIngredientDetails**
```solidity
function getCakeIngredientDetails(uint128 _cakeId, uint64 _cakeIngredientId) public view returns (
    uint8[] memory weights,
    uint64[] memory payerIds,
    uint256[] memory payedAmounts
)
```
- Gets detailed information about a batched cake ingredient
- Parameters:
  - `_cakeId`: ID of the cake
  - `_cakeIngredientId`: ID of the batched ingredient 
- Returns: weights, payer IDs, and paid amounts

**getCakeMemberBalance**
```solidity
function getCakeMemberBalance(uint128 _cakeId, uint64 _memberId) public view returns (uint256)
```
- Gets the current balance of a specific member in a cake
- Parameters:
  - `_cakeId`: ID of the cake
  - `_memberId`: ID of the member
- Returns: Current balance (positive = owes money, negative = is owed money)


## Project Structure

```
rather-cake-pay/
├── hardhat/          # Smart contracts and deployment
│   ├── contracts/    # Solidity contracts
│   │   └── CakeFactory.sol  # Main contract for managing cakes and cake ingredients
│   ├── ignition/     # Hardhat Ignition deployment modules
│   ├── test/         # Contract tests
│   └── ...
├── frontend/         # TypeScript/Next.js full-stack application
│   ├── app/          # Next.js app directory
│   │   └── ...       # Frontend pages and components, server side database management
│   └── ...
└── README.md         # This file
```

## TODOs
- Add Integration to upload receipts 

## License

MIT
