// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title CakeFactory
 * @notice Manages groups of people (cakes) and their shared cake ingredients
 * @dev Each cake represents a group that can split bills and manage cake ingredients
 */
contract CakeFactory {
    // Struct to represent a group (cake)
    struct Cake {
        uint64 createdAt;                     // Timestamp of cake creation (64-bit, valid until 2106)
        uint64 lastCutAt;                     // Timestamp of last cake cut (64-bit, valid until 2106)
        uint64 lastCutBatchedIngredientsId;   // ID of last batched ingredients included in a cut
        uint16 interestRate;                  // Interest rate for unpaid amounts in this cake
        bool active;                          // Whether the cake is active, half or more of members can disable the cake
        address token;                        // Token contract address (0x0 for native ETH)
        bool[] votesToDisable;                // Current Votes to disable the cake
        uint64[] memberIds;                   // Array of user IDs in the cake
        uint256[] currentBalances;            // Current ammounts to be paid by each member
    }

    // Struct to represent off-chain batched cake ingredients (expense) within a cake
    struct BatchedCakeIngredients {
        uint64 createdAt;              // Timestamp of batched ingredients creation (64-bit, valid until 2106)
        uint8[] weights;               // Payment weights per member (same order as Cake.memberIds), all the weights must coincide (this has to be done correctly off-chain)
        uint64[] payerIds;             // User IDs of payers
        uint256[] payedAmounts;        // Amounts paid by each payer
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
    mapping(uint128 => (mapping(uint64 => BatchedCakeIngredients)) public batchedIngredientsPerCake;
    
    // Mapping from user Ids to mapping of cakes its participating in and whete it has debts to the cake
    mapping(uint64 => mapping(uint128 => bool)) public userCakes;
  
    // Total number of cakes created
    uint256 public totalCakes;
    
    // Total number of batched cake ingredients created
    uint256 public totalBatchedCakeIngredients;

    // Events
    event CakeCreated(uint128 indexed cakeId);
    event BatchedCakeIngredientsAdded(
        uint128 indexed batchedCakeIngredientsId,
        uint128 indexed cakeId,
    );
    event CakeCutted(uint128 indexed cakeId);

    /**
     * @notice Creates a new cake (group)
     * @param _token address of the token that will be used to pay for the cake
     * @param _memberIds array of user ids that will be members of the cake
     * @param _interestRate interest rate for unpaid ammounts of the cake
     * @return The ID of the newly created cake
     */
    function createCake(address _token, uint64[] memory _memberIds, uint16 _interestRate) public returns (uint128) {
        // TODO: Implement
        return 0;
    }


    /**
     * @notice Adds a new cake ingredient to a cake
     * @param _cakeId The ID of the cake
     * @param _weights array of weights for the batched cake ingredients
     * @param _payerIds array of user ids that will be payers of the batched cake ingredients
     * @param _payedAmounts array of amounts that each payer will pay for the batched cake ingredients
     * @return The ID of the newly created batched cake ingredients
     */
    function addBatchedCakeIngredients(
        uint128 _cakeId,
        uint8[] memory _weights,
        uint64[] memory _payerIds,
        uint256[] memory _payedAmounts
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
     * @param _cakeId The ID of the cake
     * @param _memberId The ID of the member
     * @return True if the member is a member of the cake
     */
    function isMember(uint128 _cakeId, uint64 _memberId) public view returns (bool) {
        // TODO Implement
    }

    /**
     * @notice Pays the ammount owed by the caller to the cake
     * @param _cakeId The ID of the cake
     */
    function payCakeSlice(uint128 _cakeId) public payable {
        // TODO: Implement
    } 

    /**
     * @notice Claims the slice of the cake that the caller is owed
     * @param _cakeId The ID of the cake
     */
    function claimCakeSlice(uint128 _cakeId) public payable {
        // TODO: Implement
    }

    /**
     * @notice Gets the details of a cake
     * @param _cakeId The ID of the cake
     * @return name Name of the cake
     * @return creator Address of the creator
     * @return memberCount Number of members
     * @return createdAt Timestamp of creation
     * @return active Whether the cake is active
     */
    function getCakeDetails(uint128 _cakeId)
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
        return (
            cakes[_cakeId].memberIds,
            cakes[_cakeId].currentBalances,
            cakes[_cakeId].interestRate,
            cakes[_cakeId].active,
            cakes[_cakeId].token,
            cakes[_cakeId].lastCutAt,
            cakes[_cakeId].lastCutBatchedIngredientsId
        );
    }

    /**
     * @notice Gets all members of a cake
     * @param _cakeId The ID of the cake
     * @return Array of member ids
     */
    function getCakeMembers(uint128 _cakeId)
        public
        view
        returns (uint64[] memory)
    {
        return cakes[_cakeId].memberIds;
    }

    /**
     * @notice Gets cake ingredient details
     * @param _cakeId ID of the cake
     * @param _cakeIngredientId The ID of the cake ingredient
     * @return weights Weights for the batched cake ingredients
     * @return payerIds IDs of the payers
     * @return payedAmounts Amounts paid by each payer
     */
    function getCakeIngredientDetails(uint128 _cakeId, uint64 _cakeIngredientId)
        public
        view
        returns (
            uint8[] memory weights,
            uint64[] memory payerIds,
            uint256[] memory payedAmounts
        )
    {
        return (
            batchedIngredientsPerCake[_cakeId][_cakeIngredientId].weights,
            batchedIngredientsPerCake[_cakeId][_cakeIngredientId].payerIds,
            batchedIngredientsPerCake[_cakeId][_cakeIngredientId].payedAmounts
        );
    }

    /**
     * @notice Gets the current balance of a member in a cake
     * @param _cakeId ID of the cake
     * @param _memberId ID of the member
     * @return Current balance of the member
     */
    function getCakeMemberBalance(uint128 _cakeId, uint64 _memberId) public view returns (uint256) {
        return cakes[_cakeId].currentBalances[_memberId];
    }
}

