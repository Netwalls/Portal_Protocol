// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import "forge-std/Script.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "v4-core/interfaces/IPoolManager.sol";
import "v4-core/types/PoolKey.sol";
import "v4-core/types/PoolId.sol";
import "v4-core/types/Currency.sol";

// Test ERC20
contract TestToken is ERC20 {
    constructor(string memory name, string memory symbol) ERC20(name, symbol) {
        _mint(msg.sender, 1000000 ether);
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    function approve(address spender, uint256 amount) public override returns (bool) {
        _approve(msg.sender, spender, amount);
        return true;
    }
}

contract SetupRealPool is Script {
    IPoolManager constant poolManager = IPoolManager(0x8bA5Fb2b1339541EDF0b6Ba16F0564e31b4b35A9);
    
    function run() public {
        vm.startBroadcast();

        // Deploy USDC
        TestToken usdc = new TestToken("USD Coin", "USDC");
        console.log("USDC:", address(usdc));

        // Deploy DAI
        TestToken dai = new TestToken("Dai Stablecoin", "DAI");
        console.log("DAI:", address(dai));

        // Mint to deployer
        usdc.mint(msg.sender, 100000 ether);
        dai.mint(msg.sender, 100000 ether);

        // Approve pool manager
        usdc.approve(address(poolManager), type(uint256).max);
        dai.approve(address(poolManager), type(uint256).max);

        // Ensure USDC < DAI for currency0/currency1 ordering
        address currency0 = address(usdc) < address(dai) ? address(usdc) : address(dai);
        address currency1 = address(usdc) < address(dai) ? address(dai) : address(usdc);

        console.log("currency0:", currency0);
        console.log("currency1:", currency1);

        // Create pool key
        PoolKey memory key = PoolKey({
            currency0: Currency.wrap(currency0),
            currency1: Currency.wrap(currency1),
            fee: 3000,
            tickSpacing: 60,
            hooks: IHooks(address(0))
        });

        // Initialize pool at price 1:1 (sqrtPriceX96 for 1:1)
        // sqrtPrice for 1:1 is 2^96 = 79228162514264337593543950336
        uint160 sqrtPriceX96 = 79228162514264337593543950336;
        
        poolManager.initialize(key, sqrtPriceX96);
        console.log("Pool initialized");

        vm.stopBroadcast();
    }
}
