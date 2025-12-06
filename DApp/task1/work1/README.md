# Sepolia 测试网络区块链交互项目

这是一个使用 Go 语言和 go-ethereum 库实现的区块链交互工具，支持在 Sepolia 测试网络上查询区块信息和发送以太币交易。

## 功能特性

- ✅ **查询区块信息**：查询指定区块号的详细信息，包括区块哈希、时间戳、交易数量、Gas 使用情况等
- ✅ **发送 ETH 交易**：构造、签名并发送以太币转账交易到 Sepolia 测试网络
- ✅ **交易收据解析**：显示区块中的交易收据和日志信息

## 环境要求

- **Go 语言**：版本 1.24.0 或更高
- **Infura 账户**：用于访问 Sepolia 测试网络的 RPC 节点
- **Sepolia 测试账户**：用于发送交易的测试账户（包含私钥）

## 安装步骤

### 1. 安装 Go 语言环境

如果尚未安装 Go，请访问 [Go 官网](https://go.dev/dl/) 下载并安装适合您操作系统的版本。

验证安装：
```bash
go version
```

### 2. 安装项目依赖

克隆或下载项目后，在项目根目录执行：

```bash
go mod download
```

这将自动下载 `go-ethereum` 和 `godotenv` 等依赖包。

### 3. 注册 Infura 账户并获取 API Key

1. 访问 [Infura 官网](https://www.infura.io/)
2. 注册一个新账户（如果还没有）
3. 登录后，创建一个新项目
4. 在项目设置中选择 **Sepolia** 网络
5. 复制 **HTTPS Endpoint** URL，格式类似：
   ```
   https://sepolia.infura.io/v3/YOUR_PROJECT_ID
   ```

### 4. 准备 Sepolia 测试账户

#### 获取测试 ETH

在发送交易之前，您需要确保账户有足够的 Sepolia 测试 ETH：

1. 访问 [Sepolia 水龙头](https://sepoliafaucet.com/) 或 [Alchemy Faucet](https://sepoliafaucet.com/)
2. 输入您的钱包地址获取测试 ETH

#### 获取私钥

- 如果您使用 MetaMask：
  1. 打开 MetaMask 扩展
  2. 选择 Sepolia 测试网络
  3. 点击账户详情 → 导出私钥
  4. **注意**：请妥善保管私钥，不要泄露给他人

- 如果您使用其他钱包工具，请按照相应工具的方法导出私钥

## 配置说明

### 创建 .env 文件

在项目根目录创建 `.env` 文件，配置以下环境变量：

```env
# Infura Sepolia 网络 RPC URL
INFURA_URL=https://sepolia.infura.io/v3/YOUR_PROJECT_ID

# 发送交易的账户私钥（不含 0x 前缀，或包含 0x 前缀都可以）
PRIVATE_KEY=your_private_key_here
```

**重要提示**：
- 请确保 `.env` 文件已添加到 `.gitignore` 中，不要将私钥提交到版本控制系统
- `PRIVATE_KEY` 可以是带 `0x` 前缀或不带前缀的格式，代码会自动处理

### .env 文件示例

```env
INFURA_URL=https://sepolia.infura.io/v3/1234567890abcdef1234567890abcdef
PRIVATE_KEY=0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef
```

## 使用方法

### 查询区块信息

查询指定区块号的详细信息：

```bash
go run . block -num 9779585
```

**参数说明**：
- `-num`：要查询的区块号（必须大于 0）

**输出示例**：
```
查询区块号: 9779585
===== 区块信息 =====
区块号: 9779585
哈希: 0x1234567890abcdef...
Parent哈希: 0xabcdef1234567890...
时间戳: 1234567890
交易数量: 150
Gas Used : 15000000
Gas Limit : 30000000
Base Fee Per Gas: 20000000000
Extra: ...
====================
===== 区块交易信息 =====
...
```

### 发送 ETH 交易

向指定地址发送以太币：

```bash
go run . sendeth -to 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb -value 0.01
```

**参数说明**：
- `-to`：接收方以太坊地址（必须以 0x 开头）
- `-value`：发送金额，单位为 ETH（例如：0.01 表示 0.01 ETH）

**输出示例**：
```
========== ETH Send ==========
From: 0xYourAddress...
To: 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb
Amount(ETH): 10000000000000000
GasPrice(wei): 20000000000
Nonce: 5
TxHash: 0xabc123def456...
```

**注意事项**：
- 确保发送方账户有足够的 ETH 余额（包括 Gas 费用）
- 交易发送后，可以在 [Sepolia Etherscan](https://sepolia.etherscan.io/) 上查看交易状态
- 使用交易哈希（TxHash）可以在区块链浏览器上追踪交易

## 项目结构

```
work1/
├── main.go          # 主程序入口，处理命令行参数
├── block.go         # 查询区块信息的实现
├── sendeth.go       # 发送 ETH 交易的实现
├── go.mod           # Go 模块依赖管理
├── go.sum           # 依赖校验文件
├── .env             # 环境变量配置（需要自行创建）
└── README.md        # 项目说明文档
```

### 代码说明

#### main.go
- 命令行参数解析和路由
- 支持 `block` 和 `sendeth` 两个子命令
- 使用 `godotenv` 加载环境变量

#### block.go
- `handleBlockCmd()`：处理区块查询命令
- 使用 `ethclient` 连接到 Sepolia 网络
- 查询区块信息并解析交易收据和日志

#### sendeth.go
- `handleSendEthCmd()`：处理发送 ETH 命令
- 从私钥恢复账户地址
- 构造交易、签名并发送到网络
- 自动获取 nonce 和 gas price

## 常见问题

### 1. 连接节点失败

**问题**：`连接节点失败: dial tcp: lookup sepolia.infura.io`

**解决方案**：
- 检查网络连接
- 确认 `INFURA_URL` 配置正确
- 验证 Infura 项目 ID 是否有效

### 2. 交易发送失败

**问题**：`交易发送失败: insufficient funds`

**解决方案**：
- 确保账户有足够的 Sepolia 测试 ETH
- 检查余额是否足够支付转账金额和 Gas 费用
- 访问 Sepolia 水龙头获取测试 ETH

### 3. 私钥解析失败

**问题**：`解析私钥失败`

**解决方案**：
- 确认私钥格式正确（64 个十六进制字符，可选 0x 前缀）
- 检查 `.env` 文件中的 `PRIVATE_KEY` 值是否正确
- 确保私钥没有多余的空格或换行符

### 4. 查询区块失败

**问题**：`查询区块失败: not found`

**解决方案**：
- 确认区块号在 Sepolia 网络上存在
- 检查区块号是否大于 0
- 验证网络连接是否正常

## 安全提示

⚠️ **重要安全警告**：

1. **私钥安全**：
   - 永远不要将私钥提交到版本控制系统
   - 不要在公共场合分享私钥
   - 建议使用测试账户，不要使用主网账户的私钥

2. **环境变量**：
   - 确保 `.env` 文件已添加到 `.gitignore`
   - 不要将包含私钥的 `.env` 文件分享给他人

3. **测试网络**：
   - 本项目仅用于 Sepolia 测试网络
   - 不要在生产环境或主网使用测试代码

## 技术栈

- **Go 1.24.0+**：编程语言
- **go-ethereum v1.16.7**：以太坊 Go 客户端库
- **godotenv v1.5.1**：环境变量管理

## 参考资料

- [go-ethereum 官方文档](https://geth.ethereum.org/docs)
- [Infura 文档](https://docs.infura.io/)
- [Sepolia 测试网络信息](https://sepolia.dev/)
- [Sepolia Etherscan](https://sepolia.etherscan.io/)

## 许可证

本项目仅用于学习和测试目的。

---

**注意**：本项目仅用于 Sepolia 测试网络，请勿在生产环境使用。

