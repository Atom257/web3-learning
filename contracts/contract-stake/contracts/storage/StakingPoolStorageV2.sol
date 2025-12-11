// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

// V2 扩展存储

contract StakingPoolStorageV2 {
    //  多池结构（Pool）
    struct Pool {
        // 质押代币地址
        // - address(0) 表示 ETH 池
        // - 非 0 地址表示 ERC20 池
        address stTokenAddress;
        // 池权重
        // - 用于在多个池之间按比例分配每区块的奖励
        // - 某池每区块奖励 = 总每块奖励 * poolWeight / totalPoolWeight
        uint256 poolWeight;
        // 该池上一次结算奖励的区块号
        uint256 lastRewardBlock;
        // 该池每 1 个质押代币已累计的奖励（放大 1e18 存储）
        // accRewardPerST = 已经分配到池子的总奖励 / stTokenAmount
        uint256 accRewardPerST;
        // 当前池里的总质押数量
        uint256 stTokenAmount;
        // 最小质押金额（可以为 0）
        uint256 minDepositAmount;
        // 解押锁定区块数
        // 用户 unstake 后，需要等待这么多区块，才能在 withdraw 中实际取出
        uint256 unstakeLockedBlocks;
    }
    //  所有池子列表（pid 即为数组下标）
    Pool[] internal _pools;

    //  解押请求结构（UnstakeRequest）
    struct UnstakeRequest {
        // 请求解押的数量
        uint256 amount;
        // 可以解锁提取的区块号（block.number + unstakeLockedBlocks）
        uint256 unlockBlocks;
    }

    //  用户在某个池中的状态（User）

    struct User {
        // 当前在该池质押的数量
        uint256 stAmount;
        // 已经“记账完成”的奖励数量
        // 类似 V1 里的 rewardDebt，用于避免重复发放
        uint256 finishedReward;
        // 尚未实际 claim，但已经算出来、临时累积的奖励
        // 在多次操作（deposit/unstake）之间缓存
        uint256 pendingReward;
        // 解押请求队列
        UnstakeRequest[] requests;
    }
    //  用户在每个池中的信息：poolId => user => User
    mapping(uint256 => mapping(address => User)) internal _usersV2;

    //  全局配置
    // 所有池子的权重之和
    uint256 internal _totalPoolWeight;

    // 奖励开始区块（小于该区块不产出奖励）
    uint256 internal _startBlock;

    // 奖励结束区块（超过该区块不再新增奖励）
    uint256 internal _endBlock;

    // 是否暂停 withdraw（解押提现）
    bool internal _withdrawPaused;

    // 是否暂停 claim（领取奖励）
    bool internal _claimPaused;
}
