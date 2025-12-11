// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "./StakingPoolV1.sol";
import "../storage/StakingPoolStorageV2.sol";
import "../interfaces/IStakingPoolV2.sol";

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/// @title StakingPoolV2
/// @notice 多池 + 权重 + 延迟解押 + ETH 质押版本
/// @dev
/// - 继承 V1，不改变 V1 的存储布局
/// - 所有新增状态变量放在 StakingPoolStorageV2 中
/// - 对外新增接口定义在 IStakingPoolV2 中
contract StakingPoolV2 is StakingPoolV1, StakingPoolStorageV2, IStakingPoolV2 {
    using SafeERC20 for IERC20;

    /// @notice 固定约定 0 号池为 ETH 池
    uint256 public constant ETH_PID = 0;

    // ---------------------------------------
    // 1. 事件 Event
    // ---------------------------------------

    event AddPool(
        address indexed stTokenAddress,
        uint256 indexed poolWeight,
        uint256 minDepositAmount,
        uint256 unstakeLockedBlocks
    );

    event UpdatePoolInfo(
        uint256 indexed pid,
        uint256 minDepositAmount,
        uint256 unstakeLockedBlocks
    );

    event SetPoolWeight(
        uint256 indexed pid,
        uint256 indexed newWeight,
        uint256 totalPoolWeight
    );

    event UpdatePool(
        uint256 indexed pid,
        uint256 lastRewardBlock,
        uint256 rewardForPool
    );

    event Deposit(address indexed user, uint256 indexed pid, uint256 amount);
    event RequestUnstake(
        address indexed user,
        uint256 indexed pid,
        uint256 amount
    );
    event Withdraw(
        address indexed user,
        uint256 indexed pid,
        uint256 amount,
        uint256 blockNumber
    );
    event Claim(address indexed user, uint256 indexed pid, uint256 reward);

    event PauseWithdraw();
    event UnpauseWithdraw();
    event PauseClaim();
    event UnpauseClaim();

    // ---------------------------------------
    // 2. 修饰符 Modifiers
    // ---------------------------------------

    modifier whenNotWithdrawPaused() {
        require(!_withdrawPaused, "withdraw is paused");
        _;
    }

    modifier whenNotClaimPaused() {
        require(!_claimPaused, "claim is paused");
        _;
    }

    // ---------------------------------------
    // 3. 升级权限控制
    // ---------------------------------------

    /// @notice 继承 V1 的 upgrade 权限控制
    function _authorizeUpgrade(
        address newImplementation
    ) internal virtual override(StakingPoolV1) onlyRole(UPGRADE_ROLE) {}

    // ---------------------------------------
    // 4. View 查询函数
    // ---------------------------------------

    /// @notice 池子数量
    function poolLength() external view override returns (uint256) {
        return _pools.length;
    }

    /// @notice 查询池子配置
    function getPool(
        uint256 pid
    )
        external
        view
        override
        returns (
            address stTokenAddress,
            uint256 poolWeight,
            uint256 lastRewardBlock,
            uint256 accRewardPerST,
            uint256 stTokenAmount,
            uint256 minDepositAmount,
            uint256 unstakeLockedBlocks
        )
    {
        require(pid < _pools.length, "invalid pid");
        Pool storage p = _pools[pid];
        return (
            p.stTokenAddress,
            p.poolWeight,
            p.lastRewardBlock,
            p.accRewardPerST,
            p.stTokenAmount,
            p.minDepositAmount,
            p.unstakeLockedBlocks
        );
    }

    /// @notice 查询指定池中用户当前尚未领取的奖励总量（包含动态区块奖励）
    function pendingReward(
        uint256 pid,
        address userAddr
    ) public view override returns (uint256) {
        require(pid < _pools.length, "invalid pid");

        Pool storage p = _pools[pid];
        User storage u = _usersV2[pid][userAddr];

        uint256 accMetaPerST = p.accRewardPerST;
        uint256 stSupply = p.stTokenAmount;

        // 1. 在 view 中“虚拟”补算 accRewardPerST
        if (
            block.number > p.lastRewardBlock &&
            stSupply != 0 &&
            _totalPoolWeight > 0
        ) {
            uint256 blocks = block.number - p.lastRewardBlock;
            // 奖励分配到该池：blocks * rewardPerBlock * poolWeight / totalPoolWeight
            uint256 reward = (blocks * _rewardPerBlock * p.poolWeight) /
                _totalPoolWeight;
            accMetaPerST += (reward * 1e18) / stSupply;
        }

        // 2. 基于补算后的 accRewardPerST 计算用户应得奖励
        uint256 accumulated = (u.stAmount * accMetaPerST) / 1e18;

        // 3. 总奖励 = 新累计 - 已记账 + 历史 pending
        return accumulated - u.finishedReward + u.pendingReward;
    }

    /// @notice 查询用户解押请求的总量 & 已解锁可提取量
    function withdrawAmount(
        uint256 pid,
        address userAddr
    )
        external
        view
        override
        returns (uint256 totalRequestAmount, uint256 unlockedAmount)
    {
        require(pid < _pools.length, "invalid pid");

        User storage u = _usersV2[pid][userAddr];
        uint256 len = u.requests.length;

        for (uint256 i = 0; i < len; i++) {
            totalRequestAmount += u.requests[i].amount;
            if (u.requests[i].unlockBlocks <= block.number) {
                unlockedAmount += u.requests[i].amount;
            } else {
                // 后续请求的 unlockBlocks 必然更大，也可以继续累加，这里不 break
            }
        }
    }

    // ---------------------------------------
    // 5. 奖励计算核心：_getMultiplier / updatePool / massUpdatePools
    // ---------------------------------------

    /// @notice 计算 from 到 to 区间内可产生的奖励基数（已经乘上 rewardPerBlock）
    /// @dev 区间会被裁剪到 [_startBlock, _endBlock] 之内
    function _getMultiplier(
        uint256 from,
        uint256 to
    ) internal view returns (uint256) {
        if (from > to) {
            return 0;
        }

        uint256 start = _startBlock;
        uint256 end = _endBlock;

        // 如果还没配置 start/end，就默认整个区间有效
        if (start == 0 && end == 0) {
            return (to - from) * _rewardPerBlock;
        }

        if (to <= start || from >= end) {
            return 0;
        }

        if (from < start) {
            from = start;
        }
        if (to > end) {
            to = end;
        }

        if (from >= to) {
            return 0;
        }

        uint256 blocks = to - from;
        return blocks * _rewardPerBlock;
    }

    /// @notice 更新指定池子的奖励状态
    function updatePool(uint256 pid) public {
        require(pid < _pools.length, "invalid pid");

        Pool storage p = _pools[pid];

        if (block.number <= p.lastRewardBlock) {
            return;
        }

        if (p.stTokenAmount == 0 || _totalPoolWeight == 0) {
            p.lastRewardBlock = block.number;
            emit UpdatePool(pid, p.lastRewardBlock, 0);
            return;
        }

        uint256 multiplier = _getMultiplier(p.lastRewardBlock, block.number);
        if (multiplier == 0) {
            p.lastRewardBlock = block.number;
            emit UpdatePool(pid, p.lastRewardBlock, 0);
            return;
        }

        // 该池获得的总奖励
        uint256 rewardForPool = (multiplier * p.poolWeight) / _totalPoolWeight;

        // 更新该池的累计奖励指数（1e18 放大）
        p.accRewardPerST =
            p.accRewardPerST +
            (rewardForPool * 1e18) /
            p.stTokenAmount;

        p.lastRewardBlock = block.number;

        emit UpdatePool(pid, p.lastRewardBlock, rewardForPool);
    }

    /// @notice 更新所有池子的奖励状态（注意 gas）
    function massUpdatePools() public {
        uint256 length = _pools.length;
        for (uint256 pid = 0; pid < length; pid++) {
            updatePool(pid);
        }
    }

    // ---------------------------------------
    // 6. Admin 功能（池子管理 & 暂停控制）
    // ---------------------------------------

    /// @notice 添加一个新的质押池
    function addPool(
        address stTokenAddress,
        uint256 poolWeight,
        uint256 minDepositAmount,
        uint256 unstakeLockedBlocks,
        bool withUpdate
    ) external override onlyRole(ADMIN_ROLE) {
        require(poolWeight > 0, "poolWeight = 0");
        require(unstakeLockedBlocks > 0, "lockedBlocks = 0");

        // staking 结束后不允许再添加池
        if (_endBlock != 0) {
            require(block.number < _endBlock, "staking already ended");
        }

        // 默认第一个池为 ETH 池（pid 0）
        if (_pools.length == 0) {
            require(stTokenAddress == address(0), "pool0 must be ETH");
        } else {
            require(stTokenAddress != address(0), "ERC20 pool invalid token");
        }

        if (withUpdate) {
            massUpdatePools();
        }

        uint256 lastRewardBlock = block.number;
        if (_startBlock != 0 && block.number < _startBlock) {
            lastRewardBlock = _startBlock;
        }

        _pools.push(
            Pool({
                stTokenAddress: stTokenAddress,
                poolWeight: poolWeight,
                lastRewardBlock: lastRewardBlock,
                accRewardPerST: 0,
                stTokenAmount: 0,
                minDepositAmount: minDepositAmount,
                unstakeLockedBlocks: unstakeLockedBlocks
            })
        );

        _totalPoolWeight += poolWeight;

        emit AddPool(
            stTokenAddress,
            poolWeight,
            minDepositAmount,
            unstakeLockedBlocks
        );
    }

    /// @notice 修改池子的最小质押量 与 解押等待区块
    function updatePoolInfo(
        uint256 pid,
        uint256 minDepositAmount,
        uint256 unstakeLockedBlocks
    ) external override onlyRole(ADMIN_ROLE) {
        require(pid < _pools.length, "invalid pid");
        require(unstakeLockedBlocks > 0, "lockedBlocks = 0");

        Pool storage p = _pools[pid];

        p.minDepositAmount = minDepositAmount;
        p.unstakeLockedBlocks = unstakeLockedBlocks;

        emit UpdatePoolInfo(pid, minDepositAmount, unstakeLockedBlocks);
    }

    /// @notice 修改池子的权重
    function setPoolWeight(
        uint256 pid,
        uint256 newWeight,
        bool withUpdate
    ) external override onlyRole(ADMIN_ROLE) {
        require(pid < _pools.length, "invalid pid");
        require(newWeight > 0, "new weight = 0");

        if (withUpdate) {
            massUpdatePools();
        }

        Pool storage p = _pools[pid];

        _totalPoolWeight = _totalPoolWeight - p.poolWeight + newWeight;
        p.poolWeight = newWeight;

        emit SetPoolWeight(pid, newWeight, _totalPoolWeight);
    }

    /// @notice 配置奖励开始区块
    function setStartBlock(uint256 startBlock) external onlyRole(ADMIN_ROLE) {
        _startBlock = startBlock;
    }

    /// @notice 配置奖励结束区块
    function setEndBlock(uint256 endBlock) external onlyRole(ADMIN_ROLE) {
        _endBlock = endBlock;
    }

    function pauseWithdraw() external override onlyRole(ADMIN_ROLE) {
        require(!_withdrawPaused, "withdraw already paused");
        _withdrawPaused = true;
        emit PauseWithdraw();
    }

    function unpauseWithdraw() external override onlyRole(ADMIN_ROLE) {
        require(_withdrawPaused, "withdraw not paused");
        _withdrawPaused = false;
        emit UnpauseWithdraw();
    }

    function pauseClaim() external override onlyRole(ADMIN_ROLE) {
        require(!_claimPaused, "claim already paused");
        _claimPaused = true;
        emit PauseClaim();
    }

    function unpauseClaim() external override onlyRole(ADMIN_ROLE) {
        require(_claimPaused, "claim not paused");
        _claimPaused = false;
        emit UnpauseClaim();
    }

    // ---------------------------------------
    // 7. 用户操作：质押 / 解押 / 提现 / 领取奖励
    // ---------------------------------------

    /// @notice 在指定池中质押 ERC20 代币
    function deposit(
        uint256 pid,
        uint256 amount
    ) external override(IStakingPoolV2) whenNotPaused {
        require(pid < _pools.length, "invalid pid");
        require(pid != ETH_PID, "use depositETH for ETH pool");
        require(amount > 0, "amount = 0");

        Pool storage p = _pools[pid];
        require(p.stTokenAddress != address(0), "ERC20 pool required");
        require(amount >= p.minDepositAmount, "deposit too small");

        User storage u = _usersV2[pid][msg.sender];

        // 1. 更新池子的奖励状态
        updatePool(pid);

        // 2. 把之前尚未结算的奖励累积到 pendingReward
        if (u.stAmount > 0) {
            uint256 accumulated = (u.stAmount * p.accRewardPerST) / 1e18;
            uint256 pending = accumulated - u.finishedReward;
            if (pending > 0) {
                u.pendingReward += pending;
            }
        }

        // 3. 把 ERC20 从用户转到合约
        IERC20(p.stTokenAddress).safeTransferFrom(
            msg.sender,
            address(this),
            amount
        );

        // 4. 更新用户质押数量和池总质押量
        u.stAmount += amount;
        p.stTokenAmount += amount;

        // 5. 更新用户的“已结算奖励基准”
        u.finishedReward = (u.stAmount * p.accRewardPerST) / 1e18;

        emit Deposit(msg.sender, pid, amount);
    }

    /// @notice 在 ETH 池中质押 ETH（固定使用 pid = 0）
    function depositETH()
        external
        payable
        override(IStakingPoolV2)
        whenNotPaused
    {
        uint256 pid = ETH_PID;
        require(pid < _pools.length, "ETH pool not exist");

        Pool storage p = _pools[pid];
        require(p.stTokenAddress == address(0), "pid0 must be ETH pool");

        uint256 amount = msg.value;
        require(amount > 0, "amount = 0");
        require(amount >= p.minDepositAmount, "deposit too small");

        User storage u = _usersV2[pid][msg.sender];

        // 1. 更新池奖励
        updatePool(pid);

        // 2. 把旧仓位的奖励结算进 pendingReward
        if (u.stAmount > 0) {
            uint256 accumulated = (u.stAmount * p.accRewardPerST) / 1e18;
            uint256 pending = accumulated - u.finishedReward;
            if (pending > 0) {
                u.pendingReward += pending;
            }
        }

        // 3. ETH 已随 msg.value 进入合约
        u.stAmount += amount;
        p.stTokenAmount += amount;

        // 4. 更新用户奖励基准
        u.finishedReward = (u.stAmount * p.accRewardPerST) / 1e18;

        emit Deposit(msg.sender, pid, amount);
    }

    /// @notice 发起解押（不立即提现，加入等待队列）
    function unstake(
        uint256 pid,
        uint256 amount
    ) external override(IStakingPoolV2) whenNotPaused whenNotWithdrawPaused {
        require(pid < _pools.length, "invalid pid");
        require(amount > 0, "amount = 0");

        Pool storage p = _pools[pid];
        User storage u = _usersV2[pid][msg.sender];

        require(u.stAmount >= amount, "insufficient staked");

        // 1. 更新池奖励状态
        updatePool(pid);

        // 2. 把旧仓位未领取奖励结算入 pendingReward
        if (u.stAmount > 0) {
            uint256 accumulated = (u.stAmount * p.accRewardPerST) / 1e18;
            uint256 pending = accumulated - u.finishedReward;
            if (pending > 0) {
                u.pendingReward += pending;
            }
        }

        // 3. 扣减用户质押数量、扣减池总质押量
        u.stAmount -= amount;
        p.stTokenAmount -= amount;

        // 4. 新增解押请求队列
        u.requests.push(
            UnstakeRequest({
                amount: amount,
                unlockBlocks: block.number + p.unstakeLockedBlocks
            })
        );

        // 5. 更新奖励基准为新仓位
        u.finishedReward = (u.stAmount * p.accRewardPerST) / 1e18;

        emit RequestUnstake(msg.sender, pid, amount);
    }

    /// @notice 从解押队列提现（只提取已到期的部分）
    function withdraw(
        uint256 pid
    )
        external
        virtual
        override(IStakingPoolV2, StakingPoolV1)
        whenNotPaused
        whenNotWithdrawPaused
    {
        require(pid < _pools.length, "invalid pid");

        Pool storage p = _pools[pid];
        User storage u = _usersV2[pid][msg.sender];

        uint256 withdrawable = 0;
        uint256 len = u.requests.length;
        uint256 removeCount = 0;

        // 1. 找出所有已到期金额
        for (uint256 i = 0; i < len; i++) {
            if (u.requests[i].unlockBlocks > block.number) {
                break;
            }
            withdrawable += u.requests[i].amount;
            removeCount++;
        }

        require(withdrawable > 0, "no unlocked amount");

        // 2. 删除已处理的队列项（左移数组）
        for (uint256 i = 0; i < len - removeCount; i++) {
            u.requests[i] = u.requests[i + removeCount];
        }
        for (uint256 i = 0; i < removeCount; i++) {
            u.requests.pop();
        }

        // 3. 执行转账（ETH池 或 ERC20池）
        if (p.stTokenAddress == address(0)) {
            _safeETHTransfer(msg.sender, withdrawable);
        } else {
            IERC20(p.stTokenAddress).safeTransfer(msg.sender, withdrawable);
        }

        emit Withdraw(msg.sender, pid, withdrawable, block.number);
    }

    /// @notice 领取指定池的奖励
    function claim(
        uint256 pid
    ) external override(IStakingPoolV2) whenNotPaused whenNotClaimPaused {
        require(pid < _pools.length, "invalid pid");

        Pool storage p = _pools[pid];
        User storage u = _usersV2[pid][msg.sender];

        // 1. 更新池子奖励状态
        updatePool(pid);

        // 2. 计算应领取奖励
        uint256 accumulated = (u.stAmount * p.accRewardPerST) / 1e18;
        uint256 pending = accumulated - u.finishedReward + u.pendingReward;

        require(pending > 0, "no reward");

        // 3. 清空用户 pendingReward
        u.pendingReward = 0;

        // 4. 更新奖励基准为最新仓位
        u.finishedReward = (u.stAmount * p.accRewardPerST) / 1e18;

        // 5. 发送奖励 token
        _safeRewardTransfer(msg.sender, pending);

        emit Claim(msg.sender, pid, pending);
    }

    // ---------------------------------------
    // 8. 内部安全转账函数
    // ---------------------------------------

    /// @dev 安全奖励转账：余额不足时把全部余额发出去
    function _safeRewardTransfer(
        address to,
        uint256 amount
    ) internal virtual override {
        uint256 bal = _rewardToken.balanceOf(address(this));
        if (amount > bal) {
            _rewardToken.transfer(to, bal);
        } else {
            _rewardToken.transfer(to, amount);
        }
    }

    /// @dev 安全 ETH 转账
    function _safeETHTransfer(address to, uint256 amount) internal {
        (bool ok, ) = to.call{value: amount}("");
        require(ok, "ETH transfer failed");
    }
}
