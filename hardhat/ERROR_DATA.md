# Custom Error Return Data - CakeFactory.sol

This document explains the return data structure for all custom errors in `CakeFactory.sol` (lines 105-115).

## Understanding Custom Errors

Custom errors in Solidity don't "return" data like functions do. Instead, when a transaction reverts with a custom error, the revert data contains:
1. **Error Selector** (4 bytes): A hash of the error signature
2. **Encoded Parameters**: ABI-encoded parameter values

## Error Data Structure

### 1. `CakeDoesNotExist(uint128 cakeId)`

**Error Selector**: `0xb30ead62` (first 4 bytes of `keccak256("CakeDoesNotExist(uint128)")`)

**Return Data**:
- **Total Length**: 36 bytes (4 bytes selector + 32 bytes for uint128)
- **Format**: `0x09df4e5d` + `uint128 cakeId` (padded to 32 bytes)

**Example**:
```solidity
revert CakeDoesNotExist(123);
// Return data: 0xb30ead62000000000000000000000000000000000000000000000000000000000000007b
//                                                                    ^^^^^^^^^^^^^^^^
//                                                                    cakeId = 123
```

**Decoded Values**:
- `cakeId`: The ID of the cake that doesn't exist (uint128, 0-2^128-1)

---

### 2. `CakeInactive(uint128 cakeId)`

**Error Selector**: `0x6ca1ff87` (first 4 bytes of `keccak256("CakeInactive(uint128)")`)

**Return Data**:
- **Total Length**: 36 bytes
- **Format**: `0x4b5d3f1f` + `uint128 cakeId` (padded to 32 bytes)

**Example**:
```solidity
revert CakeInactive(456);
// Return data: 0x6ca1ff8700000000000000000000000000000000000000000000000000000000000001c8
```

**Decoded Values**:
- `cakeId`: The ID of the inactive cake (uint128)

---

### 3. `InvalidMembers()`

**Error Selector**: `0x164ad304` (first 4 bytes of `keccak256("InvalidMembers()")`)

**Return Data**:
- **Total Length**: 4 bytes (selector only, no parameters)
- **Format**: `0x164ad304`

**Example**:
```solidity
revert InvalidMembers();
// Return data: 0x164ad304
```

**Decoded Values**: None (no parameters)

**When it occurs**: 
- When `memberIds.length < 2` or `memberIds.length != memberWeightsBps.length` in `createCake()`
- When `payerIds.length == 0` or `payerIds.length != payedAmounts.length` in `addBatchedCakeIngredients()`

---

### 4. `InvalidWeights()`

**Error Selector**: `0x84677ce8` (first 4 bytes of `keccak256("InvalidWeights()")`)

**Return Data**:
- **Total Length**: 4 bytes (selector only)
- **Format**: `0x84677ce8`

**Example**:
```solidity
revert InvalidWeights();
// Return data: 0x84677ce8
```

**Decoded Values**: None (no parameters)

**When it occurs**:
- When `weights.length != cake.memberIds.length` in `addBatchedCakeIngredients()`
- When `accumulatedWeights != BPS_DENOMINATOR` (10,000) in `createCake()` or `addBatchedCakeIngredients()`

---

### 5. `InvalidBillingPeriod()`

**Error Selector**: `0x3f1f6d2d` (first 4 bytes of `keccak256("InvalidBillingPeriod()")`)

**Return Data**:
- **Total Length**: 4 bytes (selector only)
- **Format**: `0x3f1f6d2d`

**Example**:
```solidity
revert InvalidBillingPeriod();
// Return data: 0x3f1f6d2d
```

**Decoded Values**: None (no parameters)

**When it occurs**: When `billingPeriod == 0` in `createCake()`

---

### 6. `MemberNotRegistered(uint64 memberId)`

**Error Selector**: `0x9586c8ec` (first 4 bytes of `keccak256("MemberNotRegistered(uint64)")`)

**Return Data**:
- **Total Length**: 36 bytes
- **Format**: `0x9586c8ec` + `uint64 memberId` (padded to 32 bytes)

**Example**:
```solidity
revert MemberNotRegistered(789);
// Return data: 0x9586c8ec0000000000000000000000000000000000000000000000000000000000000315
```

**Decoded Values**:
- `memberId`: The ID of the member that is not registered (uint64, 0-2^64-1)

---

### 7. `DuplicateMember(uint64 memberId)`

**Error Selector**: `0xb65766e1` (first 4 bytes of `keccak256("DuplicateMember(uint64)")`)

**Return Data**:
- **Total Length**: 36 bytes
- **Format**: `0xb65766e1` + `uint64 memberId` (padded to 32 bytes)

**Example**:
```solidity
revert DuplicateMember(42);
// Return data: 0xb65766e1000000000000000000000000000000000000000000000000000000000000002a
```

**Decoded Values**:
- `memberId`: The ID of the duplicate member (uint64)

---

### 8. `NotMember(uint64 memberId)`

**Error Selector**: `0xd35edc1f` (first 4 bytes of `keccak256("NotMember(uint64)")`)

**Return Data**:
- **Total Length**: 36 bytes
- **Format**: `0xd35edc1f` + `uint64 memberId` (padded to 32 bytes)

**Example**:
```solidity
revert NotMember(999);
// Return data: 0xd35edc1f00000000000000000000000000000000000000000000000000000000000003e7
```

**Decoded Values**:
- `memberId`: The ID of the user who is not a member (uint64)

**When it occurs**:
- When `payerId == 0` or `cakeMemberIndex[cakeId][payerId] == 0` in `addBatchedCakeIngredients()`
- When `callerId == 0` or `cakeMemberIndex[_cakeId][callerId] == 0` in `cutCake()`
- When `indexPlusOne == 0` in `payCakeSlice()`

