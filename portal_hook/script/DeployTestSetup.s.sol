// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import "forge-std/Script.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {MockSwapper} from "../src/MockSwapper.sol";

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

contract DeployTestSetup is Script {
    function run() public {
        vm.startBroadcast();

        // Deploy tokens
        TestToken usdc = new TestToken("USD Coin", "USDC");
        TestToken dai = new TestToken("Dai Stablecoin", "DAI");

        console.log("USDC:", address(usdc));
        console.log("DAI:", address(dai));

        // Deploy mock swapper
        MockSwapper swapper = new MockSwapper();
        console.log("MockSwapper:", address(swapper));

        // Approve and initialize pool with liquidity
        usdc.approve(address(swapper), type(uint256).max);
        dai.approve(address(swapper), type(uint256).max);

        swapper.initializePool(address(usdc), address(dai), 100000 ether, 100000 ether);

        console.log("Pool initialized with 100000 USDC and 100000 DAI");

        vm.stopBroadcast();
    }
}
