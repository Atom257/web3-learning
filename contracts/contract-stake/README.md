# contract-stake

基于 Hardhat 的可升级质押池示例，支持多池权重、延迟解押、ETH/ ERC20 质押。

## 功能特性

- V1：单池质押，按区块产出奖励；可暂停；可调整每区块奖励；UUPS 升级。
- V2：多池按权重分配奖励；ETH 池（pid=0）；解押锁定队列；起止区块控制奖励；可独立暂停 withdraw/claim；批量更新池。
- Token：`MyStakeToken` 作为质押/奖励示例代币。

## 合约架构

- 质押合约：`contracts/stake/StakingPoolV1.sol`、`contracts/stake/StakingPoolV2.sol`
- Token：`contracts/token/RewardToken.sol`（MyStakeToken）
- 接口：`contracts/interfaces/IStakingPoolV1.sol`、`IStakingPoolV2.sol`
- 存储：`contracts/storage/StakingPoolStorageV1.sol`、`StakingPoolStorageV2.sol`
- 权限与升级：UUPS，角色 `DEFAULT_ADMIN_ROLE` / `ADMIN_ROLE` / `UPGRADE_ROLE`

## 目录结构

- `contracts/`：合约源码（stake/token/interfaces/storage）
- `test/`：测试（`stake/`、`token/`）
- `scripts/`、`frontend/`：占位
- 配置：`hardhat.config.js`

## 环境依赖

- Node.js（建议 >= 18）
- Hardhat、@openzeppelin/hardhat-upgrades、dotenv
- 全局命令：`npx hardhat ...`

## 快速开始

```bash
npm install
# 运行测试
npx hardhat test
```

## 环境变量（.env）

```
SEPOLIA_RPC=https://...
PRIVATE_KEY=0x...
ETHERSCAN_KEY=...
```

## 部署与验证

- 网络配置：`hardhat.config.js` 默认 sepolia，账户取自 `PRIVATE_KEY`
- 部署：自定义脚本调用 `hre.upgrades.deployProxy`
- 验证：`npx hardhat verify --network sepolia <address>`

## 核心交互流程（V2）

- 质押：`deposit(pid, amount)`（ERC20）；`depositETH()`（pid=0）
- 解押排队：`unstake(pid, amount)` → 等待 `unstakeLockedBlocks` → `withdraw(pid)`
- 领取奖励：`claim(pid)`
- 池管理（管理员）：`addPool`、`setPoolWeight`、`updatePool`/`massUpdatePools`、`pauseClaim/withdraw`、`unpauseClaim/withdraw`
- 奖励区间：`startBlock` / `endBlock`

## 参数与配置

- 池参数：`stTokenAddress`（0 为 ETH 池）、`poolWeight`、`minDepositAmount`、`unstakeLockedBlocks`、`accRewardPerST`(1e18 放大)、`stTokenAmount`
- 全局参数：`rewardPerBlock`、`totalPoolWeight`、`startBlock`、`endBlock`
- 用户字段：`stAmount`、`finishedReward`、`pendingReward`、`requests.unlockBlocks/amount`

## 奖励计算公式（V2）

- `rewardForPool = blocks * rewardPerBlock * poolWeight / totalPoolWeight`
- `accRewardPerST += rewardForPool * 1e18 / stTokenAmount`
- `accumulated = stAmount * accRewardPerST / 1e18`
- `pending = accumulated - finishedReward + pendingReward`
- 说明：`pendingReward` 在多次操作间累积；`claim` 会更新 `finishedReward` 并清空 `pendingReward`；无质押或 `totalPoolWeight=0` 时不产出；`startBlock/endBlock` 限定有效区间。

## 测试

- 命令：`npx hardhat test`
- 覆盖：V1 单池流程、V2 多池/ETH/解押队列/权重、Token 基础转账

## 安全与注意事项

- 升级风险：仅 `UPGRADE_ROLE` 可升级，需审计新实现。
- 奖励资金：部署后应向合约预置足额奖励 Token。
- 权限操作：管理员可暂停质押/解押/领奖，注意密钥安全。

## 开发规范

- Solidity 版本：0.8.23

## 许可协议

- MIT
