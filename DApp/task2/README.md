
# 🌐 Ethereum PoW Private Chain Deployment (Geth v1.11.6)

本项目演示如何在本地使用 **Geth v1.11.6（支持 Ethash PoW）** 部署一个完整的以太坊私有链，并实现挖矿、账户管理与交互操作。

---

## ✨ 功能特点

- 兼容 PoW（Ethash）共识机制  
- 支持自定义 Genesis 配置  
- 支持账户解锁、挖矿、余额增长  
- HTTP + personal API 交互  
- 适用于智能合约部署、本地开发、DApp 调试  

---

# 1. ⚙ 环境准备

## 1.1 安装 GVM

```bash
curl -s -L https://raw.githubusercontent.com/moovweb/gvm/master/binscripts/gvm-installer | bash
source ~/.gvm/scripts/gvm
```

## 1.2 安装 Go 1.20.14

```bash
gvm install go1.20.14
gvm use go1.20.14 --default
go version
```

---

# 2. ⬇ 克隆并编译 Geth v1.11.6

```bash
git clone https://github.com/ethereum/go-ethereum
cd go-ethereum
git fetch --all --tags
git checkout v1.11.6
git reset --hard v1.11.6
make geth
```

---

# 3. 📁 初始化私链目录

```bash
mkdir -p ~/projects-web3/test/pow-chain
cd ~/projects-web3/test/pow-chain
mkdir node1
```

---

# 4. 🔐 创建账户

```bash
~/go-ethereum/build/bin/geth --datadir node1 account new
```

---

# 5. 📄 创建 genesis.json

(内容略)

---

# 6. 🚀 初始化区块链

```bash
~/go-ethereum/build/bin/geth --datadir node1 init genesis.json
```

---

# 7. ▶ 启动节点（启用 personal API）

```bash
~/go-ethereum/build/bin/geth   --datadir node1   --networkid 2024   --http --http.api "eth,web3,net,miner,personal"   --rpc.enabledeprecatedpersonal   --allow-insecure-unlock
```

---

# 8. 💻 进入控制台

```bash
~/go-ethereum/build/bin/geth attach http://127.0.0.1:8545

personal
{
  listAccounts: ["0xc2e359f366a61b07638271aeaf202ae5f4373371"],
  listWallets: [{
      accounts: [{...}],
      status: "Locked",
      url: "keystore:///home/sun/projects-web3/test/pow-chain/node1/keystore/UTC--2025-12-07T03-03-53.045706155Z--c2e359f366a61b07638271aeaf202ae5f4373371"
  }],
  deriveAccount: function(),
  ecRecover: function(),
  getListAccounts: function(callback),
  getListWallets: function(callback),
  importRawKey: function(),
  initializeWallet: function(),
  lockAccount: function(),
  newAccount: function github.com/ethereum/go-ethereum/internal/jsre.MakeCallback.func1(),
  openWallet: function github.com/ethereum/go-ethereum/internal/jsre.MakeCallback.func1(),
  sendTransaction: function(),
  sign: function github.com/ethereum/go-ethereum/internal/jsre.MakeCallback.func1(),
  signTransaction: function(),
  unlockAccount: function github.com/ethereum/go-ethereum/internal/jsre.MakeCallback.func1(),
  unpair: function()
}
```

---

# 9. 🧱 挖矿操作

```js
personal.unlockAccount(eth.accounts[0], "123", 0)
miner.setEtherbase(eth.accounts[0])
miner.start(1)
eth.blockNumber
eth.getBalance(eth.accounts[0])


> miner.start(32)
null
> eth.mining
true
> eth.blockNumber
273
>
> eth.blockNumber
293
> eth.getBalance(eth.accounts[0])
2.0282409604377670423947251286015e+31
> eth.getBalance(eth.accounts[0])
2.0282409604559670423947251286015e+31
> miner.stop()
null
> eth.mining
false
```

---

# 🎉 完成

你的 PoW 私链已启动并成功挖矿！
