// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {
    ERC20,
    ERC20Burnable
} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";

contract MemeToken is ERC20Burnable {
    bool public launched;
    address public owner;

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    constructor(
        string memory name,
        string memory symbol,
        uint256 supply,
        address _owner
    ) ERC20(name, symbol) {
        owner = _owner;
        _mint(_owner, supply);
    }

    function launch() external onlyOwner {
        launched = true;
    }

    function _update(
        address from,
        address to,
        uint256 value
    ) internal virtual override {
        // mint 永远允许（构造函数那次）
        if (from == address(0)) {
            super._update(from, to, value);
            return;
        }

        // launch 前：只允许 factory 转账
        if (!launched) {
            require(from == owner, "Token not launched");
        }

        super._update(from, to, value);
    }
}
