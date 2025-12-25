// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "openzeppelin-contracts/contracts/token/ERC20/ERC20.sol";
import "openzeppelin-contracts/contracts/access/Ownable.sol";

contract MockERC20 is ERC20, Ownable {
    constructor(string memory name, string memory symbol, address owner_) ERC20(name, symbol) Ownable(owner_) {}

    function mint(address to, uint256 value) external onlyOwner {
        _mint(to, value);
    }

    function decimals() public view virtual override returns (uint8) {
        return 18;
    }
}
