#!/bin/bash

# Step 1: Remove Ignition Deployment Artifacts
rm -rf ignition/deployments/chain-1337

# Step 2: Compile Contracts
npm run compile

# Step 3: Start Hardhat Node in the Current Terminal
if ! pgrep -f "hardhat node" > /dev/null; then
  echo "Starting Hardhat node..."
  npx hardhat node &
  NODE_PID=$!
  echo "Hardhat node started with PID $NODE_PID."
else
  echo "Hardhat node is already running."
fi