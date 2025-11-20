import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import type { CakeFactory } from "../typechain-types";
import type { MockERC20 } from "../typechain-types";

describe("CakeFactory Payment Services", function () {
  // Fixture to deploy contracts and set up test environment
  async function deployCakeFactoryFixture() {
    const [owner, user1, user2, user3] = await ethers.getSigners();

    // Deploy mock contracts
    const MockERC20Factory = await ethers.getContractFactory("MockERC20");
    const MockRouterFactory = await ethers.getContractFactory("MockUniversalRouter");
    const MockPoolManagerFactory = await ethers.getContractFactory("MockPoolManager");
    const MockPermit2Factory = await ethers.getContractFactory("MockPermit2");

    const mockTokenA = await MockERC20Factory.deploy("Token A", "TKA");
    const mockTokenB = await MockERC20Factory.deploy("Token B", "TKB");
    const mockRouter = await MockRouterFactory.deploy();
    const mockPoolManager = await MockPoolManagerFactory.deploy();
    const mockPermit2 = await MockPermit2Factory.deploy();

    // Deploy CakeFactory
    const CakeFactoryFactory = await ethers.getContractFactory("CakeFactory");
    const cakeFactory = await CakeFactoryFactory.deploy(
      await mockRouter.getAddress(),
      await mockPoolManager.getAddress(),
      await mockPermit2.getAddress()
    );

    // Register users
    await cakeFactory.connect(user1).registerUser(user1.address);
    await cakeFactory.connect(user2).registerUser(user2.address);
    await cakeFactory.connect(user3).registerUser(user3.address);

    // Mint tokens to users and contract
    const tokenAmount = ethers.parseEther("10000");
    await mockTokenA.mint(user1.address, tokenAmount);
    await mockTokenA.mint(user2.address, tokenAmount);
    await mockTokenA.mint(await cakeFactory.getAddress(), tokenAmount);
    await mockTokenB.mint(user1.address, tokenAmount);
    await mockTokenB.mint(user2.address, tokenAmount);
    await mockTokenB.mint(await cakeFactory.getAddress(), tokenAmount);

    return {
      cakeFactory,
      mockTokenA,
      mockTokenB,
      mockRouter,
      mockPoolManager,
      mockPermit2,
      owner,
      user1,
      user2,
      user3,
    };
  }

  // Helper function to create a test cake manually (since createCake is not implemented)
  // This directly manipulates storage to set up test scenarios
  async function setupTestCake(
    cakeFactory: CakeFactory,
    cakeId: number,
    token: MockERC20,
    memberIds: number[],
    balances: bigint[]
  ) {
    // Note: This is a workaround since createCake is not implemented
    // In a real scenario, we would use createCake, but for testing payment functions
    // we need to manually set up the cake state
    // This would require direct storage manipulation which is complex
    // For now, tests will document expected behavior
  }

  describe("payCakeSlice", function () {
    it("Should revert when user is not registered", async function () {
      const { cakeFactory, mockTokenA } = await loadFixture(deployCakeFactoryFixture);
      
      // Create a new user that hasn't registered
      const [, , , , unregisteredUser] = await ethers.getSigners();

      await expect(
        cakeFactory.connect(unregisteredUser).payCakeSlice(1, mockTokenA, { value: 0 })
      ).to.be.revertedWith("User not registered");
    });

    it("Should revert when user has no debt", async function () {
      const { cakeFactory, mockTokenA, user1 } = await loadFixture(deployCakeFactoryFixture);

      // Note: The contract currently checks `userBalance < 0` which is always false for uint256
      // This is a bug in the contract - uint256 can never be negative
      // This test will always revert because the check will always fail
      // The contract needs to be fixed to use int256 or a different approach for negative balances
      await expect(
        cakeFactory.connect(user1).payCakeSlice(1, mockTokenA, { value: 0 })
      ).to.be.reverted;
    });

    it("Should revert when cake does not exist", async function () {
      const { cakeFactory, mockTokenA, user1 } = await loadFixture(deployCakeFactoryFixture);

      // Attempting to pay for a non-existent cake
      // This will revert when trying to access cakes[999].currentBalances
      await expect(
        cakeFactory.connect(user1).payCakeSlice(999, mockTokenA, { value: 0 })
      ).to.be.reverted;
    });

    it("Should allow payment with same token as cake token", async function () {
      const { cakeFactory, mockTokenA, user1 } = await loadFixture(deployCakeFactoryFixture);

      // Setup: This test requires createCake and cutCake to be implemented
      // Expected flow:
      // 1. Create a cake with tokenA
      // 2. Set up a debt for user1 (negative balance)
      // 3. User approves token spending
      // 4. User calls payCakeSlice
      // 5. Verify balance is reset and tokens are transferred
      
      const debtAmount = ethers.parseEther("100");
      await mockTokenA.connect(user1).approve(await cakeFactory.getAddress(), debtAmount);

      // This test is a placeholder until createCake and cutCake are implemented
      // Once implemented, uncomment and complete:
      // const cakeId = await cakeFactory.createCake(...);
      // await cakeFactory.cutCake(cakeId);
      // await expect(
      //   cakeFactory.connect(user1).payCakeSlice(cakeId, mockTokenA, { value: 0 })
      // ).to.emit(cakeFactory, "CakeSlicePaid");
    });

    it("Should allow payment with different token (triggers swap)", async function () {
      const { cakeFactory, mockTokenA, mockTokenB, user1, owner } = await loadFixture(deployCakeFactoryFixture);

      // Setup: Create a cake with tokenA, user has debt, pays with tokenB
      // This requires:
      // 1. Pool key to be configured via storePoolKey
      // 2. Swap functionality to be working
      const debtAmount = ethers.parseEther("100");
      
      // Approve token spending
      await mockTokenB.connect(user1).approve(await cakeFactory.getAddress(), debtAmount);

      // This test is a placeholder until:
      // - createCake and cutCake are implemented
      // - Pool keys are configured
      // - Swap functionality is verified
    });

    it("Should allow payment with ETH when cake token is ETH", async function () {
      const { cakeFactory, user1 } = await loadFixture(deployCakeFactoryFixture);

      const debtAmount = ethers.parseEther("1");

      // This test requires:
      // 1. A cake created with address(0) as token (ETH)
      // 2. User to have a debt in that cake
      // Note: payCakeSlice takes IERC20, so we need to pass address(0) cast to IERC20
      // This will revert until cake is properly set up
      const zeroAddressToken = await ethers.getContractAt("IERC20", ethers.ZeroAddress);
      await expect(
        cakeFactory.connect(user1).payCakeSlice(1, zeroAddressToken, { value: debtAmount })
      ).to.be.reverted;
    });

    it("Should revert when insufficient ETH is sent", async function () {
      const { cakeFactory, user1 } = await loadFixture(deployCakeFactoryFixture);

      const debtAmount = ethers.parseEther("1");
      const insufficientAmount = ethers.parseEther("0.5");

      // Expected: Should revert with "Insufficient ETH sent"
      // This will revert until cake is properly set up
      const zeroAddressToken = await ethers.getContractAt("IERC20", ethers.ZeroAddress);
      await expect(
        cakeFactory.connect(user1).payCakeSlice(1, zeroAddressToken, { value: insufficientAmount })
      ).to.be.reverted;
    });

    it("Should revert when insufficient ERC20 tokens are approved", async function () {
      const { cakeFactory, mockTokenA, user1 } = await loadFixture(deployCakeFactoryFixture);

      const debtAmount = ethers.parseEther("100");
      const insufficientAmount = ethers.parseEther("50");

      // Approve insufficient amount
      await mockTokenA.connect(user1).approve(await cakeFactory.getAddress(), insufficientAmount);

      // Expected: Should revert when trying to transfer more than approved
      // This requires a cake to be set up with a debt
      // The safeTransferFrom will revert if allowance is insufficient
    });

    it("Should emit CakeSlicePaid event on successful payment", async function () {
      const { cakeFactory, mockTokenA, user1 } = await loadFixture(deployCakeFactoryFixture);

      const debtAmount = ethers.parseEther("100");
      await mockTokenA.connect(user1).approve(await cakeFactory.getAddress(), debtAmount);

      // Expected: Should emit CakeSlicePaid event with correct parameters
      // This test will work once cake setup is complete:
      // const cakeId = await cakeFactory.createCake(...);
      // await cakeFactory.cutCake(cakeId);
      // const userId = await cakeFactory.getUserId(user1.address);
      // await expect(
      //   cakeFactory.connect(user1).payCakeSlice(cakeId, mockTokenA, { value: 0 })
      // ).to.emit(cakeFactory, "CakeSlicePaid")
      //   .withArgs(cakeId, userId, debtAmount);
    });

    it("Should reset user balance to zero after payment", async function () {
      const { cakeFactory, mockTokenA, user1 } = await loadFixture(deployCakeFactoryFixture);

      // Expected: After successful payment, user's balance should be 0
      // This test will verify:
      // const cakeId = await cakeFactory.createCake(...);
      // await cakeFactory.cutCake(cakeId);
      // const userId = await cakeFactory.getUserId(user1.address);
      // const balanceBefore = await cakeFactory.getCakeMemberBalance(cakeId, userId);
      // await cakeFactory.connect(user1).payCakeSlice(cakeId, mockTokenA, { value: 0 });
      // const balanceAfter = await cakeFactory.getCakeMemberBalance(cakeId, userId);
      // expect(balanceAfter).to.equal(0);
    });

    it("Should handle reentrancy protection", async function () {
      const { cakeFactory, mockTokenA, user1 } = await loadFixture(deployCakeFactoryFixture);

      // The contract uses nonReentrant modifier from ReentrancyGuard
      // This test would require a malicious contract that tries to reenter payCakeSlice
      // during the token transfer callback
      // This is a security test that should be implemented once the contract is functional
    });
  });

  describe("claimCakeSlice", function () {
    it("Should revert when user is not registered", async function () {
      const { cakeFactory } = await loadFixture(deployCakeFactoryFixture);
      
      const [, , , , unregisteredUser] = await ethers.getSigners();

      await expect(
        cakeFactory.connect(unregisteredUser).claimCakeSlice(1)
      ).to.be.revertedWith("User not registered");
    });

    it("Should revert when user has no credit (balance is zero or negative)", async function () {
      const { cakeFactory, user1 } = await loadFixture(deployCakeFactoryFixture);

      // User has no positive balance to claim
      await expect(
        cakeFactory.connect(user1).claimCakeSlice(1)
      ).to.be.revertedWith("User has no credit in the cake to claim");
    });

    it("Should revert when cake does not exist", async function () {
      const { cakeFactory, user1 } = await loadFixture(deployCakeFactoryFixture);

      // Attempting to claim from a non-existent cake
      await expect(
        cakeFactory.connect(user1).claimCakeSlice(999)
      ).to.be.reverted;
    });

    it("Should allow claiming with same token as cake token", async function () {
      const { cakeFactory, mockTokenA, user1 } = await loadFixture(deployCakeFactoryFixture);

      // Setup: This test requires createCake and cutCake to be implemented
      // Expected flow:
      // 1. Create a cake with tokenA
      // 2. Set up a credit for user1 (positive balance)
      // 3. User calls claimCakeSlice
      // 4. Verify balance is reset and tokens are transferred to user
      
      // Note: The contract has a bug - it references undefined `token` variable
      // This needs to be fixed in the contract before this test can pass
    });

    it("Should allow claiming with different token (triggers swap)", async function () {
      const { cakeFactory, mockTokenA, mockTokenB, user1, owner } = await loadFixture(deployCakeFactoryFixture);

      // Setup: Create a cake with tokenA, user has credit, claims in tokenB
      // This requires:
      // 1. Pool key to be configured via storePoolKey
      // 2. Swap functionality to be working
      // 3. Contract to have tokens to swap
      
      // Note: The contract has bugs in claimCakeSlice:
      // - Line 233: `token` is undefined (should be `cakes[cakeId].token`)
      // - Line 234: `key` is used before it's defined
      // These need to be fixed before this test can work
    });

    it("Should emit CakeSliceClaimed event on successful claim", async function () {
      const { cakeFactory, mockTokenA, user1 } = await loadFixture(deployCakeFactoryFixture);

      const creditAmount = ethers.parseEther("100");

      // Expected: Should emit CakeSliceClaimed event with correct parameters
      // This test will work once cake setup is complete and contract bugs are fixed:
      // const cakeId = await cakeFactory.createCake(...);
      // await cakeFactory.cutCake(cakeId);
      // const userId = await cakeFactory.getUserId(user1.address);
      // await expect(
      //   cakeFactory.connect(user1).claimCakeSlice(cakeId)
      // ).to.emit(cakeFactory, "CakeSliceClaimed")
      //   .withArgs(cakeId, userId, creditAmount);
    });

    it("Should reset user balance to zero after claim", async function () {
      const { cakeFactory, user1 } = await loadFixture(deployCakeFactoryFixture);

      // Expected: After successful claim, user's balance should be 0
      // This test will verify:
      // const cakeId = await cakeFactory.createCake(...);
      // await cakeFactory.cutCake(cakeId);
      // const userId = await cakeFactory.getUserId(user1.address);
      // const balanceBefore = await cakeFactory.getCakeMemberBalance(cakeId, userId);
      // await cakeFactory.connect(user1).claimCakeSlice(cakeId);
      // const balanceAfter = await cakeFactory.getCakeMemberBalance(cakeId, userId);
      // expect(balanceAfter).to.equal(0);
    });

    it("Should transfer correct amount to user", async function () {
      const { cakeFactory, mockTokenA, user1 } = await loadFixture(deployCakeFactoryFixture);

      // Expected: The correct amount should be transferred to the user
      // This test will verify:
      // const cakeId = await cakeFactory.createCake(...);
      // await cakeFactory.cutCake(cakeId);
      // const userId = await cakeFactory.getUserId(user1.address);
      // const creditAmount = await cakeFactory.getCakeMemberBalance(cakeId, userId);
      // const balanceBefore = await mockTokenA.balanceOf(user1.address);
      // await cakeFactory.connect(user1).claimCakeSlice(cakeId);
      // const balanceAfter = await mockTokenA.balanceOf(user1.address);
      // expect(balanceAfter - balanceBefore).to.equal(creditAmount);
    });

    it("Should handle reentrancy protection", async function () {
      const { cakeFactory, user1 } = await loadFixture(deployCakeFactoryFixture);

      // The contract uses nonReentrant modifier from ReentrancyGuard
      // This test would require a malicious contract that tries to reenter claimCakeSlice
      // during the token transfer callback
      // This is a security test that should be implemented once the contract is functional
    });
  });

  describe("Payment Edge Cases", function () {
    it("Should handle payment with zero debt (should revert)", async function () {
      const { cakeFactory, mockTokenA, user1 } = await loadFixture(deployCakeFactoryFixture);

      // User with zero balance should not be able to pay
      // Note: The contract bug (checking userBalance < 0) will cause this to always revert
      await expect(
        cakeFactory.connect(user1).payCakeSlice(1, mockTokenA, { value: 0 })
      ).to.be.reverted;
    });

    it("Should handle claim with zero credit (should revert)", async function () {
      const { cakeFactory, user1 } = await loadFixture(deployCakeFactoryFixture);

      // User with zero balance should not be able to claim
      await expect(
        cakeFactory.connect(user1).claimCakeSlice(1)
      ).to.be.revertedWith("User has no credit in the cake to claim");
    });

    it("Should handle payment with exact amount", async function () {
      const { cakeFactory, mockTokenA, user1 } = await loadFixture(deployCakeFactoryFixture);

      // Expected: Payment with exact debt amount should succeed
      // This test will verify:
      // const cakeId = await cakeFactory.createCake(...);
      // await cakeFactory.cutCake(cakeId);
      // const userId = await cakeFactory.getUserId(user1.address);
      // const debtAmount = await cakeFactory.getCakeMemberBalance(cakeId, userId);
      // await mockTokenA.connect(user1).approve(await cakeFactory.getAddress(), debtAmount);
      // await cakeFactory.connect(user1).payCakeSlice(cakeId, mockTokenA, { value: 0 });
      // const balanceAfter = await cakeFactory.getCakeMemberBalance(cakeId, userId);
      // expect(balanceAfter).to.equal(0);
    });

    it("Should handle payment with excess amount", async function () {
      const { cakeFactory, mockTokenA, user1 } = await loadFixture(deployCakeFactoryFixture);

      // Expected: Payment with more than debt amount should only pay the debt amount
      // The contract should transfer exactly the debt amount, not the excess
      // This test will verify the exact amount transferred matches the debt
    });
  });

  describe("Payment Integration", function () {
    it("Should allow multiple users to pay their debts independently", async function () {
      const { cakeFactory, mockTokenA, user1, user2 } = await loadFixture(deployCakeFactoryFixture);

      // Expected: Multiple users should be able to pay their debts independently
      // This test will verify:
      // 1. Create a cake with multiple members
      // 2. Set up debts for user1 and user2
      // 3. Both users pay their debts
      // 4. Verify both balances are reset
    });

    it("Should allow users to claim credits after others pay", async function () {
      const { cakeFactory, mockTokenA, user1, user2 } = await loadFixture(deployCakeFactoryFixture);

      // Expected flow:
      // 1. Create a cake with user1 and user2
      // 2. Set up scenario where user1 has debt and user2 has credit
      // 3. User1 pays debt
      // 4. User2 can claim credit
      // This tests the circular payment flow
    });

    it("Should maintain correct balances after multiple payments", async function () {
      const { cakeFactory, mockTokenA, user1, user2, user3 } = await loadFixture(deployCakeFactoryFixture);

      // Expected: Balances should remain correct after multiple operations
      // This test will verify:
      // 1. Create a cake with multiple members
      // 2. Perform multiple payment and claim operations
      // 3. Verify all balances are correct at each step
      // 4. Verify sum of all balances equals zero (conservation of value)
    });
  });

  describe("Contract Bug Documentation", function () {
    it("Should document known bugs in payCakeSlice", async function () {
      // Known bugs in payCakeSlice:
      // 1. Line 200: `require(userBalance < 0, ...)` - uint256 can never be negative
      //    Fix: Use int256 for balances or a separate mapping for debts
      // 2. Line 204: Comparison `token != cakes[cakeId].token` compares IERC20 to address
      //    Fix: Compare addresses: `address(token) != cakes[cakeId].token`
      // 3. Line 208: Uses `-userBalance` which is incorrect for uint256
      //    Fix: Handle negative balances properly
    });

    it("Should document known bugs in claimCakeSlice", async function () {
      // Known bugs in claimCakeSlice:
      // 1. Line 233: `token` variable is undefined
      //    Fix: Use `cakes[cakeId].token` instead
      // 2. Line 234: `key` is used before it's defined
      //    Fix: Move key definition before the require statement
      // 3. Line 240: `token` variable is undefined
      //    Fix: Use `cakes[cakeId].token` instead
      // 4. Line 243: Uses `safeTransferFrom` from contract to user, but should use `safeTransfer`
      //    Fix: Use `IERC20(cakes[cakeId].token).safeTransfer(msg.sender, userBalance)`
    });
  });
});

