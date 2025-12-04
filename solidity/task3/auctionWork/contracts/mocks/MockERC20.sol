// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title MockERC20
 * @dev 用于测试的 ERC20 代币
 */
contract MockERC20 is ERC20 {
    constructor(
        string memory name,
        string memory symbol
    ) ERC20(name, symbol) {
        // 给部署者铸造一些代币用于测试
        _mint(msg.sender, 1000000 * 10 ** decimals());
    }

    /**
     * @notice 铸造代币给指定地址
     * @param to 接收地址
     * @param amount 数量
     */
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

