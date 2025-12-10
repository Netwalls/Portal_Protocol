// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import "forge-std/Script.sol";
import "../src/PortalHook.sol";

/// @notice Deploy PortalHook for local testing
/// Usage:
/// 1) Start anvil: anvil --chain-id 31337
/// 2) Run:
///    forge script script/DeployPortalHook.s.sol:DeployPortalHook --rpc-url http://127.0.0.1:8545 --private-key <PRIVATE_KEY> --broadcast
/// The script will deploy PortalHook with PoolManager set to address(0) and auctioneer set to deployer address.
contract DeployPortalHook is Script {
    function run() external {
        // Read deployer key from env (passed via --private-key or env var)
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");

        // Optional: if you have a local PoolManager for full DEX testing, set POOL_MANAGER env var to its address.
        // Otherwise we'll pass address(0) which is fine for commit/get smoke tests.
        address poolManager = address(0);
        // auctioneer will default to deployer address
        address auctioneer = vm.addr(deployerKey);

        vm.startBroadcast(deployerKey);

    // For local testing we don't have EigenLayer AVS or Fhenix deployed yet.
    // Pass address(0) for those dependencies so the contract can be deployed.
    PortalHook hook = new PortalHook(IPoolManager(poolManager), address(0), address(0));

        vm.stopBroadcast();

        console.log("PortalHook deployed to:", address(hook));
        console.log("Auctioneer address:", auctioneer);
    }
}
