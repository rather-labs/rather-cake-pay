const hre = require("hardhat");
require("dotenv").config();

/**
 * Script to transfer funds from account 0 (default Hardhat account) to other accounts
 * 
 * Usage:
 *   node scripts/transferFunds.js
 *   node scripts/transferFunds.js --network localhost
 *   node scripts/transferFunds.js --amount 1.0 --to 0x123... 0x456...
 * 
 * Environment Variables:
 *   USER_ADDRESS - Address to transfer funds to (can be comma-separated for multiple addresses)
 */

async function main() {
  // Get all signers
  const signers = await hre.ethers.getSigners();
  const sender = signers[0]; // Account 0 (default account with all funds)

  console.log("=".repeat(60));
  console.log("Fund Transfer Script");
  console.log("=".repeat(60));
  console.log(`Sender: ${sender.address}`);
  console.log(`Sender balance: ${hre.ethers.formatEther(await hre.ethers.provider.getBalance(sender.address))} ETH\n`);

  // Parse command line arguments
  const args = process.argv.slice(2);
  const networkIndex = args.indexOf("--network");
  const amountIndex = args.indexOf("--amount");
  const toIndex = args.indexOf("--to");

  // Get amount to transfer (default: 100 ETH per account)
  let amountPerAccount = hre.ethers.parseEther("100");
  if (amountIndex !== -1 && args[amountIndex + 1]) {
    const amountStr = args[amountIndex + 1];
    amountPerAccount = hre.ethers.parseEther(amountStr);
  }

  // Get recipient addresses
  let recipients = [];
  
  // Priority: 1. --to flag, 2. USER_ADDRESS env var, 3. All Hardhat accounts
  if (toIndex !== -1) {
    // Get addresses after --to flag
    recipients = args.slice(toIndex + 1).filter((arg) => arg.startsWith("0x"));
  } else if (process.env.USER_ADDRESS) {
    // Use USER_ADDRESS from environment file (can be comma-separated)
    recipients = process.env.USER_ADDRESS.split(",")
      .map((addr) => addr.trim())
      .filter((addr) => addr.startsWith("0x"));
    
    if (recipients.length > 0) {
      console.log(`Using USER_ADDRESS from environment: ${recipients.length} address(es)`);
    }
  }
  
  // If still no recipients, default to all other Hardhat accounts (accounts 1-19)
  if (recipients.length === 0) {
    recipients = signers.slice(1).map((signer) => signer.address);
    console.log("No USER_ADDRESS found in .env, using all Hardhat accounts (1-19)");
  }

  if (recipients.length === 0) {
    console.log("No recipients specified. Use --to <address1> <address2> ... to specify recipients.");
    console.log("Or the script will transfer to all Hardhat accounts (1-19) by default.");
    return;
  }

  console.log(`Amount per account: ${hre.ethers.formatEther(amountPerAccount)} ETH`);
  console.log(`Number of recipients: ${recipients.length}\n`);

  // Validate addresses
  const invalidAddresses = recipients.filter((addr) => !hre.ethers.isAddress(addr));
  if (invalidAddresses.length > 0) {
    console.error("Invalid addresses:", invalidAddresses);
    return;
  }

  // Calculate total amount needed
  const totalAmount = amountPerAccount * BigInt(recipients.length);
  const senderBalance = await hre.ethers.provider.getBalance(sender.address);

  if (senderBalance < totalAmount) {
    console.error(
      `Insufficient balance. Need ${hre.ethers.formatEther(totalAmount)} ETH, ` +
      `but sender has ${hre.ethers.formatEther(senderBalance)} ETH`
    );
    return;
  }

  // Transfer funds to each recipient
  console.log("Transferring funds...\n");
  const results = [];

  for (let i = 0; i < recipients.length; i++) {
    const recipient = recipients[i];
    try {
      // Get balance before transfer
      const balanceBefore = await hre.ethers.provider.getBalance(recipient);

      // Send transaction
      const tx = await sender.sendTransaction({
        to: recipient,
        value: amountPerAccount,
      });

      console.log(`[${i + 1}/${recipients.length}] Sending ${hre.ethers.formatEther(amountPerAccount)} ETH to ${recipient}...`);
      console.log(`  Transaction hash: ${tx.hash}`);

      // Wait for confirmation
      const receipt = await tx.wait();
      console.log(`  ✓ Confirmed in block ${receipt.blockNumber}`);

      // Get balance after transfer
      const balanceAfter = await hre.ethers.provider.getBalance(recipient);
      console.log(`  Balance: ${hre.ethers.formatEther(balanceBefore)} → ${hre.ethers.formatEther(balanceAfter)} ETH\n`);

      results.push({
        recipient,
        success: true,
        txHash: tx.hash,
        amount: hre.ethers.formatEther(amountPerAccount),
      });
    } catch (error) {
      console.error(`  ✗ Failed to transfer to ${recipient}:`, error.message);
      results.push({
        recipient,
        success: false,
        error: error.message,
      });
    }
  }

  // Summary
  console.log("=".repeat(60));
  console.log("Transfer Summary");
  console.log("=".repeat(60));
  const successful = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;
  console.log(`Successful: ${successful}`);
  console.log(`Failed: ${failed}`);

  if (successful > 0) {
    console.log("\nSuccessful transfers:");
    results
      .filter((r) => r.success)
      .forEach((r) => {
        console.log(`  ✓ ${r.recipient} - ${r.amount} ETH (${r.txHash})`);
      });
  }

  if (failed > 0) {
    console.log("\nFailed transfers:");
    results
      .filter((r) => !r.success)
      .forEach((r) => {
        console.log(`  ✗ ${r.recipient} - ${r.error}`);
      });
  }

  // Final balances
  console.log("\n" + "=".repeat(60));
  console.log("Final Balances");
  console.log("=".repeat(60));
  const finalSenderBalance = await hre.ethers.provider.getBalance(sender.address);
  console.log(`Sender: ${hre.ethers.formatEther(finalSenderBalance)} ETH`);

  if (recipients.length <= 10) {
    // Show balances for all recipients if not too many
    for (const recipient of recipients) {
      const balance = await hre.ethers.provider.getBalance(recipient);
      console.log(`${recipient}: ${hre.ethers.formatEther(balance)} ETH`);
    }
  } else {
    console.log(`\n(${recipients.length} recipients - balances not shown)`);
  }
}

// Run the script
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Unhandled error:", error);
    process.exitCode = 1;
  });

