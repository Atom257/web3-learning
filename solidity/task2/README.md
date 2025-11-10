# LearnChain (LRN) — ERC20 Demo Token

## 项目简介

**LearnChain (LRN)** 是一个基于 Solidity 编写并部署在 Sepolia 测试网的 ERC-20 示例代币合约，用于学习：

- ERC-20 标准接口
- 合约部署
- 转账 / 授权 / 增发基础流程
- 使用 Remix、MetaMask 与合约交互

---

## 合约信息

- 合约名称: ERC20Demo
- 代币名称: LearnChain
- 代币符号: LRN
- 精度 (decimals): 10
- 部署网络: Sepolia Testnet
- 合约地址: 0x7d0793abA48ED80BB229efe586c1020918D30F24
- 合约拥有者 (Owner): 部署该合约的钱包地址

---

## 功能概览

标准 ERC-20 功能：

- totalSupply() — 查询当前总发行量
- balanceOf(address) — 查询账户余额
- transfer(address to, uint256 amount) — 普通转账
- approve(address spender, uint256 amount) — 授权额度
- allowance(address owner, address spender) — 查询授权额度
- transferFrom(address from, address to, uint256 amount) — 使用授权进行代扣转账
- 事件:
  - Transfer(address from, address to, uint256 value)
  - Approval(address owner, address spender, uint256 value)

扩展功能：

- mint(address to, uint256 amount)
  - 仅合约 owner 可调用
  - 增发代币到指定地址
- 内部函数 _mint(address to, uint256 amount)
  - 由 mint 调用，负责更新 totalSupply 和余额

权限与错误：

- onlyOwner(action): 自定义修饰符，限制仅 owner 可执行
- error Unauthorized(address caller, string action)

---

## 部署说明（简要）

1. 在 Remix 新建 ERC20Demo.sol，粘贴合约代码。
2. 选择 Solidity 编译器版本 0.8.20，编译通过。
3. 在 Deploy & Run 中选择：
   - Environment: Browser Wallet
   - Network: Sepolia
4. 使用含测试 ETH 的 MetaMask 账户点击 Deploy。
5. 部署完成后获得合约地址 (已写在上方)。

---

## 在钱包中添加 LRN

1. 打开 MetaMask。
2. 切换到 Sepolia 网络。
3. 点击「导入代币 / Import Tokens」。
4. 填入合约地址：
   - 0x7d0793abA48ED80BB229efe586c1020918D30F24
5. 确认代币符号和精度，完成添加。

--- 

##Etherscan地址
https://sepolia.etherscan.io/token/0x7d0793aba48ed80bb229efe586c1020918d30f24?a=0x7d0793abA48ED80BB229efe586c1020918D30F24