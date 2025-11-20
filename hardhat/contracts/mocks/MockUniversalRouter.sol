// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title MockUniversalRouter
 * @notice Mock implementation of UniversalRouter for testing
 */
contract MockUniversalRouter {
    /**
     * @notice Mock execute function that accepts any call
     */
    function execute(
        bytes calldata commands,
        bytes[] calldata inputs,
        uint256 deadline
    ) external payable {
        // Mock implementation - just accept the call
        // In real tests, this could track calls or simulate swap behavior
    }
}

