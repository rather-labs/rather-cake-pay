// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title MockPermit2
 * @notice Mock implementation of IPermit2 for testing
 */
contract MockPermit2 {
    /**
     * @notice Mock approve function
     */
    function approve(
        address token,
        address spender,
        uint160 amount,
        uint48 expiration
    ) external {
        // Mock implementation - just accept the approval
    }
}

