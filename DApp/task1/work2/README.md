# 任务 2：合约代码生成

## 任务目标

使用 `abigen` 工具自动生成 Go 绑定代码，用于与 Sepolia 测试网络上的智能合约进行交互。

## 项目概述

本项目演示了如何使用 Go-Ethereum 的 `abigen` 工具从智能合约的 ABI 和字节码生成 Go 绑定代码，并使用生成的代码与部署在 Sepolia 测试网络上的智能合约进行交互。

## 项目结构

```
work2/
├── counter/              # 生成的 Go 绑定代码目录
│   └── counter.go        # abigen 自动生成的合约绑定代码
├── counter.abi           # 智能合约 ABI 文件
├── Counter.json          # Hardhat 编译后的合约文件（包含 ABI 和字节码）
├── main.go               # 主程序：与合约交互的示例代码
├── go.mod                # Go 模块依赖文件
├── go.sum                # Go 模块校验和
├── .env                  # 环境变量配置文件（需自行创建）
└── README.md             # 项目说明文档
```

## 智能合约

本项目使用的智能合约是一个简单的计数器合约（Counter），具有以下功能：

- **`get()`**: 读取当前计数器数值（view 函数）
- **`increment()`**: 增加计数器数值
- **`decrement()`**: 减少计数器数值
- **`set(uint256 newValue)`**: 设置计数器数值
- **`CounterChanged`**: 事件，当计数器值改变时触发

## 环境要求

- Go 1.24.0 或更高版本
- `abigen` 工具（Go-Ethereum 的一部分）
- 访问 Sepolia 测试网络的 RPC 节点
- 一个包含测试 ETH 的 Sepolia 账户（用于支付 gas 费用）

## 安装步骤

### 1. 安装 abigen 工具

`abigen` 是 Go-Ethereum 工具集的一部分，可以通过以下方式安装：

```bash
# 安装 go-ethereum
go install github.com/ethereum/go-ethereum/cmd/abigen@latest

# 验证安装
abigen --version
```

### 2. 安装项目依赖

```bash
go mod download
```

## 使用 abigen 生成 Go 绑定代码

### 方法 1：使用 ABI 文件生成

```bash
abigen --abi counter.abi --pkg counter --type Counter --out counter/counter.go
```

参数说明：
- `--abi counter.abi`: 指定 ABI 文件路径
- `--pkg counter`: 生成的 Go 包的名称
- `--type Counter`: 生成的合约类型名称
- `--out counter/counter.go`: 输出文件路径

### 方法 2：使用 JSON 文件生成（包含字节码）

```bash
abigen --abi Counter.json --pkg counter --type Counter --out counter/counter.go
```

## 配置环境变量

创建 `.env` 文件并配置以下环境变量：

```env
# Sepolia 测试网络 RPC 端点
SEPOLIA_RPC=https://sepolia.infura.io/v3/YOUR_INFURA_PROJECT_ID

# 合约地址（已部署在 Sepolia 上的 Counter 合约）
CONTRACT_ADDRESS=0xC96F44AeeC26d4CdbA4C34b83E1525EbEaDc5e96

# 私钥（用于签名交易，请勿泄露！）
# 注意：私钥不应包含 0x 前缀，或程序会自动去除
PRIVATE_KEY=your_private_key_here_without_0x_prefix
```

**安全提示**：
- ⚠️ **永远不要将包含真实私钥的 `.env` 文件提交到版本控制系统**
- 本项目已配置 `.gitignore` 忽略 `.env` 文件
- 示例中的私钥仅用于演示，请使用您自己的测试账户私钥

## 运行程序

配置好 `.env` 文件后，运行主程序：

```bash
go run main.go
```

## 程序功能说明

主程序 (`main.go`) 执行以下操作：

1. **连接 Sepolia 网络**：通过 RPC 端点连接到 Sepolia 测试网络
2. **加载合约**：使用合约地址和生成的绑定代码加载 Counter 合约
3. **读取当前值**：调用 `get()` 函数获取当前计数器数值
4. **增加计数器**：调用 `increment()` 函数增加计数器值
5. **等待交易确认**：等待交易被打包并确认
6. **再次读取值**：确认计数器值已更新
7. **查询历史事件**：查询最近 10 个区块中的 `CounterChanged` 事件

## 运行示例输出

```
已连接到 Sepolia
已加载合约: 0xC96F44AeeC26d4CdbA4C34b83E1525EbEaDc5e96
当前计数器数值: 106
increment() 已发送，交易哈希: 0xcc1a73d2d9ad7dcbfa9c7e2ab3adaa38eeb48713a28a2b68f32d953fd3a8ae8d
交易成功！Block = 9780368
最新计数器数值: 107
查询最近 10 个区块中的 CounterChanged 事件...
事件 old=105 new=106 block=9780361 tx=0x2b6ced5427625824831e7808be248da4d6437950f17e07a49cfe816e3cdb4717
事件 old=106 new=107 block=9780368 tx=0xcc1a73d2d9ad7dcbfa9c7e2ab3adaa38eeb48713a28a2b68f32d953fd3a8ae8d
事件查询完毕
```

## 代码说明

### 主要功能模块

#### 1. 合约交互

```go
// 创建合约实例
counterContract, err := counter.NewCounter(address, client)

// 调用 view 函数（不需要签名）
value, err := counterContract.Get(nil)

// 调用状态修改函数（需要签名）
tx, err := counterContract.Increment(auth)
```

#### 2. 交易签名

```go
// 从私钥创建交易签名器
privateKey, err := crypto.HexToECDSA(privHex)
auth, err := bind.NewKeyedTransactorWithChainID(privateKey, chainID)
```

#### 3. 等待交易确认

```go
// 等待交易被打包
receipt, err := bind.WaitMined(context.Background(), client, tx)
```

#### 4. 事件查询

```go
// 创建事件过滤器
filterer, err := counter.NewCounterFilterer(contractAddress, client)

// 过滤事件
it, err := filterer.FilterCounterChanged(opts)
```

## 依赖项

- `github.com/ethereum/go-ethereum`: Go-Ethereum 客户端库
- `github.com/joho/godotenv`: 环境变量加载库

## 注意事项

1. **Gas 费用**：在 Sepolia 测试网络上执行交易需要支付 gas 费用，请确保账户有足够的测试 ETH
2. **网络延迟**：交易确认时间取决于网络状况，程序会等待交易被打包
3. **私钥安全**：私钥用于签名交易，请妥善保管，不要泄露
4. **链 ID**：Sepolia 测试网络的链 ID 是 `11155111`

## 故障排除

### 问题：RPC 连接失败

- 检查 `SEPOLIA_RPC` 环境变量是否正确
- 确认网络连接正常
- 如果使用 Infura，检查项目 ID 是否正确

### 问题：交易失败

- 检查账户余额是否足够支付 gas 费用
- 确认私钥格式正确（可以带或不带 0x 前缀）
- 检查合约地址是否正确

### 问题：abigen 命令未找到

- 确认已正确安装 `go-ethereum`
- 检查 `$GOPATH/bin` 或 `$GOBIN` 是否在 `$PATH` 中

## 参考资料

- [Go-Ethereum 官方文档](https://geth.ethereum.org/docs/)
- [abigen 工具文档](https://geth.ethereum.org/docs/tools/abigen)
- [Sepolia 测试网络](https://sepolia.dev/)
- [Solidity 文档](https://docs.soliditylang.org/)

## 许可证

本项目仅用于学习和演示目的。

