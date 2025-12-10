// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * MockSwapper: Simulates a pool swap without full Uniswap v4 setup.
 * Allows testing settlement flow end-to-end with real token transfers.
 */
contract MockSwapper {
    using SafeERC20 for IERC20;

    // Mock token balances to simulate pool liquidity
    mapping(address => mapping(address => uint256)) public poolBalances;

    event Swapped(address indexed tokenIn, address indexed tokenOut, uint256 amountIn, uint256 amountOut);

    // Initialize pool liquidity
    function initializePool(address token0, address token1, uint256 amount0, uint256 amount1) external {
        IERC20(token0).safeTransferFrom(msg.sender, address(this), amount0);
        IERC20(token1).safeTransferFrom(msg.sender, address(this), amount1);
        poolBalances[token0][address(this)] += amount0;
        poolBalances[token1][address(this)] += amount1;
    }

    // Mock swap: 1:1 exchange for simplicity
    function swap(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minAmountOut
    ) external returns (uint256 amountOut) {
        // Simple 1:1 swap (can adjust for slippage/fee if needed)
        amountOut = amountIn;
        
        require(amountOut >= minAmountOut, "Insufficient output");
        require(poolBalances[tokenOut][address(this)] >= amountOut, "Insufficient liquidity");

        IERC20(tokenIn).safeTransferFrom(msg.sender, address(this), amountIn);
        IERC20(tokenOut).safeTransfer(msg.sender, amountOut);

        poolBalances[tokenIn][address(this)] += amountIn;
        poolBalances[tokenOut][address(this)] -= amountOut;

        emit Swapped(tokenIn, tokenOut, amountIn, amountOut);
        return amountOut;
    }

    // Get pool balance
    function getBalance(address token) external view returns (uint256) {
        return poolBalances[token][address(this)];
    }
}
