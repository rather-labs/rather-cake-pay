// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;


// Uniswap v4 
import { UniversalRouter } from "@uniswap/universal-router/contracts/UniversalRouter.sol";
import { Commands } from "@uniswap/universal-router/contracts/libraries/Commands.sol";
import { IPoolManager } from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import { IV4Router } from "@uniswap/v4-periphery/src/interfaces/IV4Router.sol";
import { Actions } from "@uniswap/v4-periphery/src/libraries/Actions.sol";
import { IPermit2 } from "@uniswap/permit2/src/interfaces/IPermit2.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { StateLibrary } from "@uniswap/v4-core/src/libraries/StateLibrary.sol";

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";


/**
 * @title CakeFactory
 * @notice Manages groups of people (cakes) and their shared cake ingredients
 * @author @jbeliera-rather
 * @dev Each cake represents a group that can split bills and manage cake ingredients
 */
contract CakeFactory is Ownable {

    using SafeERC20 for IERC20;

    // Assets for using Uniswap v4
    using StateLibrary for IPoolManager;
    using PoolIdLibrary for PoolKey;
    UniversalRouter public immutable router;
    IPoolManager public immutable poolManager;
    IPermit2 public immutable permit2;

    mapping(address => mapping(address => PoolKey)) public tokenPairPoolKeys;

    // Struct to represent a group (cake)
    struct Cake {
        uint64 createdAt; // Timestamp of cake creation (64-bit, valid until 2106)
        uint64 lastCutAt; // Timestamp of last cake cut (64-bit, valid until 2106)
        uint64 lastCutBatchedIngredientsId; // ID of last batched ingredients included in a cut
        uint128 latestIngredientId; // Last ingredient ID added to the cake
        uint64 billingPeriod; // Duration between expected settlements
        uint64 nextDueAt; // Timestamp for the next expected settlement
        uint16 interestRate; // Interest rate for unpaid amounts in this cake
        bool active; // Whether the cake is active, half or more of members can disable the cake
        address token; // Token address
        bool[] votesToDisable; // Current Votes to disable the cake
        uint64[] memberIds; // Array of user IDs in the cake
        uint16[] memberWeights; // Payment weights per member (same order as memberIds)
        int256[] currentBalances; // Current ammounts to be paid by each member
    }

    // Struct to represent off-chain batched cake ingredients (expense) within a cake
    struct BatchedCakeIngredients {
        uint64 createdAt; // Timestamp of batched ingredients creation (64-bit, valid until 2106)
        uint16[] weights; // Payment weights per member (same order as Cake.memberIds), all the weights must coincide (this has to be done correctly off-chain)
        uint64[] payerIds; // User IDs of payers
        uint256[] payedAmounts; // Amounts paid by each payer
    }

    // There is no save in using uint lower than 256 in the mappings
    // It's done for coherence with structs where there is a gain

    // Mapping of users ids in the application
    mapping(address => uint64) public userIds;

    // Mapping of users addresses in the application
    mapping(uint64 => address) public userAddresses;

    // Mapping from cake ID to Cake struct
    mapping(uint128 => Cake) public cakes;

    // Mapping for cake id to its ingredients
    // Nested mapping: cake ID -> batched ingredient ID (uint64) -> batched ingredients struct
    mapping(uint128 => mapping(uint64 => BatchedCakeIngredients)) public batchedIngredientsPerCake;

    // Mapping from user Ids to mapping of cakes its participating in and where it has debts to the cake
    mapping(uint64 => mapping(uint128 => bool)) public userCakes;
    // Mapping from user ID to the list of cake IDs they belong to
    mapping(uint64 => uint128[]) private userCakeIds;
    // Mapping from cake ID to mapping of member ID to member index in cake arrays
    mapping(uint128 => mapping(uint64 => uint64)) public cakeMemberIndex; // quick lookup for member index in cake arrays

    // Total number of users registered
    uint64 public totalUsers;

    // Total number of cakes created
    uint128 public totalCakes;

    // Total number of batched cake ingredients created
    uint128 public totalBatchedCakeIngredients;

    // Events
    event CakeCreated(uint128 indexed cakeId);
    event BatchedCakeIngredientsAdded(uint128 indexed batchedCakeIngredientsId, uint128 indexed cakeId);
    event CakeCutted(uint128 indexed cakeId);

    error CakeDoesNotExist(uint128 cakeId);
    error CakeInactive(uint128 cakeId);
    error InvalidMembers();
    error InvalidWeights();
    error InvalidBillingPeriod();
    error MemberNotRegistered(uint64 memberId);
    error DuplicateMember(uint64 memberId);
    error NotMember(uint64 memberId);
    error NothingToCut(uint128 cakeId);
    error AmountTooLarge();
    error IngredientDoesNotExist(uint128 cakeId, uint64 ingredientId);

    uint16 private constant BPS_DENOMINATOR = 10_000;
    event CakeSlicePaid(uint128 indexed cakeId, uint64 indexed userId, uint256 amount);
    event CakeSliceClaimed(uint128 indexed cakeId, uint64 indexed userId, uint256 amount);
    event CakeDisabled(uint128 indexed cakeId);
    event CakeEnabled(uint128 indexed cakeId);

    /**
     * @notice Initializes the contract
     * @dev This function can only be called once during deployment
     */
    constructor(address _router, address _poolManager, address _permit2) {
        // Uniswap v4
        router = UniversalRouter(payable(_router));
        poolManager = IPoolManager(_poolManager);
        permit2 = IPermit2(_permit2);
        // Initialize total counters
        totalCakes = 0;
        totalBatchedCakeIngredients = 0;
        totalUsers = 0;
    }

    /**
     * @notice Registers a new user or returns existing user ID
     * @param userAddress The address of the user to register
     * @return The user ID (existing or newly created)
     */
    function registerUser(address userAddress) public returns (uint64) {
        // Check if user already exists
        if (userIds[userAddress] != 0) {
            return userIds[userAddress];
        }

        // Register new user
        totalUsers++;
        userIds[userAddress] = totalUsers;
        userAddresses[totalUsers] = userAddress;

        return totalUsers;
    }

    /**
     * @notice Creates a new cake (group)
     * @param token address of the token that will be used to pay for the cake
     * @param memberIds array of user ids that will be members of the cake
     * @param memberWeightsBps weights per member in basis points (must sum to 10,000)
     * @param interestRate interest rate for unpaid ammounts of the cake
     * @return The ID of the newly created cake
     */
    function createCake(
        address token,
        uint64[] memory memberIds,
        uint16[] memory memberWeightsBps,
        uint16 interestRate,
        uint64 billingPeriod
    ) public returns (uint128) {
        if (memberIds.length < 2 || memberIds.length != memberWeightsBps.length) {
            revert InvalidMembers();
        }
        if (billingPeriod == 0) {
            revert InvalidBillingPeriod();
        }

        uint256 accumulatedWeights;
        for (uint256 i = 0; i < memberWeightsBps.length; i++) {
            accumulatedWeights += memberWeightsBps[i];
        }
        if (accumulatedWeights != BPS_DENOMINATOR) {
            revert InvalidWeights();
        }

        totalCakes++;
        uint128 cakeId = totalCakes;
        Cake storage cake = cakes[cakeId];

        cake.createdAt = uint64(block.timestamp);
        cake.lastCutAt = uint64(block.timestamp);
        cake.lastCutBatchedIngredientsId = 0;
        cake.latestIngredientId = 0;
        cake.billingPeriod = billingPeriod;
        cake.nextDueAt = uint64(block.timestamp + billingPeriod);
        cake.interestRate = interestRate;
        cake.active = true;
        cake.token = token;

        cake.memberIds = new uint64[](memberIds.length);
        cake.memberWeights = new uint16[](memberIds.length);
        cake.currentBalances = new int256[](memberIds.length);
        cake.votesToDisable = new bool[](memberIds.length);

        for (uint256 i = 0; i < memberIds.length; i++) {
            uint64 memberId = memberIds[i];
            if (memberId == 0 || userAddresses[memberId] == address(0)) {
                revert MemberNotRegistered(memberId);
            }
            if (cakeMemberIndex[cakeId][memberId] != 0) {
                revert DuplicateMember(memberId);
            }

            cake.memberIds[i] = memberId;
            cake.memberWeights[i] = memberWeightsBps[i];
            cake.currentBalances[i] = 0;
            cakeMemberIndex[cakeId][memberId] = uint64(i + 1);
            userCakes[memberId][cakeId] = true; // mark that the user is part of this cake
            userCakeIds[memberId].push(cakeId); // how to track cakes per user
        }

        emit CakeCreated(cakeId);
        return cakeId;
    }

    /**
     * @notice Adds a new cake ingredient to a cake
     * @param cakeId The ID of the cake
     * @param weights array of weights for the batched cake ingredients
     * @param payerIds array of user ids that will be payers of the batched cake ingredients
     * @param payedAmounts array of amounts that each payer will pay for the batched cake ingredients
     * @return The ID of the newly created batched cake ingredients
     */
    function addBatchedCakeIngredients(
        uint128 cakeId,
        uint16[] memory weights,
        uint64[] memory payerIds,
        uint256[] memory payedAmounts
    ) public returns (uint128) {
        Cake storage cake = cakes[cakeId];
        //Check if cake exists
        if (cake.createdAt == 0) {
            revert CakeDoesNotExist(cakeId);
        }
        //Check if cake is active
        if (!cake.active) {
            revert CakeInactive(cakeId);
        }
        //Check if payerIds and payedAmounts are valid
        if (payerIds.length == 0 || payerIds.length != payedAmounts.length) {
            revert InvalidMembers();
        }

        // Determine effective weights
        uint16[] memory effectiveWeights;
        if (weights.length == 0) {
            uint256 memberCount = cake.memberWeights.length;
            effectiveWeights = new uint16[](memberCount);
            for (uint256 i = 0; i < memberCount; i++) {
                effectiveWeights[i] = cake.memberWeights[i];
            }
        } else {
            if (weights.length != cake.memberIds.length) {
                revert InvalidWeights();
            }
            uint256 weightSum;
            for (uint256 i = 0; i < weights.length; i++) {
                weightSum += weights[i];
            }
            if (weightSum != BPS_DENOMINATOR) {
                revert InvalidWeights();
            }
            effectiveWeights = weights;
        }

        // Validate that all payerIds are members of the cake
        for (uint256 i = 0; i < payerIds.length; i++) {
            uint64 payerId = payerIds[i];
            if (payerId == 0 || cakeMemberIndex[cakeId][payerId] == 0) {
                revert NotMember(payerId);
            }
        }

        cake.latestIngredientId += 1;
        uint64 ingredientId = uint64(cake.latestIngredientId);
        totalBatchedCakeIngredients++;

        // populate the batched cake ingredients and save it in the mapping
        BatchedCakeIngredients storage ingredient = batchedIngredientsPerCake[cakeId][ingredientId];
        ingredient.createdAt = uint64(block.timestamp);
        ingredient.weights = effectiveWeights;
        ingredient.payerIds = payerIds;
        ingredient.payedAmounts = payedAmounts;

        emit BatchedCakeIngredientsAdded(ingredientId, cakeId);
        return ingredientId;
    }

    /**
     * @notice Cuts a cake and updates the balances of the members
     * @param _cakeId The ID of the cake
     */
    function cutCake(uint128 _cakeId) public payable {
        //Check if cake exists
        Cake storage cake = cakes[_cakeId];
        if (cake.createdAt == 0) {
            revert CakeDoesNotExist(_cakeId);
        }
        if (!cake.active) {
            revert CakeInactive(_cakeId);
        }
        // Obtain caller's user ID: this function is called every billing period.
        uint64 callerId = userIds[msg.sender];
        if (callerId == 0 || cakeMemberIndex[_cakeId][callerId] == 0) {
            revert NotMember(callerId);
        }
        // Determine the range of ingredients to process
        uint64 lastProcessedIngredientId = cake.lastCutBatchedIngredientsId;
        uint128 latestIngredientId128 = cake.latestIngredientId;
        if (latestIngredientId128 == 0 || latestIngredientId128 <= lastProcessedIngredientId) {
            revert NothingToCut(_cakeId);
        }
        //Check for overflow
        if (latestIngredientId128 > type(uint64).max) {
            revert AmountTooLarge();
        }
        uint64 latestIngredientId = uint64(latestIngredientId128);

        _accrueInterest(cake);

        for (uint64 ingredientId = lastProcessedIngredientId + 1; ingredientId <= latestIngredientId; ingredientId++) {
            BatchedCakeIngredients storage ingredient = batchedIngredientsPerCake[_cakeId][ingredientId];
            if (ingredient.createdAt == 0) {
                revert IngredientDoesNotExist(_cakeId, ingredientId);
            }
            //Update balances with the ingredient
            _applyIngredient(_cakeId, cake, ingredient);
        }

        cake.lastCutAt = uint64(block.timestamp);
        cake.lastCutBatchedIngredientsId = latestIngredientId;
        cake.nextDueAt = uint64(block.timestamp + cake.billingPeriod);

        emit CakeCutted(_cakeId);
    }

    function _applyIngredient(uint128 cakeId, Cake storage cake, BatchedCakeIngredients storage ingredient) internal {
        //Validate ingredient
        uint256 memberCount = cake.memberIds.length;
        if (ingredient.weights.length != memberCount) {
            revert InvalidWeights();
        }
        //Check payers
        uint256 payerCount = ingredient.payerIds.length;
        if (payerCount == 0 || payerCount != ingredient.payedAmounts.length) {
            revert InvalidMembers();
        }
        //Sum total amount paid
        uint256 totalAmount;
        for (uint256 i = 0; i < payerCount; i++) {
            totalAmount += ingredient.payedAmounts[i];
        }
        //Update balances
        for (uint256 i = 0; i < memberCount; i++) {
            uint256 memberShare = (totalAmount * ingredient.weights[i]) / BPS_DENOMINATOR;
            cake.currentBalances[i] += _toInt256(memberShare);
        }
        //Subtract payed amounts from payers
        for (uint256 i = 0; i < payerCount; i++) {
            uint64 payerId = ingredient.payerIds[i];
            // Find member index in the cake
            uint64 indexPlusOne = cakeMemberIndex[cakeId][payerId];
            if (indexPlusOne == 0) {
                revert NotMember(payerId);
            }
            uint256 memberIdx = uint256(indexPlusOne - 1);
            cake.currentBalances[memberIdx] -= _toInt256(ingredient.payedAmounts[i]);
        }
    }

    function _accrueInterest(Cake storage cake) internal {
        //Check if interest applies
        if (cake.interestRate == 0 || cake.billingPeriod == 0) {
            return;
        }
        //Check for overdue
        if (block.timestamp <= cake.nextDueAt) {
            return;
        }

        uint256 overdueTime = block.timestamp - cake.nextDueAt;
        uint256 periodsLate = overdueTime / cake.billingPeriod;
        // Add an extra period if there is a remainder
        if (overdueTime % cake.billingPeriod != 0) {
            periodsLate += 1;
        }
        // Add at least one period
        if (periodsLate == 0) {
            periodsLate = 1;
        }

        for (uint256 i = 0; i < cake.currentBalances.length; i++) {
            int256 balance = cake.currentBalances[i];
            // Check if balance is positive, if it is negative or zero, skip interest accrual
            // Positive balance means the member owes money to the cake
            if (balance <= 0) {
                continue;
            }
            uint256 principal = uint256(balance);
            uint256 interest = (principal * cake.interestRate * periodsLate) / BPS_DENOMINATOR;
            cake.currentBalances[i] = balance + _toInt256(interest);
        }
    }

    function _toInt256(uint256 value) internal pure returns (int256) {
        if (value > uint256(type(int256).max)) {
            revert AmountTooLarge();
        }
        return int256(value);
    }

    // /**
    //  * @notice Votes to disable a cake
    //  * @param _cakeId The ID of the cake
    //  * @param _vote True to vote to disable the cake, false to vote to keep the cake active
    //  */
    // function voteToDisableCake(uint128 _cakeId, bool _vote) public {
    //     // If half or more of the members have voted to disable the cake, the cake is disabled
    //     // TODO: Implement
    // }

    /**
     * @notice Checks if an address is a member of a cake
     * @param cakeId The ID of the cake
     * @param memberId The ID of the member
     * @return True if the member is a member of the cake
     */
    function isMember(uint128 cakeId, uint64 memberId) public view returns (bool) {
        // Check if the memberId exists in the cakeMemberIndex mapping for the given cakeId
        return cakeMemberIndex[cakeId][memberId] != 0;
    }

    /**
     * @notice Pays the ammount owed by the caller to the cake
     * @param cakeId The ID of the cake
     * @param token The token to pay with
     * @dev TODO: currently not limiting maximum amount to swap in
     * @dev TODO: separate the logic of paying with ETH and ERC20
     */
    function payCakeSlice(uint128 cakeId, IERC20 token) public nonReentrant payable {
        require(userIds[msg.sender] != 0, "User not registered");
        
        uint256 userBalance = cakes[cakeId].currentBalances[userIds[msg.sender]];
        require(userBalance < 0, "User has no debt in the cake to pay");

        cakes[cakeId].currentBalances[userIds[msg.sender]] = 0;  

        if (token != cakes[cakeId].token) {
            PoolKey memory key = getPoolKey(token, cakes[cakeId].token);
            require(key.currency0 != address(0) && key.currency1 != address(0), "Pool not configured");
            bool zeroForOne = token < cakes[cakeId].token;
            _swapExactOutputSingle(key, zeroForOne, -userBalance, type(uint256).max);
        } 

        if (token == address(0)) {
            require(msg.value >= -userBalance, "Insufficient ETH sent");
        } else {
            IERC20(token).safeTransferFrom(msg.sender, address(this), -userBalance);
        }

        emit CakeSlicePaid(cakeId, userIds[msg.sender], -userBalance);

    }

    /**
     * @notice Claims the slice of the cake that the caller is owed
     * @param cakeId The ID of the cake
     */
    function claimCakeSlice(uint128 cakeId) public nonReentrant {
        require(userIds[msg.sender] != 0, "User not registered");
        
        uint256 userBalance = cakes[cakeId].currentBalances[userIds[msg.sender]];
        require(userBalance > 0, "User has no credit in the cake to claim");

        cakes[cakeId].currentBalances[userIds[msg.sender]] = 0;  

        if (token != cakes[cakeId].token) {
            require(key.currency0 != address(0) && key.currency1 != address(0), "Pool not configured");
            PoolKey memory key = getPoolKey(token, cakes[cakeId].token);
            bool zeroForOne = token < cakes[cakeId].token;
            _swapExactInputSingle(key, zeroForOne, userBalance, type(uint256).max);
        } 

        if (token == address(0)) {
            require(msg.value >= userBalance, "Insufficient ETH sent");
        } else {
            IERC20(token).safeTransferFrom(address(this), msg.sender, userBalance);
        }
    
        emit CakeSliceClaimed(cakeId, userIds[msg.sender], userBalance);
    }

    /**
     * @notice Gets the high-level details of a cake
     * @param cakeId The ID of the cake
     * @return memberIds Array of member IDs in the cake
     * @return currentBalances Current balances for each member (same order as memberIds)
     * @return interestRate Interest rate for unpaid amounts (in BPS)
     * @return active Whether the cake is currently active
     * @return token Token contract address (0x0 for native ETH)
     */
    function getCakeDetails(
        uint128 cakeId
    )
        public
        view
        returns (
            uint64[] memory memberIds,
            int256[] memory currentBalances,
            uint16 interestRate,
            bool active,
            address token
        )
    {
        Cake storage cake = cakes[cakeId];
        if (cake.createdAt == 0) {
            revert CakeDoesNotExist(cakeId);
        }

        return (cake.memberIds, cake.currentBalances, cake.interestRate, cake.active, cake.token);
    }

    /**
     * @notice Gets all members of a cake
     * @param cakeId The ID of the cake
     * @return Array of member ids
     */
    function getCakeMembers(uint128 cakeId) public view returns (uint64[] memory) {
        Cake storage cake = cakes[cakeId];
        if (cake.createdAt == 0) {
            revert CakeDoesNotExist(cakeId);
        }
        return cake.memberIds;
    }

    /**
     * @notice Gets cake ingredient details
     * @param cakeId ID of the cake
     * @param ingredientId The ID of the cake ingredient
     * @return weights Weights for the batched cake ingredients
     * @return payerIds IDs of the payers
     * @return payedAmounts Amounts paid by each payer
     * @return createdAt Timestamp when the ingredient was registered
     */
    function getCakeIngredientDetails(
        uint128 cakeId,
        uint64 ingredientId
    )
        public
        view
        returns (uint16[] memory weights, uint64[] memory payerIds, uint256[] memory payedAmounts, uint64 createdAt)
    {
        Cake storage cake = cakes[cakeId];
        //Check if cake exists
        if (cake.createdAt == 0) {
            revert CakeDoesNotExist(cakeId);
        }

        //Check if ingredient exists
        BatchedCakeIngredients storage ingredient = batchedIngredientsPerCake[cakeId][ingredientId];
        if (ingredient.createdAt == 0) {
            revert IngredientDoesNotExist(cakeId, ingredientId);
        }

        return (ingredient.weights, ingredient.payerIds, ingredient.payedAmounts, ingredient.createdAt);
    }

    /**
     * @notice Gets the current balance of a member in a cake
     * @param cakeId ID of the cake
     * @param memberId ID of the member
     * @return Current balance of the member
     */
    function getCakeMemberBalance(uint128 cakeId, uint64 memberId) public view returns (int256) {
        Cake storage cake = cakes[cakeId];
        if (cake.createdAt == 0) {
            revert CakeDoesNotExist(cakeId);
        }

        uint64 indexPlusOne = cakeMemberIndex[cakeId][memberId];
        if (indexPlusOne == 0) {
            revert NotMember(memberId);
        }

        return cake.currentBalances[uint256(indexPlusOne - 1)];
    }

    /**
     * @notice Gets the user ID for a given address
     * @param userAddress The address to look up
     * @return The user ID (0 if not registered)
     */
    function getUserId(address userAddress) public view returns (uint64) {
        return userIds[userAddress];
    }

    /**
     * @notice Gets the address for a given user ID
     * @param userId The user ID to look up
     * @return The user address (address(0) if not found)
     */
    function getUserAddress(uint64 userId) public view returns (address) {
        return userAddresses[userId];
    }

    /**
     * @notice Gets every cake where the user participates
     * @param userId The ID of the user
     * @return Array of cake IDs the user belongs to
     */
    function getUserCakes(uint64 userId) external view returns (uint128[] memory) {
        if (userAddresses[userId] == address(0)) {
            revert MemberNotRegistered(userId);
        }
        return userCakeIds[userId];
    }
    /**
     * @notice Returns the member roster plus their payment weights (same ordering).
     * @dev Reverts if the cake doesn’t exist or its metadata arrays diverge.
     * @param cakeId ID of the cake to inspect
     * @return memberIds Array of member IDs in roster order
     * @return memberWeights Array of weight BPS aligned with memberIds
     */
    function getCakeMemberConfig(
        uint128 cakeId
    ) external view returns (uint64[] memory memberIds, uint16[] memory memberWeights) {
        Cake storage cake = cakes[cakeId];
        if (cake.createdAt == 0) {
            revert CakeDoesNotExist(cakeId);
        }
        if (cake.memberIds.length != cake.memberWeights.length) {
            revert InvalidMembers();
        }
        return (cake.memberIds, cake.memberWeights);
    }
    /**
     * UNISWAP V4 LOGIC
     */

     /**
     * @notice Get pool key for a given pair
     * @param token0 The first token
     * @param token1 The second token
     * @return The pool key
     */
    function getPoolKey(address token0, address token1) public view returns (PoolKey memory) {
        if token0 > token1 {
            (token0, token1) = (token1, token0);
        }
        return tokenPairPoolKeys[token0][token1];
    }

     /**
     * @notice Store pool key for a given pair
     * @param token0 The first token
     * @param token1 The second token
     */
    function storePoolKey(address token0, address token, PoolKey memory poolKey) public OnlyOwner {
        if token0 > token1 {
            (token0, token1) = (token1, token0);
        }
        tokenPairPoolKeys[token0][token1] = poolKey;
    }
    

    /**
     * @notice Approves the router to spend the token with Permit2
     * @param token The token to approve
     * @param amount The amount to approve
     * @param expiration The expiration time
     */
    function _approveTokenWithPermit2(
	    address token,
	    uint160 amount,
	    uint48 expiration
    ) internal {
        IERC20(token).approve(address(permit2), amount);
        permit2.approve(token, address(router), amount, expiration);
    }

    /**
     * @notice Executes a swap that returns exact output amount
     * @param key The pool key
     * @param zeroForOne The direction of the swap
     * @param amountOut The desired amount to swap
     * @param maxAmountIn The maximum amount to swap
     * @return amountIn The amount of input currency spent
     * @dev Using single-hop. TODO: Implement multi-hop swaps.
     */
    function _swapExactOutputSingle(
        PoolKey calldata key,
        bool zeroForOne,
        uint128 amountOut,
        uint128 maxAmountIn
    ) internal returns (uint256 amountIn) {
        // Encode the Universal Router command
        bytes memory commands = abi.encodePacked(uint8(Commands.V4_SWAP));
        bytes[] memory inputs = new bytes[](1);
    
        // Encode V4Router actions
        bytes memory actions = abi.encodePacked(
            uint8(Actions.SWAP_EXACT_OUT_SINGLE),
            uint8(Actions.SETTLE_ALL),
            uint8(Actions.TAKE_ALL)
        );
    
        if (ZeroForOne) { 
            inputCurrency = key.currency0;
            outputCurrency = key.currency1;
        } else {
            inputCurrency = key.currency1;
            outputCurrency = key.currency0;
        }

        // Prepare parameters for each action
        bytes[] memory params = new bytes[](3);
        params[0] = abi.encode(
            IV4Router.ExactInputSingleParams({
                poolKey: key,
                zeroForOne: zeroForOne,
                amountOut: amountOut,
                amountInMaximum: maxAmountIn,
                hookData: bytes("")
            })
        );

        // Deadline for the swap
        uint256 deadline = block.timestamp + 300; // 5 minutes

        params[1] = abi.encode(inputCurrency, maxAmountIn);
        params[2] = abi.encode(outputCurrency, amountOut);
        _approveTokenWithPermit2(inputCurrency, maxAmountIn, deadline);
    
        // Combine actions and params into inputs
        inputs[0] = abi.encode(actions, params);

        balancePreSwap = inputCurrency.balanceOf(address(this));
    
        // Execute the swap
        router.execute(commands, inputs, deadline);

        return inputCurrency.balanceOf(address(this)) - balancePreSwap;
    }

    /**
     * @notice Executes a swap with exact input amount 
     * @param key The pool key
     * @param zeroForOne The direction of the swap
     * @param amountIn The amount to swap
     * @param minAmountOut The minimum amount to swap
     * @return amountOut The amount of output currency received
     * @dev Using single-hop. TODO: Implement multi-hop swaps.
     */
    function _swapExactInputSingle(
        PoolKey calldata key,
        bool zeroForOne,
        uint128 amountIn,
        uint128 minAmountOut
    ) internal returns (uint256 amountOut) {
        // Encode the Universal Router command
        bytes memory commands = abi.encodePacked(uint8(Commands.V4_SWAP));
        bytes[] memory inputs = new bytes[](1);
    
        // Encode V4Router actions
        bytes memory actions = abi.encodePacked(
            uint8(Actions.SWAP_EXACT_IN_SINGLE),
            uint8(Actions.SETTLE_ALL),
            uint8(Actions.TAKE_ALL)
        );


        if (ZeroForOne) { 
            inputCurrency = key.currency0;
            outputCurrency = key.currency1;
        } else {
            inputCurrency = key.currency1;
            outputCurrency = key.currency0;
        }
    
        // Prepare parameters for each action
        bytes[] memory params = new bytes[](3);
        params[0] = abi.encode(
            IV4Router.ExactInputSingleParams({
                poolKey: key,
                zeroForOne: zeroForOne,
                amountIn: amountIn,
                amountOutMinimum: minAmountOut,
                hookData: bytes("")
            })
        );

        // Deadline for the swap
        uint256 deadline = block.timestamp + 300; // 5 minutes

        params[1] = abi.encode(inputCurrency, amountIn);
        params[2] = abi.encode(outputCurrency, minAmountOut);
        _approveTokenWithPermit2(inputCurrency, amountIn, deadline);
    
        // Combine actions and params into inputs
        inputs[0] = abi.encode(actions, params);
        
        balancePreSwap = outputCurrency.balanceOf(address(this));
    
        // Execute the swap
        router.execute(commands, inputs, deadline);


        return outputCurrency.balanceOf(address(this)) - balancePreSwap;
    }


}
