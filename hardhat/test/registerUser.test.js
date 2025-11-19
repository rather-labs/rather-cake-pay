const { expect } = require("chai");
const { ethers } = require("hardhat");


describe("CakeFactory - registerUser", function () {
    let CakeFactory, cakeFactory, owner, addr1, addr2;


    beforeEach(async function () {
        // Deploy the CakeFactory contract
        CakeFactory = await ethers.getContractFactory("CakeFactory");//contract factory
        cakeFactory = await CakeFactory.deploy();//deploy contract
        await cakeFactory.waitForDeployment();


        // Get signers
        [owner, addr1, addr2] = await ethers.getSigners();
        console.log(addr1.address); // Prints the Ethereum address of addr1
        console.log(addr2.address); // Prints the Ethereum address of addr2
    });


    it("should register a new user and return the correct user ID", async function () {
        // Register the owner
        const tx = await cakeFactory.registerUser(owner.address);
        const receipt = await tx.wait();


        // Check the user ID
        const userId = await cakeFactory.userIds(owner.address);
        expect(userId).to.equal(1);
    });


    it("should not register the same user twice", async function () {
        // Register the user once
        await cakeFactory.registerUser(addr1.address);


        // Try registering the same user again
        const userId = await cakeFactory.registerUser(addr1.address);


        // Check that the user ID remains the same
        expect(await cakeFactory.userIds(addr1.address)).to.equal(1);
    });


    it("should register multiple users and assign unique IDs", async function () {
        // Register multiple users
        await cakeFactory.registerUser(addr1.address);
        await cakeFactory.registerUser(addr2.address);


        // Check user IDs
        expect(await cakeFactory.userIds(addr1.address)).to.equal(1);
        expect(await cakeFactory.userIds(addr2.address)).to.equal(2);
    });
});
