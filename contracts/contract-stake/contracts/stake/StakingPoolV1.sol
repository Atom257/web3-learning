// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import "../storage/StakingPoolStorageV1.sol";
import "../interfaces/IStakingPoolV1.sol";

contract StakingPoolV1 is
    Initializable,
    UUPSUpgradeable,
    AccessControlUpgradeable,
    PausableUpgradeable,
    StakingPoolStorage,
    IStakingPool
{
    // 角色
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant UPGRADE_ROLE = keccak256("UPGRADE_ROLE");

    // 初始化函数
    /// @param stakingToken_ 被质押的 token 地址（MST）
    /// @param rewardToken_  奖励 token 地址
    /// @param rewardPerBlock_ 每区块产生的奖励总量
    function initialize(
        address stakingToken_,
        address rewardToken_,
        uint256 rewardPerBlock_
    ) public initializer {
        require(stakingToken_ != address(0), "invalid staking token");
        require(rewardToken_ != address(0), "invalid reward token");
        require(rewardPerBlock_ > 0, "rewardPerBlock = 0");

        __AccessControl_init();
        __UUPSUpgradeable_init();
        __Pausable_init();

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        _grantRole(UPGRADE_ROLE, msg.sender);

        _stakingToken = IERC20(stakingToken_);
        _rewardToken = IERC20(rewardToken_);

        _rewardPerBlock = rewardPerBlock_;
        _lastRewardBlock = block.number;
        _accRewardPerShare = 0;
    }

    // 升级权限控制
    function _authorizeUpgrade(
        address newImplementation
    ) internal virtual override onlyRole(UPGRADE_ROLE) {}

    //view 函数
    //  查看某用户当前尚未领取的奖励数量
    function pendingReward(
        address user
    ) public view override returns (uint256) {
        UserInfo storage u = _users[user];
        uint256 acc = _accRewardPerShare;
        uint256 supply = _totalStaked;

        if (block.number > _lastRewardBlock && supply != 0) {
            uint256 blocks = block.number - _lastRewardBlock;
            uint256 reward = blocks * _rewardPerBlock;
            acc = acc + (reward * 1e12) / supply;
        }

        return (u.amount * acc) / 1e12 - u.rewardDebt;
    }

    //查看用户信息
    function userInfo(
        address user
    ) external view override returns (uint256 amount, uint256 rewardDebt) {
        UserInfo storage u = _users[user];
        return (u.amount, u.rewardDebt);
    }

    //  查看总质押token数量
    function totalStaked() public view override returns (uint256) {
        return _totalStaked;
    }

    // 更新池子奖励状态
    // 把从上次结算到现在的区块产生的奖励结算进 accRewardPerShare
    function updatePool() public {
        if (block.number <= _lastRewardBlock) {
            return;
        }

        uint256 supply = totalStaked();

        if (supply == 0) {
            // 没人质押，只更新 lastRewardBlock 即可，不发奖励
            _lastRewardBlock = block.number;
            return;
        }

        uint256 blocks = block.number - _lastRewardBlock;
        uint256 reward = blocks * _rewardPerBlock;

        // 放大 1e12 存入 accRewardPerShare
        _accRewardPerShare = _accRewardPerShare + (reward * 1e12) / supply;
        _lastRewardBlock = block.number;
    }

    // 质押

    function deposit(uint256 amount) external override whenNotPaused {
        require(amount > 0, "amount must > 0");
        updatePool();

        UserInfo storage u = _users[msg.sender];
        // 结算当前 pending 奖励
        if (u.amount > 0) {
            uint256 pending = (u.amount * _accRewardPerShare) /
                1e12 -
                u.rewardDebt;
            if (pending > 0) {
                _safeRewardTransfer(msg.sender, pending);
                emit Claim(msg.sender, pending);
            }
        }

        // 转入质押 token
        _stakingToken.transferFrom(msg.sender, address(this), amount);

        // 更新质押数量
        u.amount += amount;
        // 更新总量
        _totalStaked += amount;
        // 更新 rewardDebt
        u.rewardDebt = (u.amount * _accRewardPerShare) / 1e12;

        emit Deposit(msg.sender, amount);
    }

    // 提取质押
    function withdraw(uint256 amount) external virtual override whenNotPaused {
        UserInfo storage u = _users[msg.sender];
        require(amount > 0, "amount must > 0");
        require(u.amount >= amount, "insufficient staked");

        updatePool();

        // 结算 pending 奖励
        uint256 pending = (u.amount * _accRewardPerShare) / 1e12 - u.rewardDebt;
        if (pending > 0) {
            _safeRewardTransfer(msg.sender, pending);
            emit Claim(msg.sender, pending);
        }
        u.amount -= amount;

        _totalStaked -= amount;

        _stakingToken.transfer(msg.sender, amount);
        emit Withdraw(msg.sender, amount);
        // 更新 rewardDebt
        u.rewardDebt = (u.amount * _accRewardPerShare) / 1e12;
    }

    // 仅领取奖励

    function claim() external override whenNotPaused {
        UserInfo storage u = _users[msg.sender];
        updatePool();
        uint256 pending = (u.amount * _accRewardPerShare) / 1e12 - u.rewardDebt;
        require(pending > 0, "no reward");
        // 更新 rewardDebt 在前，防止重入等问题
        u.rewardDebt = (u.amount * _accRewardPerShare) / 1e12;
        _safeRewardTransfer(msg.sender, pending);
        emit Claim(msg.sender, pending);
    }

    // Admin 函数
    // 暂停所有质押/提现/领奖操作
    function pause() external onlyRole(ADMIN_ROLE) {
        _pause();
    }

    // 恢复所有质押/提现/领奖操作
    function unpause() external onlyRole(ADMIN_ROLE) {
        _unpause();
    }

    // 调整每区块奖励数量
    function setRewardPerBlock(
        uint256 newRewardPerBlock
    ) external onlyRole(ADMIN_ROLE) {
        require(newRewardPerBlock > 0, "rewardPerBlock = 0");
        updatePool();
        _rewardPerBlock = newRewardPerBlock;
    }

    // 内部安全转账函数

    // 防止奖励 token 不足时 revert，改为把能给的都给出去
    function _safeRewardTransfer(address to, uint256 amount) internal virtual {
        uint256 bal = _rewardToken.balanceOf(address(this));
        if (amount > bal) {
            _rewardToken.transfer(to, bal);
        } else {
            _rewardToken.transfer(to, amount);
        }
    }
}
