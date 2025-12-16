// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/MemeFactory.sol";

contract Deploy is Script {
    function run() external {
        vm.startBroadcast();
        MemeFactory factory = new MemeFactory();
        vm.stopBroadcast();
    }
}
