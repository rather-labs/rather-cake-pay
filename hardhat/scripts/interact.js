const hre = require("hardhat");

async function main() {
  // Get the signer (default account)
  const [deployer] = await hre.ethers.getSigners();
  console.log("Using deployer:", deployer.address);

  // Replace with the deployed contract address
  const contractAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

  // Attach to the deployed contract
  const CakeFactory = await hre.ethers.getContractFactory("CakeFactory");
  const cakeFactory = await CakeFactory.attach(contractAddress);

  try {
    // Register the deployer
    console.log("Calling registerUser for deployer...");
    let tx = await cakeFactory.registerUser(deployer.address); // Send the transaction
    await tx.wait(); // Wait for the transaction to be mined
    let userId = await cakeFactory.userIds(deployer.address); // Query the userId from the mapping
    console.log("Registered Deployer User ID:", userId.toString());

    // Register Alice
    const alice = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8"; // Address 01
    console.log("Calling registerUser for Alice...");
    tx = await cakeFactory.registerUser(alice);
    await tx.wait();
    userId = await cakeFactory.userIds(alice);
    console.log("Registered Alice User ID:", userId.toString());

    // Register Bob
    const bob = "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC"; // Address 02
    console.log("Calling registerUser for Bob...");
    tx = await cakeFactory.registerUser(bob);
    await tx.wait();
    userId = await cakeFactory.userIds(bob);
    console.log("Registered Bob User ID:", userId.toString());

  } catch (error) {
    console.error("An error occurred:", error);
  }
}

// Run the script
main().catch((error) => {
  console.error("Unhandled error:", error);
  process.exitCode = 1;
});