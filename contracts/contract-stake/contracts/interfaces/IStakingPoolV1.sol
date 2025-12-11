// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

interface IStakingPool {
    // v1 版本
    // --------- View 函数 ---------
    // 查看某用户当前尚未领取的奖励数量
    function pendingReward(address user) external view returns (uint256);

    //查看用户信息
    function userInfo(
        address user
    ) external view returns (uint256 amount, uint256 rewardDebt);

    // 查看总质押token数量
    function totalStaked() external view returns (uint256);

    // --------- 操作函数 ---------
    // 质押 amount 数量的 token
    function deposit(uint256 amount) external;

    // 提取 amount 数量的质押 token
    function withdraw(uint256 amount) external;

    // 仅领取奖励，不改变质押数量
    function claim() external;

    // --------- 事件 ---------
    // 质押事件
    event Deposit(address indexed user, uint256 amount);

    //  提取质押事件
    event Withdraw(address indexed user, uint256 amount);

    //  领取奖励事件
    event Claim(address indexed user, uint256 reward);
}
