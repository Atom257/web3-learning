# 部署地址说明

## 本地网络部署

已部署到 Hardhat 本地网络（chainId: 31337）

### 合约地址

```json
{
  "network": "localhost",
  "PriceOracle": "0x70e0bA845a1A0F2DA3359C97E0285013525FFC49",
  "AuctionV1Proxy": "0x99bbA657f2BbC93c02D617f8bA121cB8Fc104Acf",
  "ProxyAdmin": "0x3E69aeCb6a5abAc2D87d6707649E2fB0173ee2Da",
  "AuctionV1Implementation": "0x4826533B4897376654Bb4d4AD88B7faFD0C98528",
  "updatedAt": "2025-12-04T01:29:22.196Z"
}
```

### 部署说明

- **PriceOracle**: 价格预言机合约（透明代理）
- **AuctionV1Proxy**: 拍卖合约代理地址（用户交互地址）
- **AuctionV1Implementation**: 拍卖合约实现地址
- **ProxyAdmin**: 代理管理员地址（用于升级）

## 测试网部署

### Sepolia 测试网 ✅ 已部署

**部署状态**: ✅ 已完成

#### 已部署合约地址

```json
{
  "network": "sepolia",
  "PriceOracle": "0x4CD64219dDC61820D859A38d2E95Aa0156f62491",
  "PriceOracleProxyAdmin": "0xbB21B11E973c6AE2c13bc3B788B71b59B6d50035",
  "PriceOracleImplementation": "0x15845E60A48dfc1EbB8b272baaC45880d52A4335",
  "ChainlinkETHUSDPriceFeed": "0x694AA1769357215DE4FAC081bf1f309aDC325306",
  "AuctionV1Proxy": "0xC8228c7A9165a22459022a3B0e1B11C41DF15560",
  "ProxyAdmin": "0xbB21B11E973c6AE2c13bc3B788B71b59B6d50035",
  "AuctionV1Implementation": "0x15845E60A48dfc1EbB8b272baaC45880d52A4335",
  "AuctionV2Implementation": "0x15845E60A48dfc1EbB8b272baaC45880d52A4335",
  "deployedAt": "2025-12-04T02:28:38.352Z",
  "upgradedAt": "2025-12-04T02:29:05.233Z"
}
```

#### Etherscan 链接

