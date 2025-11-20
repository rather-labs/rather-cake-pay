const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("CakeFactory - Payment and Claim", function () {
  let cakeFactory;
  let mockTokenA, mockTokenB;
  let mockRouter, mockPoolManager, mockPermit2;
  let owner, user1, user2, user3;
  
  const billingPeriod = 7 * 24 * 60 * 60; // one week
  const interestRate = 150; // 1.5% per overdue period
  const defaultWeights = [5000, 3000, 2000];

  beforeEach(async function () {
    [owner, user1, user2, user3] = await ethers.getSigners();

    // Deploy mock contracts
    const MockERC20Factory = await ethers.getContractFactory("MockERC20");
    const MockRouterFactory = await ethers.getContractFactory("MockUniversalRouter");
    const MockPoolManagerFactory = await ethers.getContractFactory("MockPoolManager");
    const MockPermit2Factory = await ethers.getContractFactory("MockPermit2");

    mockTokenA = await MockERC20Factory.deploy("Token A", "TKA");
    mockTokenB = await MockERC20Factory.deploy("Token B", "TKB");
    mockRouter = await MockRouterFactory.deploy();
    mockPoolManager = await MockPoolManagerFactory.deploy();
    mockPermit2 = await MockPermit2Factory.deploy();

    // Deploy CakeFactory with mock addresses
    const CakeFactoryFactory = await ethers.getContractFactory("CakeFactory");
    cakeFactory = await CakeFactoryFactory.deploy(
      await mockRouter.getAddress(),
      await mockPoolManager.getAddress(),
      await mockPermit2.getAddress()
    );
    await cakeFactory.waitForDeployment();

    // Register users
    await cakeFactory.connect(owner).registerUser(owner.address);
    await cakeFactory.connect(user1).registerUser(user1.address);
    await cakeFactory.connect(user2).registerUser(user2.address);
    await cakeFactory.connect(user3).registerUser(user3.address);

    // Mint tokens to users
    const tokenAmount = ethers.parseEther("10000");
    await mockTokenA.mint(owner.address, tokenAmount);
    await mockTokenA.mint(user1.address, tokenAmount);
    await mockTokenA.mint(user2.address, tokenAmount);
    await mockTokenB.mint(owner.address, tokenAmount);
    await mockTokenB.mint(user1.address, tokenAmount);
    await mockTokenB.mint(user2.address, tokenAmount);
  });

  async function register(address) {
    await cakeFactory.registerUser(address);
    return await cakeFactory.userIds(address);
  }

  async function createCakeWithToken(tokenAddress, memberIds, weights) {
    await cakeFactory.createCake(
      tokenAddress,
      memberIds,
      weights,
      interestRate,
      billingPeriod
    );
    return await cakeFactory.totalCakes();
  }

  async function setupCakeWithDebt(tokenAddress = ethers.ZeroAddress) {
    const memberIds = [
      await cakeFactory.userIds(owner.address),
      await cakeFactory.userIds(user1.address),
      await cakeFactory.userIds(user2.address),
    ];
    
    const cakeId = await createCakeWithToken(tokenAddress, memberIds, defaultWeights);
    
    // Add ingredient using same setup as cutCake test: owner and user1 pay
    // Owner pays 1 ETH, user1 pays 0.5 ETH
    // This creates: owner -0.25, user1 -0.05, user2 +0.3
    // So owner has debt
    const payerIds = [memberIds[0], memberIds[1]]; // owner and user1 pay
    const payedAmounts = [ethers.parseEther("1"), ethers.parseEther("0.5")];
    await cakeFactory.addBatchedCakeIngredients(cakeId, [], payerIds, payedAmounts);
    
    // Cut cake to apply balances
    await cakeFactory.cutCake(cakeId);
    
    return { cakeId, memberIds };
  }

  async function setupCakeWithCredit(tokenAddress = ethers.ZeroAddress) {
    const memberIds = [
      await cakeFactory.userIds(owner.address),
      await cakeFactory.userIds(user1.address),
      await cakeFactory.userIds(user2.address),
    ];
    
    const cakeId = await createCakeWithToken(tokenAddress, memberIds, defaultWeights);
    
    // Add ingredient using same setup as cutCake test: owner and user1 pay
    // Owner pays 1 ETH, user1 pays 0.5 ETH
    // Result: owner -0.25, user1 -0.05, user2 +0.3
    // So user2 has credit
    const payerIds = [memberIds[0], memberIds[1]]; // owner and user1 pay
    const payedAmounts = [ethers.parseEther("1"), ethers.parseEther("0.5")];
    await cakeFactory.addBatchedCakeIngredients(cakeId, [], payerIds, payedAmounts);
    
    // Cut cake to apply balances
    await cakeFactory.cutCake(cakeId);
    
    return { cakeId, memberIds };
  }

  describe("payCakeSlice", function () {
    it("Should revert when user is not registered", async function () {
      const { cakeId } = await setupCakeWithDebt();
      const [, , , , unregisteredUser] = await ethers.getSigners();
      // Use a mock token for this test since we can't use zero address directly
      await expect(
        cakeFactory.connect(unregisteredUser).payCakeSlice(cakeId, mockTokenA, { value: 0 })
      ).to.be.revertedWith("User not registered");
    });

    it("Should revert when user has no debt (balance is zero or positive)", async function () {
      const { cakeId, memberIds } = await setupCakeWithDebt(await mockTokenA.getAddress());
      const userId2 = memberIds[2]; // user2 has positive balance (credit)
      
      await expect(
        cakeFactory.connect(user2).payCakeSlice(cakeId, mockTokenA, { value: 0 })
      ).to.be.revertedWith("User has no debt in the cake to pay");
    });

    it("Should allow payment with ERC20 token (same as cake token)", async function () {
      const { cakeId, memberIds } = await setupCakeWithDebt(await mockTokenA.getAddress());
      
      // Based on cutCake test: owner should have -0.25, user1 -0.05, user2 +0.3
      // Test with owner who has debt
      const userId0 = memberIds[0]; // owner has debt of -0.25
      const balanceBefore = await cakeFactory.getCakeMemberBalance(cakeId, userId0);
      expect(balanceBefore).to.equal(-ethers.parseEther("0.25")); // Should be -0.25
      
      const debtAmount = -balanceBefore; // 0.25 ETH
      
      // Approve token spending
      await mockTokenA.connect(owner).approve(await cakeFactory.getAddress(), debtAmount);
      
      // Get contract balance before
      const contractBalanceBefore = await mockTokenA.balanceOf(await cakeFactory.getAddress());
      
      // Pay debt
      await expect(
        cakeFactory.connect(owner).payCakeSlice(cakeId, mockTokenA, { value: 0 })
      )
        .to.emit(cakeFactory, "CakeSlicePaid")
        .withArgs(cakeId, userId0, balanceBefore);
      
      // Verify balance is reset to zero
      const balanceAfter = await cakeFactory.getCakeMemberBalance(cakeId, userId0);
      expect(balanceAfter).to.equal(0n);
      
      // Verify tokens were transferred to contract
      const contractBalanceAfter = await mockTokenA.balanceOf(await cakeFactory.getAddress());
      expect(contractBalanceAfter - contractBalanceBefore).to.equal(debtAmount);
    });

    it("Should allow payment with ETH when cake token is ETH", async function () {
      const { cakeId, memberIds } = await setupCakeWithDebt(ethers.ZeroAddress);
      
      const userId0 = memberIds[0]; // owner has debt of -0.25
      const balanceBefore = await cakeFactory.getCakeMemberBalance(cakeId, userId0);
      expect(balanceBefore).to.equal(-ethers.parseEther("0.25"));
      
      const debtAmount = -balanceBefore; // 0.25 ETH
      // For ETH, we need to pass address(0) as the token parameter
      // Use the contract's interface to encode the call with zero address
      const zeroAddress = ethers.ZeroAddress;
      
      // Get contract balance before
      const contractBalanceBefore = await ethers.provider.getBalance(await cakeFactory.getAddress());
      
      // Pay debt with ETH - pass zero address directly as IERC20 parameter
      await expect(
        cakeFactory.connect(owner).payCakeSlice(cakeId, zeroAddress, { value: debtAmount })
      )
        .to.emit(cakeFactory, "CakeSlicePaid")
        .withArgs(cakeId, userId0, balanceBefore);
      
      // Verify balance is reset to zero
      const balanceAfter = await cakeFactory.getCakeMemberBalance(cakeId, userId0);
      expect(balanceAfter).to.equal(0n);
      
      // Verify ETH was transferred to contract
      const contractBalanceAfter = await ethers.provider.getBalance(await cakeFactory.getAddress());
      expect(contractBalanceAfter - contractBalanceBefore).to.equal(debtAmount);
    });

    it("Should revert when insufficient ETH is sent", async function () {
      const { cakeId, memberIds } = await setupCakeWithDebt(ethers.ZeroAddress);
      
      const userId0 = memberIds[0];
      const balanceBefore = await cakeFactory.getCakeMemberBalance(cakeId, userId0);
      const debtAmount = -balanceBefore;
      const insufficientAmount = debtAmount / 2n;
      
      // For ETH, pass zero address directly
      const zeroAddress = ethers.ZeroAddress;
      
      await expect(
        cakeFactory.connect(owner).payCakeSlice(cakeId, zeroAddress, { value: insufficientAmount })
      ).to.be.revertedWith("Insufficient ETH sent");
    });

    it("Should revert when insufficient ERC20 tokens are approved", async function () {
      const { cakeId, memberIds } = await setupCakeWithDebt(await mockTokenA.getAddress());
      
      const userId0 = memberIds[0];
      const balanceBefore = await cakeFactory.getCakeMemberBalance(cakeId, userId0);
      expect(balanceBefore).to.be.lt(0n);
      const debtAmount = -balanceBefore;
      const insufficientAmount = debtAmount / 2n;
      
      // Approve insufficient amount
      await mockTokenA.connect(owner).approve(await cakeFactory.getAddress(), insufficientAmount);
      
      await expect(
        cakeFactory.connect(owner).payCakeSlice(cakeId, mockTokenA, { value: 0 })
      ).to.be.reverted; // Should revert on safeTransferFrom
    });

    it("Should reset user balance to zero after payment", async function () {
      const { cakeId, memberIds } = await setupCakeWithDebt(await mockTokenA.getAddress());
      
      const userId0 = memberIds[0];
      const balanceBefore = await cakeFactory.getCakeMemberBalance(cakeId, userId0);
      expect(balanceBefore).to.be.lt(0n);
      const debtAmount = -balanceBefore;
      
      await mockTokenA.connect(owner).approve(await cakeFactory.getAddress(), debtAmount);
      await cakeFactory.connect(owner).payCakeSlice(cakeId, mockTokenA, { value: 0 });
      
      const balanceAfter = await cakeFactory.getCakeMemberBalance(cakeId, userId0);
      expect(balanceAfter).to.equal(0n);
    });

    it("Should allow multiple users to pay their debts independently", async function () {
      const memberIds = [
        await cakeFactory.userIds(owner.address),
        await cakeFactory.userIds(user1.address),
        await cakeFactory.userIds(user2.address),
      ];
      
      const cakeId = await createCakeWithToken(await mockTokenA.getAddress(), memberIds, defaultWeights);
      
      // Create scenario where both owner and user1 have debts
      // User2 pays 2 ETH: total 2 ETH split by [50%, 30%, 20%]
      // Owner: +1 (owes) - 0 (paid) = -1 (debt)
      // User1: +0.6 (owes) - 0 (paid) = -0.6 (debt)
      // User2: +0.4 (owes) - 2 (paid) = -1.6 (debt) - wait, that's wrong
      // Actually: User2: +0.4 (owes) - 2 (paid) = +0.4 - 2 = -1.6? No, it's +1.6 credit
      // Let me use a simpler scenario: owner and user1 pay to create debts for both
      // Owner pays 1 ETH, user1 pays 0.5 ETH: owner -0.25, user1 -0.05, user2 +0.3
      const payerIds = [memberIds[0], memberIds[1]]; // owner and user1 pay
      const payedAmounts = [ethers.parseEther("1"), ethers.parseEther("0.5")];
      await cakeFactory.addBatchedCakeIngredients(cakeId, [], payerIds, payedAmounts);
      await cakeFactory.cutCake(cakeId);
      
      // Both owner and user1 should have debts
      const ownerBalance = await cakeFactory.getCakeMemberBalance(cakeId, memberIds[0]);
      const user1Balance = await cakeFactory.getCakeMemberBalance(cakeId, memberIds[1]);
      expect(ownerBalance).to.equal(-ethers.parseEther("0.25"));
      expect(user1Balance).to.equal(-ethers.parseEther("0.05"));
      
      // Owner pays
      const ownerDebt = -ownerBalance; // 0.25 ETH
      await mockTokenA.connect(owner).approve(await cakeFactory.getAddress(), ownerDebt);
      await cakeFactory.connect(owner).payCakeSlice(cakeId, mockTokenA, { value: 0 });
      
      // User1 pays
      const user1Debt = -user1Balance; // 0.05 ETH
      await mockTokenA.connect(user1).approve(await cakeFactory.getAddress(), user1Debt);
      await cakeFactory.connect(user1).payCakeSlice(cakeId, mockTokenA, { value: 0 });
      
      // Verify both balances are zero
      expect(await cakeFactory.getCakeMemberBalance(cakeId, memberIds[0])).to.equal(0n);
      expect(await cakeFactory.getCakeMemberBalance(cakeId, memberIds[1])).to.equal(0n);
    });
  });

  describe("claimCakeSlice", function () {
    it("Should revert when user is not registered", async function () {
      const { cakeId } = await setupCakeWithCredit();
      const [, , , , unregisteredUser] = await ethers.getSigners();

      await expect(
        cakeFactory.connect(unregisteredUser).claimCakeSlice(cakeId, mockTokenA)
      ).to.be.revertedWith("User not registered");
    });

    it("Should revert when user has no credit (balance is zero or negative)", async function () {
      const { cakeId, memberIds } = await setupCakeWithCredit();
      const userId0 = memberIds[0]; // owner has negative balance (debt)
      
      await expect(
        cakeFactory.connect(owner).claimCakeSlice(cakeId, mockTokenA)
      ).to.be.revertedWith("User has no credit in the cake to claim");
    });

    it("Should allow claiming with ERC20 token (same as cake token)", async function () {
      const { cakeId, memberIds } = await setupCakeWithCredit(await mockTokenA.getAddress());
      
      const userId2 = memberIds[2]; // user2 has credit of +0.3 (from cutCake test setup)
      const balanceBefore = await cakeFactory.getCakeMemberBalance(cakeId, userId2);
      expect(balanceBefore).to.equal(ethers.parseEther("0.3"));
      
      const creditAmount = balanceBefore;
      
      // Fund contract with tokens (in real scenario, this comes from payments)
      await mockTokenA.mint(await cakeFactory.getAddress(), creditAmount);
      
      // Get user balance before
      const userBalanceBefore = await mockTokenA.balanceOf(user2.address);
      
      // Claim credit
      await expect(
        cakeFactory.connect(user2).claimCakeSlice(cakeId, mockTokenA)
      )
        .to.emit(cakeFactory, "CakeSliceClaimed")
        .withArgs(cakeId, userId2, balanceBefore);
      
      // Verify balance is reset to zero
      const balanceAfter = await cakeFactory.getCakeMemberBalance(cakeId, userId2);
      expect(balanceAfter).to.equal(0n);
      
      // Verify tokens were transferred to user
      const userBalanceAfter = await mockTokenA.balanceOf(user2.address);
      expect(userBalanceAfter - userBalanceBefore).to.equal(creditAmount);
    });

    it("Should allow claiming with ETH when cake token is ETH", async function () {
      const { cakeId, memberIds } = await setupCakeWithCredit(ethers.ZeroAddress);
      
      // From cutCake test: user1 and user2 pay, user2 has credit of +0.3
      const userId2 = memberIds[2]; // user2 has credit of +0.3
      const balanceBefore = await cakeFactory.getCakeMemberBalance(cakeId, userId2);
      expect(balanceBefore).to.equal(ethers.parseEther("0.3"));
      
      const creditAmount = balanceBefore;
      
      // Fund contract with ETH (in real scenario, this comes from payments)
      await owner.sendTransaction({
        to: await cakeFactory.getAddress(),
        value: creditAmount,
      });
      
      // Get user balance before
      const userBalanceBefore = await ethers.provider.getBalance(user2.address);
      
      // For ETH, manually encode the function call with zero address
      // Using the contract's interface to encode the function data
      const iface = cakeFactory.interface;
      const zeroAddress = ethers.ZeroAddress;
      
      // Encode function data manually
      const functionFragment = iface.getFunction("claimCakeSlice");
      const data = iface.encodeFunctionData(functionFragment, [cakeId, zeroAddress]);
      
      // Send the transaction using the encoded data
      const tx = await user2.sendTransaction({
        to: await cakeFactory.getAddress(),
        data: data,
      });
      const receipt = await tx.wait();
      const gasUsed = receipt.gasUsed * receipt.gasPrice;
      
      // Check for the event using the contract's interface
      const event = receipt.logs.find(log => {
        try {
          const parsed = iface.parseLog(log);
          return parsed && parsed.name === "CakeSliceClaimed";
        } catch {
          return false;
        }
      });
      expect(event).to.not.be.undefined;
      const parsedEvent = iface.parseLog(event);
      expect(parsedEvent.args.cakeId).to.equal(cakeId);
      expect(parsedEvent.args.userId).to.equal(userId2);
      expect(parsedEvent.args.amount).to.equal(balanceBefore);
      
      // Verify balance is reset to zero
      const balanceAfter = await cakeFactory.getCakeMemberBalance(cakeId, userId2);
      expect(balanceAfter).to.equal(0n);
      
      // Verify ETH was transferred to user (accounting for gas)
      const userBalanceAfter = await ethers.provider.getBalance(user2.address);
      expect(userBalanceAfter - userBalanceBefore + gasUsed).to.equal(creditAmount);
    });

    it("Should revert when contract has insufficient ETH balance", async function () {
      const { cakeId, memberIds } = await setupCakeWithCredit(ethers.ZeroAddress);
      
      const userId2 = memberIds[2];
      const balanceBefore = await cakeFactory.getCakeMemberBalance(cakeId, userId2);
      expect(balanceBefore).to.equal(ethers.parseEther("0.3"));
      const creditAmount = balanceBefore;
      
      // For ETH, manually encode the function call with zero address
      const iface = cakeFactory.interface;
      const zeroAddress = ethers.ZeroAddress;
      const functionFragment = iface.getFunction("claimCakeSlice");
      const data = iface.encodeFunctionData(functionFragment, [cakeId, zeroAddress]);
      
      // Don't fund contract - should revert
      await expect(
        user2.sendTransaction({
          to: await cakeFactory.getAddress(),
          data: data,
        })
      ).to.be.revertedWith("Insufficient contract balance");
    });

    it("Should revert when contract has insufficient ERC20 balance", async function () {
      const { cakeId, memberIds } = await setupCakeWithCredit(await mockTokenA.getAddress());
      
      const userId1 = memberIds[1];
      const balanceBefore = await cakeFactory.getCakeMemberBalance(cakeId, userId1);
      const creditAmount = balanceBefore;
      
      // Don't fund contract - should revert on safeTransfer
      await expect(
        cakeFactory.connect(user1).claimCakeSlice(cakeId, mockTokenA)
      ).to.be.reverted; // Should revert on safeTransfer
    });

    it("Should reset user balance to zero after claim", async function () {
      const { cakeId, memberIds } = await setupCakeWithCredit(await mockTokenA.getAddress());
      
      const userId2 = memberIds[2];
      const balanceBefore = await cakeFactory.getCakeMemberBalance(cakeId, userId2);
      expect(balanceBefore).to.equal(ethers.parseEther("0.3"));
      const creditAmount = balanceBefore;
      
      // Fund contract
      await mockTokenA.mint(await cakeFactory.getAddress(), creditAmount);
      
      await cakeFactory.connect(user2).claimCakeSlice(cakeId, mockTokenA);
      
      const balanceAfter = await cakeFactory.getCakeMemberBalance(cakeId, userId2);
      expect(balanceAfter).to.equal(0n);
    });

    it("Should transfer correct amount to user", async function () {
      const { cakeId, memberIds } = await setupCakeWithCredit(await mockTokenA.getAddress());
      
      const userId2 = memberIds[2];
      const balanceBefore = await cakeFactory.getCakeMemberBalance(cakeId, userId2);
      // From cutCake test: user1 and user2 pay, user2 has credit of +0.3
      expect(balanceBefore).to.equal(ethers.parseEther("0.3"));
      const creditAmount = balanceBefore;
      
      // Fund contract
      await mockTokenA.mint(await cakeFactory.getAddress(), creditAmount);
      
      const userBalanceBefore = await mockTokenA.balanceOf(user2.address);
      await cakeFactory.connect(user2).claimCakeSlice(cakeId, mockTokenA);
      const userBalanceAfter = await mockTokenA.balanceOf(user2.address);
      
      expect(userBalanceAfter - userBalanceBefore).to.equal(creditAmount);
    });

    it("Should allow users to claim credits after others pay", async function () {
      const memberIds = [
        await cakeFactory.userIds(owner.address),
        await cakeFactory.userIds(user1.address),
        await cakeFactory.userIds(user2.address),
      ];
      
      const cakeId = await createCakeWithToken(await mockTokenA.getAddress(), memberIds, defaultWeights);
      
      // Create scenario using the same setup as cutCake test
      // Owner and user1 pay: owner -0.25, user1 -0.05, user2 +0.3
      const payerIds = [memberIds[0], memberIds[1]]; // owner and user1 pay
      const payedAmounts = [ethers.parseEther("1"), ethers.parseEther("0.5")];
      await cakeFactory.addBatchedCakeIngredients(cakeId, [], payerIds, payedAmounts);
      await cakeFactory.cutCake(cakeId);
      
      // Owner and user1 have debts, user2 has credit
      const ownerBalance = await cakeFactory.getCakeMemberBalance(cakeId, memberIds[0]);
      const user1Balance = await cakeFactory.getCakeMemberBalance(cakeId, memberIds[1]);
      const user2Balance = await cakeFactory.getCakeMemberBalance(cakeId, memberIds[2]);
      expect(ownerBalance).to.equal(-ethers.parseEther("0.25"));
      expect(user1Balance).to.equal(-ethers.parseEther("0.05"));
      expect(user2Balance).to.equal(ethers.parseEther("0.3"));
      
      // Owner pays debt (this transfers tokens to contract)
      const ownerDebt = -ownerBalance; // 0.25 ETH
      await mockTokenA.connect(owner).approve(await cakeFactory.getAddress(), ownerDebt);
      await cakeFactory.connect(owner).payCakeSlice(cakeId, mockTokenA, { value: 0 });
      
      // Now user2 can claim credit (contract should have tokens from owner's payment)
      const user2Credit = user2Balance; // 0.3 ETH
      const contractBalance = await mockTokenA.balanceOf(await cakeFactory.getAddress());
      expect(contractBalance).to.equal(ownerDebt); // Contract should have 0.25 ETH from owner
      
      // Contract has 0.25 ETH but user2 needs 0.3 ETH, so mint extra
      await mockTokenA.mint(await cakeFactory.getAddress(), user2Credit - contractBalance);
      
      await cakeFactory.connect(user2).claimCakeSlice(cakeId, mockTokenA);
      
      // Verify balances are zero after operations
      expect(await cakeFactory.getCakeMemberBalance(cakeId, memberIds[0])).to.equal(0n);
      expect(await cakeFactory.getCakeMemberBalance(cakeId, memberIds[2])).to.equal(0n);
      // User1 still has debt
      expect(await cakeFactory.getCakeMemberBalance(cakeId, memberIds[1])).to.equal(-ethers.parseEther("0.05"));
    });
  });

  describe("Payment and Claim Integration", function () {
    it("Should maintain correct balances after multiple operations", async function () {
      const memberIds = [
        await cakeFactory.userIds(owner.address),
        await cakeFactory.userIds(user1.address),
        await cakeFactory.userIds(user2.address),
      ];
      
      const cakeId = await createCakeWithToken(await mockTokenA.getAddress(), memberIds, defaultWeights);
      
      // First ingredient: owner and user1 pay (same as cutCake test)
      await cakeFactory.addBatchedCakeIngredients(
        cakeId,
        [],
        [memberIds[0], memberIds[1]],
        [ethers.parseEther("1"), ethers.parseEther("0.5")]
      );
      await cakeFactory.cutCake(cakeId);
      
      // Check balances: owner -0.25, user1 -0.05, user2 +0.3
      const balances1 = await cakeFactory.getCakeDetails(cakeId);
      expect(balances1[1][0]).to.equal(-ethers.parseEther("0.25"));
      expect(balances1[1][1]).to.equal(-ethers.parseEther("0.05"));
      expect(balances1[1][2]).to.equal(ethers.parseEther("0.3"));
      const sum1 = balances1[1].reduce((a, b) => a + b, 0n);
      expect(sum1).to.equal(0n); // Sum should be zero
      
      // Owner pays debt
      const ownerDebt = -balances1[1][0]; // 0.25 ETH
      await mockTokenA.connect(owner).approve(await cakeFactory.getAddress(), ownerDebt);
      await cakeFactory.connect(owner).payCakeSlice(cakeId, mockTokenA, { value: 0 });
      
      // User2 claims credit
      const user2Credit = balances1[1][2]; // 0.3 ETH
      // Contract should have 0.25 ETH from owner, but user2 needs 0.3, so mint extra
      const contractBalance = await mockTokenA.balanceOf(await cakeFactory.getAddress());
      if (contractBalance < user2Credit) {
        await mockTokenA.mint(await cakeFactory.getAddress(), user2Credit - contractBalance);
      }
      await cakeFactory.connect(user2).claimCakeSlice(cakeId, mockTokenA);
      
      // Verify balances after first round of operations
      const balancesAfterFirst = await cakeFactory.getCakeDetails(cakeId);
      expect(balancesAfterFirst[1][0]).to.equal(0n); // Owner paid
      expect(balancesAfterFirst[1][2]).to.equal(0n); // User2 claimed
      expect(balancesAfterFirst[1][1]).to.equal(-ethers.parseEther("0.05")); // User1 still has debt
      
      // Add another ingredient: user1 pays their remaining debt (0.05 ETH)
      // This will create new balances, but let's use a simpler scenario
      // User1 pays 0.05 ETH to clear their debt
      await mockTokenA.connect(user1).approve(await cakeFactory.getAddress(), ethers.parseEther("0.05"));
      await cakeFactory.connect(user1).payCakeSlice(cakeId, mockTokenA, { value: 0 });
      
      // Verify all balances are now zero
      const finalBalances = await cakeFactory.getCakeDetails(cakeId);
      expect(finalBalances[1][0]).to.equal(0n);
      expect(finalBalances[1][1]).to.equal(0n);
      expect(finalBalances[1][2]).to.equal(0n);
      
      // Verify sum is zero
      const sum2 = finalBalances[1].reduce((a, b) => a + b, 0n);
      expect(sum2).to.equal(0n);
    });

    it("Should handle payment with exact amount", async function () {
      const { cakeId, memberIds } = await setupCakeWithDebt(await mockTokenA.getAddress());
      
      const userId0 = memberIds[0]; // owner
      const balanceBefore = await cakeFactory.getCakeMemberBalance(cakeId, userId0);
      expect(balanceBefore).to.equal(-ethers.parseEther("0.25"));
      const debtAmount = -balanceBefore; // 0.25 ETH
      
      await mockTokenA.connect(owner).approve(await cakeFactory.getAddress(), debtAmount);
      await cakeFactory.connect(owner).payCakeSlice(cakeId, mockTokenA, { value: 0 });
      
      const balanceAfter = await cakeFactory.getCakeMemberBalance(cakeId, userId0);
      expect(balanceAfter).to.equal(0n);
    });
  });
});

