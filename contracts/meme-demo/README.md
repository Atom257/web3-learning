# Meme 代币发射器（Foundry 项目）

本项目是一个使用 **Foundry** 开发的 **Meme 代币发射器** 系统，包含代币合约、工厂合约和线性释放合约。

## 项目结构

```
src/
├── MemeToken.sol      # 核心代币合约（ERC20 + Burnable）
├── MemeFactory.sol    # 工厂合约（部署代币、创建 vesting、发射代币）
└── MemeVesting.sol    # 线性释放合约（时间锁仓）
```

**依赖版本：**
- OpenZeppelin Contracts: **v5.5.0**
- Solidity: `^0.8.20`
- Foundry: 最新版本

---

## 核心功能

### 1. MemeToken - 代币合约

**核心特性：**

- **发射机制**：代币在「发射」前禁止一切转账和销毁，只允许初始铸造；发射后行为变为普通 ERC20（支持 burn）
- **权限控制**：只有指定的 `owner` 地址可以触发发射

**合约继承：**

- `ERC20`：标准代币接口（`transfer`, `transferFrom`, `approve`, `balanceOf` 等）
- `ERC20Burnable`：在标准 ERC20 的基础上增加 `burn` / `burnFrom` 销毁功能

**构造函数参数：**

- `string memory name`：代币名称
- `string memory symbol`：代币符号
- `uint256 supply`：初始总量（单位为最小精度，通常是 10^decimals）
- `address _owner`：初始持币地址 + 发射权限地址

**关键实现：使用 `_update` 钩子函数**

在 OpenZeppelin v5.x 中，`_beforeTokenTransfer` 已被 `_update` 函数替代。`_update` 是新的内部钩子函数，在所有转账操作（包括 `transfer`、`transferFrom`、`mint`、`burn`）时被调用。

```32:49:src/MemeToken.sol
    function _update(
        address from,
        address to,
        uint256 value
    ) internal virtual override {
        // mint 永远允许（构造函数那次）
        if (from == address(0)) {
            super._update(from, to, value);
            return;
        }

        // launch 前：只允许 factory 转账
        if (!launched) {
            require(from == owner, "Token not launched");
        }

        super._update(from, to, value);
    }
```

**逻辑说明：**

- 当 `from == address(0)` 时：表示是 `mint` 行为（铸造），直接放行
- 当 `from != address(0)` 时：
  - 若 `launched == false`：只允许 `owner` 地址转账（用于 Factory 创建 vesting 等操作）
  - 若 `launched == true`：允许所有正常转账/销毁操作

**状态变量：**

- `bool public launched`：代币是否已发射（初始为 `false`）
- `address public owner`：具有发射权限的地址

**函数：**

- `launch() external onlyOwner`：发射代币，将 `launched` 设为 `true`

**特点：**

- 合约中只有构造函数调用 `_mint`，没有任何公开的增发函数，**总量在部署时就被锁死**
- 未发射前，只有 `owner` 可以转账（用于 Factory 创建 vesting 等场景）
- 发射后，所有操作恢复为正常 ERC20 行为

### 2. MemeFactory - 工厂合约

**功能：**

- `deployToken()`：部署新的 MemeToken 实例，`owner` 设置为 Factory 地址
- `launchToken()`：发射指定的代币（只有 admin 可调用）
- `createVesting()`：为指定代币创建线性释放合约，并将代币转入 vesting 合约

**权限：**

- `address public admin`：工厂管理员（部署者）
- 所有函数都需要 `onlyAdmin` 权限

### 3. MemeVesting - 线性释放合约

**功能：**

- 线性释放代币给受益人（beneficiary）
- 释放周期由 `duration` 参数指定
- 受益人可以通过 `claim()` 函数领取已释放的代币

**参数：**

- `address _token`：代币地址
- `address _beneficiary`：受益人地址
- `uint256 _totalAmount`：总释放量
- `uint256 _duration`：释放周期（秒）

---

## 快速开始

### 1. 安装依赖

如果还没有安装 Foundry：

```bash
curl -L https://foundry.paradigm.xyz | bash
foundryup
```

安装项目依赖：

```bash
forge install OpenZeppelin/openzeppelin-contracts
```

### 2. 编译合约

```bash
forge build
```

### 3. 运行测试

```bash
forge test
```

使用详细输出：

```bash
forge test -vvvv
```

**测试覆盖：**