- **PriceOracle (Proxy)**: [0x4CD64219dDC61820D859A38d2E95Aa0156f62491](https://sepolia.etherscan.io/address/0x4CD64219dDC61820D859A38d2E95Aa0156f62491)
- **AuctionV1 (Proxy)** ⭐ **用户交互地址**: [0xC8228c7A9165a22459022a3B0e1B11C41DF15560](https://sepolia.etherscan.io/address/0xC8228c7A9165a22459022a3B0e1B11C41DF15560)
- **ProxyAdmin**: [0xbB21B11E973c6AE2c13bc3B788B71b59B6d50035](https://sepolia.etherscan.io/address/0xbB21B11E973c6AE2c13bc3B788B71b59B6d50035)
- **Chainlink ETH/USD Price Feed**: [0x694AA1769357215DE4FAC081bf1f309aDC325306](https://sepolia.etherscan.io/address/0x694AA1769357215DE4FAC081bf1f309aDC325306)

#### 合约功能说明

**PriceOracle（价格预言机）**:
- 集成 Chainlink 价格预言机
- 支持 ETH 和 ERC20 代币价格查询
- 自动将代币数量转换为 USD 价值

**AuctionV1/V2（拍卖合约）**:
- 当前版本: V2（已升级）
- 支持 NFT 拍卖
- 支持 ETH 和 ERC20 出价
- 动态手续费功能
- 价格预言机集成

**Chainlink 价格源**:
- 状态: ✅ 已配置并验证
- 使用 Chainlink 官方价格源，价格实时更新

#### 部署步骤（参考）

如需重新部署，请按照以下步骤：

1. **配置环境变量**（`.env` 文件）：
   ```env
   SEPOLIA_RPC=https://sepolia.infura.io/v3/YOUR_INFURA_KEY
   PRIVATE_KEY=your_private_key_here
   FEE_BPS=200
   FEE_RECIPIENT=0x...
   ETHERSCAN_KEY=your_etherscan_api_key
   ```

2. **部署价格预言机**：
   ```bash
   npx hardhat run scripts/deploy/deploy_price_oracle.js --network sepolia
   ```

3. **设置 Chainlink 价格源**：
   ```bash
   npx hardhat run scripts/admin/set_chainlink_feed_sepolia.js --network sepolia
   ```

4. **部署拍卖合约**：
   ```bash
   npx hardhat run scripts/deploy/deploy_auction_v1.js --network sepolia
   ```

5. **升级到 V2**：
   ```bash
   npx hardhat run scripts/deploy/upgrade_auction_to_v2.js --network sepolia
   ```

部署完成后，合约地址会保存在 `deployment.json` 文件中。

### 部署后验证

部署到测试网后，可以使用 Etherscan 验证合约：

```bash
# 验证实现合约
npx hardhat verify --network sepolia <IMPLEMENTATION_ADDRESS>

# 验证代理合约（需要提供初始化参数）
npx hardhat verify --network sepolia <PROXY_ADDRESS> \
  --constructor-args arguments.js
```

## 合约交互地址

**⚠️ 重要**: 用户应该与 **代理地址（Proxy）** 交互，而不是实现地址。

### 用户交互地址

- ✅ **拍卖合约**: `0xC8228c7A9165a22459022a3B0e1B11C41DF15560` ⭐
- ✅ **价格预言机**: `0x4CD64219dDC61820D859A38d2E95Aa0156f62491`

### 管理地址

- **ProxyAdmin**: `0xbB21B11E973c6AE2c13bc3B788B71b59B6d50035`
  - 用于合约升级和管理

### 使用示例

```javascript
// 与拍卖合约交互（使用代理地址）
const auctionAddress = "0xC8228c7A9165a22459022a3B0e1B11C41DF15560";

// 与价格预言机交互
const oracleAddress = "0x4CD64219dDC61820D859A38d2E95Aa0156f62491";
```

## 升级说明

合约使用透明代理模式，支持升级：

1. 升级不会改变代理地址
2. 用户始终使用同一个代理地址
3. 升级后实现地址会改变
4. 所有数据保持不变

## 网络信息

### Sepolia 测试网
- **Chain ID**: 11155111
- **RPC URL**: https://sepolia.infura.io/v3/YOUR_KEY
- **Explorer**: https://sepolia.etherscan.io
- **Chainlink 价格源**: 
  - ETH/USD: `0x694AA1769357215DE4FAC081bf1f309aDC325306`

### 本地网络
- **Chain ID**: 31337
- **RPC URL**: http://localhost:8545
- **Explorer**: N/A

## 部署验证

### 合约部署验证

- ✅ PriceOracle 已部署
- ✅ AuctionV1 已部署
- ✅ 已升级到 AuctionV2
- ✅ Chainlink 价格源已配置

### 功能验证

- ✅ 价格预言机可以查询 ETH 价格
- ✅ 拍卖合约可以创建拍卖
- ✅ 支持 ETH 和 ERC20 出价
- ✅ 动态手续费功能可用

## 测试网使用

1. **获取测试网 ETH**: 从 [Sepolia Faucet](https://sepoliafaucet.com/) 获取
2. **连接网络**: 在 MetaMask 中添加 Sepolia 测试网
3. **交互合约**: 使用上述代理地址与合约交互

## 注意事项

1. **私钥安全**: 永远不要将私钥提交到代码仓库
2. **测试网资金**: 部署到测试网需要测试网 ETH（可从水龙头获取）
3. **Gas 费用**: 部署和升级需要支付 Gas 费用
4. **价格源**: 确保使用 Chainlink 官方价格源地址
5. **合约验证**: 建议在 Etherscan 上验证合约代码
6. **代理地址**: 始终使用代理地址（Proxy）与合约交互

---

**最后更新**: 2025-12-04
**部署状态**: 
- ✅ 本地网络已部署
- ✅ Sepolia 测试网已部署
- ✅ 合约已升级到 V2

