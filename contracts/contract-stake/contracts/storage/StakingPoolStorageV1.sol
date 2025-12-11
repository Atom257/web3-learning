// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract StakingPoolStorage {
    // V1 Storage Layout
    // 单代币 质押

    //  V1版本质押TOKN  MST
    IERC20 internal _stakingToken;

    // 奖励TOKEN MST
    IERC20 internal _rewardToken;

    // 每区块产出奖励数量
    uint256 internal _rewardPerBlock;
    // 上个更新区块
    uint256 internal _lastRewardBlock;
    // 累计每份质押对应的奖励
    uint256 internal _accRewardPerShare;

    // 总质押量
    uint256 internal _totalStaked;

    // 用户信息
    struct UserInfo {
        // 用户质押数量
        uint256 amount;
        //  用户领取过的奖励基准
        uint256 rewardDebt;
    }

    mapping(address => UserInfo) internal _users;
}