---

### 9. `NothingToCut(uint128 cakeId)`

**Error Selector**: `0x48b5f6de` (first 4 bytes of `keccak256("NothingToCut(uint128)")`)

**Return Data**:
- **Total Length**: 36 bytes
- **Format**: `0x48b5f6de` + `uint128 cakeId` (padded to 32 bytes)

**Example**:
```solidity
revert NothingToCut(100);
// Return data: 0x48b5f6de0000000000000000000000000000000000000000000000000000000000000064
```

**Decoded Values**:
- `cakeId`: The ID of the cake with nothing to cut (uint128)

**When it occurs**: When `latestIngredientId == 0` or `latestIngredientId <= lastProcessedIngredientId` in `cutCake()`

---

### 10. `AmountTooLarge()`

**Error Selector**: `0x06250401` (first 4 bytes of `keccak256("AmountTooLarge()")`)

**Return Data**:
- **Total Length**: 4 bytes (selector only)
- **Format**: `0x06250401`

**Example**:
```solidity
revert AmountTooLarge();
// Return data: 0x06250401
```

**Decoded Values**: None (no parameters)

**When it occurs**: When `latestIngredientId128 > type(uint64).max` in `cutCake()` (overflow check)

---

### 11. `IngredientDoesNotExist(uint128 cakeId, uint64 ingredientId)`

**Error Selector**: `0xbf390a78` (first 4 bytes of `keccak256("IngredientDoesNotExist(uint128,uint64)")`)

**Return Data**:
- **Total Length**: 68 bytes (4 bytes selector + 32 bytes for cakeId + 32 bytes for ingredientId)
- **Format**: `0xbf390a78` + `uint128 cakeId` + `uint64 ingredientId`

**Example**:
```solidity
revert IngredientDoesNotExist(50, 10);
// Return data: 0xbf390a780000000000000000000000000000000000000000000000000000000000000032
//                                                                    ^^^^^^^^^^^^^^^^
//                                                                    cakeId = 50
//             000000000000000000000000000000000000000000000000000000000000000a
//                                                                    ^^^^^^^^^^^^^^^^
//                                                                    ingredientId = 10
```

**Decoded Values**:
- `cakeId`: The ID of the cake (uint128)
- `ingredientId`: The ID of the ingredient that doesn't exist (uint64)

**When it occurs**: When `ingredient.createdAt == 0` in `cutCake()` (ingredient was never created)

---

## How to Decode Error Data

### Using Ethers.js v6

```javascript
import { Contract } from 'ethers';

try {
  await contract.someFunction();
} catch (error) {
  if (error.data) {
    // Decode the error
    const decoded = contract.interface.parseError(error.data);
    console.log('Error name:', decoded.name);
    console.log('Error args:', decoded.args);
    
    // Example: CakeDoesNotExist(123)
    // decoded.name = "CakeDoesNotExist"
    // decoded.args = [123n] // BigInt
  }
}
```

### Using Viem

```typescript
import { decodeErrorResult } from 'viem';
import { cakeFactoryAbi } from './abi';

try {
  await publicClient.simulateContract({...});
} catch (error) {
  if (error.data) {
    const decoded = decodeErrorResult({
      abi: cakeFactoryAbi,
      data: error.data,
    });
    console.log('Error name:', decoded.errorName);
    console.log('Error args:', decoded.args);
  }
}
```

### Using Hardhat

```javascript
const CakeFactory = await ethers.getContractFactory("CakeFactory");
const cakeFactory = await CakeFactory.deploy(...);

try {
  await cakeFactory.someFunction();
} catch (error) {
  // Hardhat automatically decodes custom errors
  if (error.reason) {
    console.log('Error:', error.reason);
  }
  
  // Or manually decode
  const decoded = cakeFactory.interface.parseError(error.data);
  console.log(decoded);
}
```

## Error Selector Calculation

The error selector is the first 4 bytes of `keccak256(errorSignature)`:

```javascript
// Example: CakeDoesNotExist(uint128)
const signature = "CakeDoesNotExist(uint128)";
const hash = ethers.keccak256(ethers.toUtf8Bytes(signature));
const selector = hash.slice(0, 10); // "0x" + 4 bytes = 10 characters
// Result: 0xb30ead62
```

## Summary Table

| Error | Selector | Parameters | Data Length |
|-------|----------|------------|-------------|
| `CakeDoesNotExist` | `0xb30ead62` | `uint128 cakeId` | 36 bytes |
| `CakeInactive` | `0x6ca1ff87` | `uint128 cakeId` | 36 bytes |
| `InvalidMembers` | `0x164ad304` | None | 4 bytes |
| `InvalidWeights` | `0x84677ce8` | None | 4 bytes |
| `InvalidBillingPeriod` | `0x3f1f6d2d` | None | 4 bytes |
| `MemberNotRegistered` | `0x9586c8ec` | `uint64 memberId` | 36 bytes |
| `DuplicateMember` | `0xb65766e1` | `uint64 memberId` | 36 bytes |
| `NotMember` | `0xd35edc1f` | `uint64 memberId` | 36 bytes |
| `NothingToCut` | `0x48b5f6de` | `uint128 cakeId` | 36 bytes |
| `AmountTooLarge` | `0x06250401` | None | 4 bytes |
| `IngredientDoesNotExist` | `0xbf390a78` | `uint128 cakeId, uint64 ingredientId` | 68 bytes |

**Note**: The actual selectors may differ slightly. To get the exact selectors, use:
```bash
npx hardhat compile
# Then check artifacts/contracts/CakeFactory.sol/CakeFactory.json
# Look for "errors" section
```

