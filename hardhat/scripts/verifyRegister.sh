#!/bin/bash

# Step 1: Deploy Contracts Using Ignition
npx hardhat ignition deploy ignition/modules/CakeFactory.js --network localhost

# Step 2: Run Interaction Script
npx hardhat run --network localhost scripts/interact.js