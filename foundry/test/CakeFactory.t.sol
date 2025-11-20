// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Test} from "forge-std/Test.sol";
import {CakeFactory} from "../src/CakeFactory.sol";

contract CakeFactoryTest is Test {
    CakeFactory public cakeFactory;

    function setUp() public {
        cakeFactory = new CakeFactory();
    }
}
