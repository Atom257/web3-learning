// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity ^0.8.23;

// V2 版本接口（不修改 V1 接口），包含多池、权重、ETH 支持、延迟解押等能力

interface IStakingPoolV2 {
    // View Functions
    /// @notice 返回池子数量
    function poolLength() external view returns (uint256);

    /// @notice 获取指定池的详细信息
    function getPool(
        uint256 pid
    )
        external
        view
        returns (
            address stTokenAddress,
            uint256 poolWeight,
            uint256 lastRewardBlock,
            uint256 accRewardPerST,
            uint256 stTokenAmount,
            uint256 minDepositAmount,
            uint256 unstakeLockedBlocks
        );

    /// @notice 查询用户在某个池中的当前待领取奖励
    function pendingReward(
        uint256 pid,
        address user
    ) external view returns (uint256);

    /// @notice 查询用户的解押请求（总量 & 可提取量）
    function withdrawAmount(
        uint256 pid,
        address user
    )
        external
        view
        returns (uint256 totalRequestAmount, uint256 unlockedAmount);

    // Admin 功能
    /// @notice 添加新的质押池
    function addPool(
        address stTokenAddress,
        uint256 poolWeight,
        uint256 minDepositAmount,
        uint256 unstakeLockedBlocks,
        bool withUpdate
    ) external;

    /// @notice 更新池子的最小质押、解押锁定参数
    function updatePoolInfo(
        uint256 pid,
        uint256 minDepositAmount,
        uint256 unstakeLockedBlocks
    ) external;

    /// @notice 更新池权重
    function setPoolWeight(
        uint256 pid,
        uint256 poolWeight,
        bool withUpdate
    ) external;

    /// @notice 暂停 withdraw
    function pauseWithdraw() external;

    /// @notice 恢复 withdraw
    function unpauseWithdraw() external;

    /// @notice 暂停 claim
    function pauseClaim() external;

    /// @notice 恢复 claim
    function unpauseClaim() external;

    // 用户操作

    /// @notice 质押 ERC20 代币
    function deposit(uint256 pid, uint256 amount) external;

    /// @notice 质押 ETH（仅限 pid=0）
    function depositETH() external payable;

    /// @notice 解押（加入锁定队列）
    function unstake(uint256 pid, uint256 amount) external;

    /// @notice 提取已解锁的解押数量
    function withdraw(uint256 pid) external;

    /// @notice 领取奖励
    function claim(uint256 pid) external;
}
