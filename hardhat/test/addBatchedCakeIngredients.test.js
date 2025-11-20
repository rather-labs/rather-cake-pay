const { expect } = require("chai");
const { ethers } = require("hardhat");


describe("CakeFactory - addBatchedCakeIngredients", function () {
	let cakeFactory;
	let mockRouter, mockPoolManager, mockPermit2;
	let owner, addr1, addr2, addr3;
	const billingPeriod = 7 * 24 * 60 * 60; // one week
	const interestRate = 150; // basis points
	const defaultWeights = [5000, 3000, 2000];


	beforeEach(async function () {
		[owner, addr1, addr2, addr3] = await ethers.getSigners();

		// Deploy mock contracts
		const MockRouterFactory = await ethers.getContractFactory("MockUniversalRouter");
		const MockPoolManagerFactory = await ethers.getContractFactory("MockPoolManager");
		const MockPermit2Factory = await ethers.getContractFactory("MockPermit2");

		mockRouter = await MockRouterFactory.deploy();
		mockPoolManager = await MockPoolManagerFactory.deploy();
		mockPermit2 = await MockPermit2Factory.deploy();

		// Deploy CakeFactory with mock addresses
		const CakeFactory = await ethers.getContractFactory("CakeFactory");
		cakeFactory = await CakeFactory.deploy(
			await mockRouter.getAddress(),
			await mockPoolManager.getAddress(),
			await mockPermit2.getAddress()
		);
		await cakeFactory.waitForDeployment();
	});


	async function register(address) {
		await cakeFactory.registerUser(address);
		return cakeFactory.userIds(address);
	}


	async function createDefaultCake() {
		const members = [owner.address, addr1.address, addr2.address];
		const memberIds = [];
		for (const member of members) {
			memberIds.push(await register(member));
		}

		await cakeFactory.createCake(
			ethers.ZeroAddress,
			memberIds,
			defaultWeights,
			interestRate,
			billingPeriod
		);

		const cakeId = await cakeFactory.totalCakes();
		return { cakeId, memberIds };
	}


	it("stores batched ingredients and defaults weights when omitted", async function () {
		const { cakeId, memberIds } = await createDefaultCake();
		const payerIds = [memberIds[0], memberIds[1]];
		const payedAmounts = [ethers.parseEther("1"), ethers.parseEther("0.5")];

		await expect(
			cakeFactory.addBatchedCakeIngredients(cakeId, [], payerIds, payedAmounts)
		)
			.to.emit(cakeFactory, "BatchedCakeIngredientsAdded")
			.withArgs(1, cakeId);

		const [weights, storedPayerIds, storedPayedAmounts, createdAt] =
			await cakeFactory.getCakeIngredientDetails(cakeId, 1);

		expect(weights.map(Number)).to.deep.equal(defaultWeights);
		expect(storedPayerIds.map(Number)).to.deep.equal(payerIds.map(Number));
		expect(storedPayedAmounts.map((v) => v.toString())).to.deep.equal(
			payedAmounts.map((v) => v.toString())
		);
		expect(createdAt).to.be.gt(0);
	});


	it("stores custom weights when provided", async function () {
		const { cakeId, memberIds } = await createDefaultCake();
		const overrideWeights = [6000, 2000, 2000];
		const payerIds = [memberIds[2]];
		const payedAmounts = [ethers.parseEther("2")];

		await cakeFactory.addBatchedCakeIngredients(
			cakeId,
			overrideWeights,
			payerIds,
			payedAmounts
		);

		const [weights] = await cakeFactory.getCakeIngredientDetails(cakeId, 1);
		expect(weights.map(Number)).to.deep.equal(overrideWeights);
	});


	it("reverts when the cake does not exist", async function () {
		const nonExistentCakeId = 999;
		const dummyWeights = [10000, 0];

		await expect(
			cakeFactory.addBatchedCakeIngredients(
				nonExistentCakeId,
				dummyWeights,
				[1],
				[ethers.parseEther("1")]
			)
		).to.be.revertedWithCustomError(cakeFactory, "CakeDoesNotExist");
	});


	it("reverts when payer arrays are empty or mismatched", async function () {
		const { cakeId, memberIds } = await createDefaultCake();

		await expect(
			cakeFactory.addBatchedCakeIngredients(cakeId, [], [], [])
		).to.be.revertedWithCustomError(cakeFactory, "InvalidMembers");

		await expect(
			cakeFactory.addBatchedCakeIngredients(
				cakeId,
				[],
				[memberIds[0]],
				[ethers.parseEther("1"), ethers.parseEther("0.2")]
			)
		).to.be.revertedWithCustomError(cakeFactory, "InvalidMembers");
	});


	it("reverts when custom weights length mismatches members", async function () {
		const { cakeId, memberIds } = await createDefaultCake();
		const invalidWeights = [7000, 3000];

		await expect(
			cakeFactory.addBatchedCakeIngredients(
				cakeId,
				invalidWeights,
				[memberIds[0]],
				[ethers.parseEther("1")]
			)
		).to.be.revertedWithCustomError(cakeFactory, "InvalidWeights");
	});


	it("reverts when custom weights do not sum to 10,000 BPS", async function () {
		const { cakeId, memberIds } = await createDefaultCake();
		const invalidWeights = [6000, 2000, 1000];

		await expect(
			cakeFactory.addBatchedCakeIngredients(
				cakeId,
				invalidWeights,
				[memberIds[0]],
				[ethers.parseEther("1")]
			)
		).to.be.revertedWithCustomError(cakeFactory, "InvalidWeights");
	});


	it("reverts when any payer is not a member", async function () {
		const { cakeId, memberIds } = await createDefaultCake();

		const outsiderId = await register(addr3.address);

		await expect(
			cakeFactory.addBatchedCakeIngredients(
				cakeId,
				[],
				[memberIds[0], outsiderId],
				[ethers.parseEther("1"), ethers.parseEther("0.2")]
			)
		).to.be.revertedWithCustomError(cakeFactory, "NotMember");
	});


	it("reverts when requesting details for a missing ingredient", async function () {
		const { cakeId } = await createDefaultCake();

		await expect(
			cakeFactory.getCakeIngredientDetails(cakeId, 999)
		).to.be.revertedWithCustomError(cakeFactory, "IngredientDoesNotExist");
	});
});
