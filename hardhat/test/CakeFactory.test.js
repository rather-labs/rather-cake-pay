const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture, time } = require("@nomicfoundation/hardhat-network-helpers");

describe("CakeFactory", function () {
  async function deployCakeFactoryFixture() {
    const [owner, alice, bob] = await ethers.getSigners();
    const CakeFactory = await ethers.getContractFactory("CakeFactory");
    const cakeFactory = await CakeFactory.deploy();
    await cakeFactory.waitForDeployment();

    const ownerId = await cakeFactory.registerUser(owner.address);
    const aliceId = await cakeFactory.registerUser(alice.address);
    const bobId = await cakeFactory.registerUser(bob.address);

    return {
      cakeFactory,
      owner,
      alice,
      bob,
      ownerId: Number(ownerId),
      aliceId: Number(aliceId),
      bobId: Number(bobId),
    };
  }

  describe("createCake", function () {
    it("stores weighted members and config", async function () {
      const { cakeFactory, ownerId, aliceId, bobId } = await loadFixture(deployCakeFactoryFixture);
      const weights = [5000, 3000, 2000];
      const tx = await cakeFactory.createCake(
        ethers.ZeroAddress,
        [ownerId, aliceId, bobId],
        weights,
        500, // 5% APR
        100, // 1% penalty
        7 * 24 * 60 * 60,
        2 * 24 * 60 * 60,
        true
      );
      await tx.wait();

      const totalCakes = await cakeFactory.totalCakes();
      expect(totalCakes).to.equal(1);

      const details = await cakeFactory.getCakeDetails(1);
      expect(details.memberIds).to.deep.equal([BigInt(ownerId), BigInt(aliceId), BigInt(bobId)]);
      expect(details.currentBalances.length).to.equal(3);
      expect(details.interestRate).to.equal(500);
      expect(details.token).to.equal(ethers.ZeroAddress);
    });

    it("reverts when weights do not sum to 100%", async function () {
      const { cakeFactory, ownerId, aliceId } = await loadFixture(deployCakeFactoryFixture);
      await expect(
        cakeFactory.createCake(ethers.ZeroAddress, [ownerId, aliceId], [6000, 1000], 0, 0, 1, 0, false)
      ).to.be.revertedWithCustomError(cakeFactory, "InvalidWeights");
    });
  });

  describe("cutCake", function () {
    async function createDefaultCake() {
      const fixture = await loadFixture(deployCakeFactoryFixture);
      const { cakeFactory, ownerId, aliceId, bobId } = fixture;
      const weights = [5000, 3000, 2000];
      await cakeFactory.createCake(
        ethers.ZeroAddress,
        [ownerId, aliceId, bobId],
        weights,
        1000,
        0,
        7 * 24 * 60 * 60,
        0,
        false
      );
      return { ...fixture, cakeId: 1, weights };
    }

    it("distributes ingredient amounts according to weights and payers", async function () {
      const { cakeFactory, ownerId, aliceId, bobId, cakeId } = await createDefaultCake();
      const amount = ethers.parseEther("1");
      await cakeFactory.addBatchedCakeIngredients(cakeId, [], [ownerId], [amount]);

      await expect(cakeFactory.cutCake(cakeId)).to.emit(cakeFactory, "CakeCutted");

      const ownerBalance = await cakeFactory.getCakeMemberBalance(cakeId, ownerId);
      const aliceBalance = await cakeFactory.getCakeMemberBalance(cakeId, aliceId);
      const bobBalance = await cakeFactory.getCakeMemberBalance(cakeId, bobId);

  expect(ownerBalance).to.equal(-ethers.parseEther("0.5"));
  expect(aliceBalance).to.equal(ethers.parseEther("0.3"));
  expect(bobBalance).to.equal(ethers.parseEther("0.2"));
    });

    it("applies interest after due date when cutting again", async function () {
      const { cakeFactory, ownerId, aliceId, cakeId } = await createDefaultCake();
      const amount = ethers.parseEther("1");
      await cakeFactory.addBatchedCakeIngredients(cakeId, [], [ownerId], [amount]);
      await cakeFactory.cutCake(cakeId);

      const oneYear = 365 * 24 * 60 * 60;
      await time.increase(oneYear + 8 * 24 * 60 * 60);

      await cakeFactory.addBatchedCakeIngredients(cakeId, [], [ownerId], [0n]);
      await cakeFactory.cutCake(cakeId);

      const aliceBalance = await cakeFactory.getCakeMemberBalance(cakeId, aliceId);
      expect(aliceBalance).to.be.gt(ethers.parseEther("0.3"));
    });
  });
});
