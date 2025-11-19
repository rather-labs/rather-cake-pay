const { expect } = require("chai");
const { ethers } = require("hardhat");


describe("CakeFactory - createCake", function () {
    let CakeFactory, cakeFactory, owner, addr1, addr2, addr3;


    const billingPeriod = 7 * 24 * 60 * 60; // one week in seconds
    const interestRate = 150; // basis points


    beforeEach(async function () {
        CakeFactory = await ethers.getContractFactory("CakeFactory");
        cakeFactory = await CakeFactory.deploy();
        await cakeFactory.waitForDeployment();
        [owner, addr1, addr2, addr3] = await ethers.getSigners();
    });


    async function registerParticipants() {
        await cakeFactory.registerUser(owner.address);
        await cakeFactory.registerUser(addr1.address);
        await cakeFactory.registerUser(addr2.address);


        return [
            await cakeFactory.userIds(owner.address),
            await cakeFactory.userIds(addr1.address),
            await cakeFactory.userIds(addr2.address),
        ];
    }


    it("should create a cake and initialize all metadata", async function () {
        const memberIds = await registerParticipants();
        const memberWeights = [5000, 3000, 2000];


        await cakeFactory.createCake(
            ethers.ZeroAddress,
            memberIds,
            memberWeights,
            interestRate,
            billingPeriod
        );


        const cakeId = await cakeFactory.totalCakes();
        expect(cakeId).to.equal(1n);


        const [storedMemberIds, balances, storedInterestRate, active, storedToken] =
            await cakeFactory.getCakeDetails(cakeId);


        expect(active).to.be.true;
        expect(Number(storedInterestRate)).to.equal(interestRate);
        expect(storedToken).to.equal(ethers.ZeroAddress);
        expect(storedMemberIds.map(Number)).to.deep.equal(
            memberIds.map(Number)
        );


        for (const balance of balances) {
            expect(balance).to.equal(0n);
        }


        for (const memberId of memberIds) {
            expect(await cakeFactory.userCakes(memberId, cakeId)).to.be.true;
        }
    });


    it("reverts when the weights do not sum to 10,000 BPS", async function () {
        const memberIds = await registerParticipants();
        const invalidWeights = [5000, 3000, 1000];


        await expect(
            cakeFactory.createCake(
                ethers.ZeroAddress,
                memberIds,
                invalidWeights,
                interestRate,
                billingPeriod
            )
        ).to.be.revertedWithCustomError(cakeFactory, "InvalidWeights");
    });


    it("reverts when there are duplicate members", async function () {
        const memberIds = await registerParticipants();
        const duplicateMemberIds = [memberIds[0], memberIds[1], memberIds[0]];
        const memberWeights = [5000, 3000, 2000];


        await expect(
            cakeFactory.createCake(
                ethers.ZeroAddress,
                duplicateMemberIds,
                memberWeights,
                interestRate,
                billingPeriod
            )
        ).to.be.revertedWithCustomError(cakeFactory, "DuplicateMember");
    });


    it("reverts when a member is not registered", async function () {
        const memberIds = await registerParticipants();
        const unregisteredMemberId = memberIds.concat(9999);
        const memberWeights = [4000, 3000, 2000, 1000];


        await expect(
            cakeFactory.createCake(
                ethers.ZeroAddress,
                unregisteredMemberId,
                memberWeights,
                interestRate,
                billingPeriod
            )
        ).to.be.revertedWithCustomError(cakeFactory, "MemberNotRegistered");
    });


    it("reverts when billing period is zero", async function () {
        const memberIds = await registerParticipants();
        const memberWeights = [5000, 3000, 2000];


        await expect(
            cakeFactory.createCake(
                ethers.ZeroAddress,
                memberIds,
                memberWeights,
                interestRate,
                0 // Invalid billing period
            )
        ).to.be.revertedWithCustomError(cakeFactory, "InvalidBillingPeriod");
    });


    it("reverts when there are fewer than 2 members", async function () {
        const memberIds = await registerParticipants();
        const singleMember = [memberIds[0]];
        const memberWeights = [10000];


        await expect(
            cakeFactory.createCake(
                ethers.ZeroAddress,
                singleMember,
                memberWeights,
                interestRate,
                billingPeriod
            )
        ).to.be.revertedWithCustomError(cakeFactory, "InvalidMembers");
    });


    it("creates a cake with a valid token address", async function () {
        const memberIds = await registerParticipants();
        const memberWeights = [5000, 3000, 2000];
        const tokenAddress = addr3.address;


        await cakeFactory.createCake(
            tokenAddress,
            memberIds,
            memberWeights,
            interestRate,
            billingPeriod
        );


        const cakeId = await cakeFactory.totalCakes();
        const [, , , , storedToken] = await cakeFactory.getCakeDetails(cakeId);
        expect(storedToken).to.equal(tokenAddress);
    });


    it("handles large arrays of members and weights", async function () {
        const numMembers = 50;
        const memberIds = [];
        const memberWeights = [];
        const weightPerMember = Math.floor(10000 / numMembers);


        for (let i = 0; i < numMembers; i++) {
            const user = ethers.Wallet.createRandom();
            await cakeFactory.registerUser(user.address);
            memberIds.push(await cakeFactory.userIds(user.address));
            memberWeights.push(weightPerMember);
        }


        // Adjust the last weight to ensure the sum is exactly 10,000
        memberWeights[memberWeights.length - 1] += 10000 - memberWeights.reduce((a, b) => a + b, 0);


        await cakeFactory.createCake(
            ethers.ZeroAddress,
            memberIds,
            memberWeights,
            interestRate,
            billingPeriod
        );


        const cakeId = await cakeFactory.totalCakes();
        expect(cakeId).to.equal(1n);
    });
});