测试文件 `test/MemeLaunch.t.sol` 覆盖了完整的发射流程：

1. ✅ 部署代币
2. ✅ 发射前不能转账
3. ✅ 创建 vesting（锁仓 30%）
4. ✅ 非 admin 不能发射
5. ✅ admin 发射代币
6. ✅ 发射后可以转账
7. ✅ vesting 初期不能全部领取
8. ✅ 时间快进后可以部分领取

**测试结果示例：**

```
Ran 1 test for test/MemeLaunch.t.sol:MemeLaunchTest
[PASS] test_full_meme_launch_flow() (gas: 1780845)
Suite result: ok. 1 passed; 0 failed; 0 skipped
```

### 4. 部署到本地区块链（Anvil）

启动本地节点：

```bash
anvil
```

在另一个终端部署 Factory：

```bash
export RPC_URL=http://127.0.0.1:8545
export PRIVATE_KEY=你的私钥

# 部署 Factory
forge create src/MemeFactory.sol:MemeFactory \
  --rpc-url $RPC_URL \
  --private-key $PRIVATE_KEY
```

使用 Factory 部署代币：

```bash
export FACTORY_ADDRESS=部署输出的 Factory 地址

# 通过 Factory 部署代币
cast send $FACTORY_ADDRESS \
  "deployToken(string,string,uint256)" \
  "MyMeme" \
  "MEME" \
  1000000000000000000000000 \
  --rpc-url $RPC_URL \
  --private-key $PRIVATE_KEY
```

创建 Vesting：

```bash
export TOKEN_ADDRESS=代币地址

cast send $FACTORY_ADDRESS \
  "createVesting(address,address,uint256,uint256)" \
  $TOKEN_ADDRESS \
  0x受益者地址 \
  300000000000000000000000 \
  2592000 \
  --rpc-url $RPC_URL \
  --private-key $PRIVATE_KEY
```

发射代币：

```bash
cast send $FACTORY_ADDRESS \
  "launchToken(address)" \
  $TOKEN_ADDRESS \
  --rpc-url $RPC_URL \
  --private-key $PRIVATE_KEY
```

---

## 技术要点

### OpenZeppelin v5.x 的 `_update` 函数

在 OpenZeppelin Contracts v5.0+ 中，ERC20 的实现从使用 `_beforeTokenTransfer` 钩子改为使用 `_update` 函数。这是一个重要的 API 变更：

**v4.x（旧版本）：**
```solidity
function _beforeTokenTransfer(
    address from,
    address to,
    uint256 amount
) internal virtual { }
```

**v5.x（当前版本）：**
```solidity
function _update(
    address from,
    address to,
    uint256 value
) internal virtual { }
```

**主要区别：**

1. 函数名从 `_beforeTokenTransfer` 改为 `_update`
2. 参数名从 `amount` 改为 `value`
3. `_update` 不仅处理转账前的逻辑，还负责实际的余额更新
4. 必须调用 `super._update(from, to, value)` 来完成实际的转账操作

**在本项目中的应用：**

```32:49:src/MemeToken.sol
    function _update(
        address from,
        address to,
        uint256 value
    ) internal virtual override {
        // mint 永远允许（构造函数那次）
        if (from == address(0)) {
            super._update(from, to, value);
            return;
        }

        // launch 前：只允许 factory 转账
        if (!launched) {
            require(from == owner, "Token not launched");
        }

        super._update(from, to, value);
    }
```

这个实现确保了：
- 铸造操作（`from == address(0)`）始终允许
- 未发射时，只有 `owner` 可以转账（用于 Factory 创建 vesting）
- 发射后，所有转账正常进行

---

## 项目特点

- ✅ **最小化设计**：只包含核心功能，代码简洁易懂
- ✅ **使用最新 OpenZeppelin v5.5.0**：采用 `_update` 钩子函数
- ✅ **完整的发射流程**：代币部署 → 创建 vesting → 发射 → 自由交易
- ✅ **权限控制清晰**：Factory admin 控制部署和发射，Token owner 控制发射状态
- ✅ **测试覆盖完整**：包含完整的端到端测试

---

## 后续扩展方向

- LP 池创建和锁定
- 税费机制（买入/卖出税）
- 黑名单/白名单功能
- 多签钱包支持
- 代币销毁机制增强
- 更多 vesting 策略（线性、阶梯式等）

---

## 许可证

MIT
