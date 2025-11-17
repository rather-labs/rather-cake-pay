// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title CakeFactory
 * @notice Manages groups of people (cakes) and their shared cake ingredients
 * @author @jbeliera-rather
 * @dev Each cake represents a group that can split bills and manage cake ingredients
 */
contract CakeFactory {
    // Struct to represent a group (cake)
    struct Cake {
        uint64 createdAt; // Timestamp of cake creation (64-bit, valid until 2106)
        uint64 lastCutAt; // Timestamp of last cake cut (64-bit, valid until 2106)
        uint64 lastCutBatchedIngredientsId; // ID of last batched ingredients included in a cut
        uint16 interestRate; // Interest rate for unpaid amounts in this cake
        bool active; // Whether the cake is active, half or more of members can disable the cake
        address token; // Token contract address (0x0 for native ETH)
        bool[] votesToDisable; // Current Votes to disable the cake
        uint64[] memberIds; // Array of user IDs in the cake
        uint256[] currentBalances; // Current ammounts to be paid by each member
    }

    // Struct to represent off-chain batched cake ingredients (expense) within a cake
    struct BatchedCakeIngredients {
        uint64 createdAt; // Timestamp of batched ingredients creation (64-bit, valid until 2106)
        uint8[] weights; // Payment weights per member (same order as Cake.memberIds), all the weights must coincide (this has to be done correctly off-chain)
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
    mapping(uint128 => mapping(uint64 => BatchedCakeIngredients)) public batchedIngredientsPerCake;

    // Mapping from user Ids to mapping of cakes its participating in and whete it has debts to the cake
    mapping(uint64 => mapping(uint128 => bool)) public userCakes;

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

    /**
     * @notice Initializes the contract
     * @dev This function can only be called once during deployment
     */
    constructor() {
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
     * @param interestRate interest rate for unpaid ammounts of the cake
     * @return The ID of the newly created cake
     */
    function createCake(address token, uint64[] memory memberIds, uint16 interestRate) public returns (uint128) {
        // TODO: Implement
        return 0;
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
        uint8[] memory weights,
        uint64[] memory payerIds,
        uint256[] memory payedAmounts
    ) public returns (uint128) {
        // TODO: Implement
        return 0;
    }

    /**
     * @notice Cuts a cake and updates the balances of the members
     * @param _cakeId The ID of the cake
     */
    function cutCake(uint128 _cakeId) public payable {
        // TODO: Implement
    }

    /**
     * @notice Votes to disable a cake
     * @param _cakeId The ID of the cake
     * @param _vote True to vote to disable the cake, false to vote to keep the cake active
     */
    function voteToDisableCake(uint128 _cakeId, bool _vote) public {
        // If half or more of the members have voted to disable the cake, the cake is disabled
        // TODO: Implement
    }

    /**
     * @notice Checks if an address is a member of a cake
     * @param cakeId The ID of the cake
     * @param memberId The ID of the member
     * @return True if the member is a member of the cake
     */
    function isMember(uint128 cakeId, uint64 memberId) public view returns (bool) {
        // TODO Implement
    }

    /**
     * @notice Pays the ammount owed by the caller to the cake
     * @param cakeId The ID of the cake
     */
    function payCakeSlice(uint128 cakeId) public payable {
        // TODO: Implement
    }

    /**
     * @notice Claims the slice of the cake that the caller is owed
     * @param cakeId The ID of the cake
     */
    function claimCakeSlice(uint128 cakeId) public payable {
        // TODO: Implement
    }

    /**
     * @notice Gets the details of a cake
     * @param cakeId The ID of the cake
     * @return memberIds Array of member IDs in the cake
     * @return currentBalances Current balances for each member
     * @return interestRate Interest rate for unpaid amounts
     * @return active Whether the cake is active
     * @return token Token contract address
     * @return lastCutAt Timestamp of last cake cut
     * @return lastCutBatchedIngredientsId ID of last batched ingredients included in a cut
     */
    function getCakeDetails(
        uint128 cakeId
    )
        public
        view
        returns (
            uint64[] memory memberIds,
            uint256[] memory currentBalances,
            uint16 interestRate,
            bool active,
            address token,
            uint64 lastCutAt,
            uint64 lastCutBatchedIngredientsId
        )
    {
        // Check if cake exists (createdAt will be non-zero if cake was created)
        require(cakes[cakeId].createdAt != 0, "Cake does not exist");

        return (
            cakes[cakeId].memberIds,
            cakes[cakeId].currentBalances,
            cakes[cakeId].interestRate,
            cakes[cakeId].active,
            cakes[cakeId].token,
            cakes[cakeId].lastCutAt,
            cakes[cakeId].lastCutBatchedIngredientsId
        );
    }

    /**
     * @notice Gets all members of a cake
     * @param cakeId The ID of the cake
     * @return Array of member ids
     */
    function getCakeMembers(uint128 cakeId) public view returns (uint64[] memory) {
        // Check if cake exists (createdAt will be non-zero if cake was created)
        require(cakes[cakeId].createdAt != 0, "Cake does not exist");
        return cakes[cakeId].memberIds;
    }

    /**
     * @notice Gets cake ingredient details
     * @param cakeId ID of the cake
     * @param cakeIngredientId The ID of the cake ingredient
     * @return weights Weights for the batched cake ingredients
     * @return payerIds IDs of the payers
     * @return payedAmounts Amounts paid by each payer
     */
    function getCakeIngredientDetails(
        uint128 cakeId,
        uint64 cakeIngredientId
    ) public view returns (uint8[] memory weights, uint64[] memory payerIds, uint256[] memory payedAmounts) {
        // Check if cake exists
        require(cakes[cakeId].createdAt != 0, "Cake does not exist");
        // Check if ingredient exists (createdAt will be non-zero if ingredient was created)
        require(batchedIngredientsPerCake[cakeId][cakeIngredientId].createdAt != 0, "Cake ingredient does not exist");

        return (
            batchedIngredientsPerCake[cakeId][cakeIngredientId].weights,
            batchedIngredientsPerCake[cakeId][cakeIngredientId].payerIds,
            batchedIngredientsPerCake[cakeId][cakeIngredientId].payedAmounts
        );
    }

    /**
     * @notice Gets the current balance of a member in a cake
     * @param cakeId ID of the cake
     * @param memberId ID of the member
     * @return Current balance of the member
     */
    function getCakeMemberBalance(uint128 cakeId, uint64 memberId) public view returns (uint256) {
        // Check if cake exists (createdAt will be non-zero if cake was created)
        require(cakes[cakeId].createdAt != 0, "Cake does not exist");
        return cakes[cakeId].currentBalances[memberId];
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
}
