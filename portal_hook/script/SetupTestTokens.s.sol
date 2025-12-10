// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import "forge-std/Script.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

// Simple test ERC20
contract TestToken is ERC20 {
    constructor(string memory name, string memory symbol) ERC20(name, symbol) {
        _mint(msg.sender, 1000000 ether);
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

contract SetupTestTokens is Script {
    function run() public {
        vm.startBroadcast();

        // Deploy USDC
        TestToken usdc = new TestToken("USD Coin", "USDC");
        console.log("USDC deployed at:", address(usdc));

        // Deploy DAI
        TestToken dai = new TestToken("Dai Stablecoin", "DAI");
        console.log("DAI deployed at:", address(dai));

        // Mint some to the deployer
        usdc.mint(msg.sender, 1000000 ether);
        dai.mint(msg.sender, 1000000 ether);

        vm.stopBroadcast();
    }
}
