// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "forge-std/Script.sol";
import "forge-std/console2.sol";
import {CakeFactory} from "../src/CakeFactory.sol";

contract DeployCakeFactory is Script {
    function run() external returns (CakeFactory deployed) {
        address router = vm.envAddress("ROUTER_ADDRESS");
        address poolManager = vm.envAddress("POOL_MANAGER_ADDRESS");
        address permit2 = vm.envAddress("PERMIT2_ADDRESS");
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");

        require(router != address(0), "ROUTER_ADDRESS not set");
        require(poolManager != address(0), "POOL_MANAGER_ADDRESS not set");
        require(permit2 != address(0), "PERMIT2_ADDRESS not set");
        require(deployerPrivateKey != 0, "PRIVATE_KEY not set");

        vm.startBroadcast(deployerPrivateKey);
        deployed = new CakeFactory(router, poolManager, permit2);
        vm.stopBroadcast();

        console2.log("CakeFactory deployed at:", address(deployed));
    }
}
