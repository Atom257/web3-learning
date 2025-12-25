# 🦄 Demo DEX V2 (Uniswap V2-style AMM)

一个 **从零实现的 Uniswap V2 风格去中心化交易所（DEX）**，  
使用 **Foundry + Solidity**，完整覆盖 **Token → Factory → Pair → Router → 测试验证** 的核心路径。

> 🎯 目标不是“功能堆砌”，而是**彻底理解 AMM 的经济模型与不变量**。

---

## ✨ 项目特性

- ✅ **ERC20 Token + TokenLauncher**
  - 标准 ERC20
  - 支持增发（用于测试套利 / 价格回归）
- ✅ **Factory**
  - Permissionless `createPair`
  - Token 排序 + Pair 唯一性保证
- ✅ **Pair（核心 AMM）**
  - Pair 本身即 **ERC20 LP Token**
  - `mint / burn / swap` 全部实现
  - **0.3% 手续费**（沉淀进池子）
  - 严格遵守 **x \* y ≥ k**
- ✅ **Router（最小但完整）**
  - `addLiquidity`
  - `swapExactTokensForTokens`（单跳）
  - 不持币、不存状态
- ✅ **Foundry Tests**
  - LP mint 正确性
  - swap 后 **k 不减**
  - 手续费真实沉淀给 LP
  - Router 不白送资产

---

## 📂 目录结构

```
src/
├── dex
│   ├── core
│   │   ├── DexFactory.sol
│   │   └── DexPair.sol
│   └── periphery
│       └── DexRouter.sol
└── token
    ├── MockERC20.sol
    └── TokenLauncher.sol

test/
└── dex
    └── DexPair.t.sol
```

---

## 🧠 设计要点（核心理解）

### Pair = ERC20（LP Token）

- LP 是同质资产 → ERC20
- Pair 本身即 LP Token

### AMM 不变量

- `x * y >= k`
- swap 使用事后校验
- 手续费沉淀在池子中（LP 收益）

### MINIMUM_LIQUIDITY

- 首次 mint 锁定
- 防止池子被完全清空

### Router 与 Pair 的职责边界

- Router：算数 + 搬钱 + 调用
- Pair：不变量校验 + 状态维护

---

## 🧪 测试

运行测试：

```bash
forge test -vv
```

---

## 🚫 未包含内容

- ETH / WETH
- 多跳 swap
- permit
- 协议费
- 治理 / 升级

---

## 🚀 后续可扩展方向

- 多跳 swap
- removeLiquidity
- TWAP / Oracle
- 套利与 MEV 实验
- Uniswap V3 对比实现
