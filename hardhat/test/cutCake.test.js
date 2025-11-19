const { expect } = require("chai");
const { ethers, network } = require("hardhat");

describe("CakeFactory - cutCake", function () {
	let cakeFactory;
	let owner, addr1, addr2, addr3;
	const billingPeriod = 7 * 24 * 60 * 60; // one week
	const interestRate = 150; // 1.5% per overdue period
	const defaultWeights = [5000, 3000, 2000];

	beforeEach(async function () {
		const CakeFactory = await ethers.getContractFactory("CakeFactory");
		cakeFactory = await CakeFactory.deploy();
		await cakeFactory.waitForDeployment();
		[owner, addr1, addr2, addr3] = await ethers.getSigners();
	});

	async function register(address) {
		await cakeFactory.registerUser(address);
		return cakeFactory.userIds(address);
	}

	async function addIngredient(cakeId, weights, payerIds, payedAmounts) {
		await cakeFactory.addBatchedCakeIngredients(cakeId, weights, payerIds, payedAmounts);
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

	async function addDefaultIngredient(cakeId, memberIds) {
		const payerIds = [memberIds[0], memberIds[1]];
		const payedAmounts = [ethers.parseEther("1"), ethers.parseEther("0.5")];
		await addIngredient(cakeId, [], payerIds, payedAmounts);
	}

	it("splits pending ingredients and updates cake state", async function () {
		const { cakeId, memberIds } = await createDefaultCake();
		await addDefaultIngredient(cakeId, memberIds);

		await expect(cakeFactory.cutCake(cakeId))
			.to.emit(cakeFactory, "CakeCutted")
			.withArgs(cakeId);

		const [, balances] = await cakeFactory.getCakeDetails(cakeId);
		expect(balances[0]).to.equal(-ethers.parseEther("0.25"));
		expect(balances[1]).to.equal(-ethers.parseEther("0.05"));
		expect(balances[2]).to.equal(ethers.parseEther("0.3"));

		const cakeData = await cakeFactory.cakes(cakeId);
		expect(cakeData.lastCutBatchedIngredientsId).to.equal(1);
		expect(cakeData.lastCutAt).to.be.gt(0);
		expect(cakeData.nextDueAt).to.equal(cakeData.lastCutAt + BigInt(billingPeriod));
	});

	it("reverts when there are no ingredients to cut", async function () {
		const { cakeId } = await createDefaultCake();
		await expect(cakeFactory.cutCake(cakeId)).to.be.revertedWithCustomError(
			cakeFactory,
			"NothingToCut"
		);
	});

	it("reverts when caller is not a member", async function () {
		const { cakeId, memberIds } = await createDefaultCake();
		await addDefaultIngredient(cakeId, memberIds);

		await expect(
			cakeFactory.connect(addr3).cutCake(cakeId)
		).to.be.revertedWithCustomError(cakeFactory, "NotMember");
	});

	it("applies interest to overdue positive balances", async function () {
		const { cakeId, memberIds } = await createDefaultCake();
		await addDefaultIngredient(cakeId, memberIds);
		await cakeFactory.cutCake(cakeId);

		await network.provider.send("evm_increaseTime", [billingPeriod + 60]);
		await network.provider.send("evm_mine");

		const secondPayerIds = [memberIds[0]];
		const secondAmounts = [ethers.parseEther("0.3")];
		await cakeFactory.addBatchedCakeIngredients(
			cakeId,
			[],
			secondPayerIds,
			secondAmounts
		);

		await cakeFactory.cutCake(cakeId);

		const [, balances] = await cakeFactory.getCakeDetails(cakeId);
		const expectedOwner = -ethers.parseEther("0.4");
		const expectedAddr1 = ethers.parseEther("0.04");
		const expectedAddr2 = ethers.parseEther("0.3645");

		expect(balances[0]).to.equal(expectedOwner);
		expect(balances[1]).to.equal(expectedAddr1);
		expect(balances[2]).to.equal(expectedAddr2);
	});

	it("processes multiple ingredients and only once per cut", async function () {
		const { cakeId, memberIds } = await createDefaultCake();
		await addDefaultIngredient(cakeId, memberIds);
		await addDefaultIngredient(cakeId, memberIds);

		await cakeFactory.cutCake(cakeId);
		const [, balancesAfterFirst] = await cakeFactory.getCakeDetails(cakeId);
		expect(balancesAfterFirst[0]).to.equal(-ethers.parseEther("0.5"));
		expect(balancesAfterFirst[1]).to.equal(-ethers.parseEther("0.1"));
		expect(balancesAfterFirst[2]).to.equal(ethers.parseEther("0.6"));

		const cakeDataAfterFirst = await cakeFactory.cakes(cakeId);
		expect(cakeDataAfterFirst.lastCutBatchedIngredientsId).to.equal(2);

		await addDefaultIngredient(cakeId, memberIds);
		await cakeFactory.connect(addr1).cutCake(cakeId);
		const [, balancesAfterSecond] = await cakeFactory.getCakeDetails(cakeId);
		expect(balancesAfterSecond[0]).to.equal(-ethers.parseEther("0.75"));
		expect(balancesAfterSecond[1]).to.equal(-ethers.parseEther("0.15"));
		expect(balancesAfterSecond[2]).to.equal(ethers.parseEther("0.9"));

		await expect(cakeFactory.cutCake(cakeId)).to.be.revertedWithCustomError(
			cakeFactory,
			"NothingToCut"
		);
	});

	it("honors per-ingredient weight overrides", async function () {
		const { cakeId, memberIds } = await createDefaultCake();
		const overrideWeights = [2000, 0, 8000];
		const payerIds = [memberIds[2]];
		const payedAmounts = [ethers.parseEther("1")];
		await addIngredient(cakeId, overrideWeights, payerIds, payedAmounts);

		await cakeFactory.cutCake(cakeId);
		const [, balances] = await cakeFactory.getCakeDetails(cakeId);
		expect(balances[0]).to.equal(ethers.parseEther("0.2"));
		expect(balances[1]).to.equal(0n);
		expect(balances[2]).to.equal(-ethers.parseEther("0.2"));
	});

	it("applies at least one interest period for minimal overdue time", async function () {
		const { cakeId, memberIds } = await createDefaultCake();
		await addDefaultIngredient(cakeId, memberIds);
		await cakeFactory.cutCake(cakeId);
		let cakeData = await cakeFactory.cakes(cakeId);

		const overdueTimestamp = Number(cakeData.nextDueAt + 10n);
		await network.provider.send("evm_setNextBlockTimestamp", [overdueTimestamp]);
		await network.provider.send("evm_mine");

		const payerIds = [memberIds[0]];
		const payedAmounts = [ethers.parseEther("0.1")];
		await addIngredient(cakeId, [], payerIds, payedAmounts);
		await cakeFactory.cutCake(cakeId);

		const [, balances] = await cakeFactory.getCakeDetails(cakeId);
		cakeData = await cakeFactory.cakes(cakeId);
		expect(cakeData.lastCutBatchedIngredientsId).to.equal(2);
		expect(balances[2]).to.equal(ethers.parseEther("0.3245"));
	});
});
