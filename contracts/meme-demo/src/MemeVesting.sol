// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract MemeVesting {
    IERC20 public token;
    address public beneficiary;

    uint256 public totalAmount;
    uint256 public startTime;
    uint256 public duration;
    uint256 public claimed;

    constructor(address _token, address _beneficiary, uint256 _totalAmount, uint256 _duration) {
        token = IERC20(_token);
        beneficiary = _beneficiary;
        totalAmount = _totalAmount;
        duration = _duration;
        startTime = block.timestamp;
    }

    function claim() external {
        require(msg.sender == beneficiary, "not beneficiary");

        uint256 vested;
        if (block.timestamp > (startTime + duration)) {
            vested = totalAmount;
        } else {
            vested = (totalAmount * (block.timestamp - startTime)) / duration;
        }

        uint256 claimable = vested - claimed;
        require(claimable > 0, "nothing to claim");

        claimed += claimable;
        token.transfer(beneficiary, claimable);
    }
}
