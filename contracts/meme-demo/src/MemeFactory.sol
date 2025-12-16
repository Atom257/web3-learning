// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import {MemeToken} from "./MemeToken.sol";
import {MemeVesting} from "./MemeVesting.sol";

contract MemeFactory {
    address public admin;
    modifier onlyAdmin() {
        require(msg.sender == admin, "not admin");
        _;
    }

    constructor() {
        admin = msg.sender;
    }

    function deployToken(
        string memory name,
        string memory symbol,
        uint256 supply
    ) external onlyAdmin returns (address) {
        MemeToken token = new MemeToken(name, symbol, supply, address(this));
        return address(token);
    }

    function launchToken(address token) external onlyAdmin {
        MemeToken(token).launch();
    }

    function createVesting(
        address token,
        address beneficiary,
        uint256 amount,
        uint256 duration
    ) external onlyAdmin returns (address) {
        MemeVesting vesting = new MemeVesting(
            token,
            beneficiary,
            amount,
            duration
        );
        IERC20(token).transfer(address(vesting), amount);
        return address(vesting);
    }
}
