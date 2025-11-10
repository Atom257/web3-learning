# 我的第一个 NFT 项目

这是一个使用 **Solidity** 编写的简单 NFT 智能合约项目，符合 **ERC721 标准**。  
项目通过 **OpenZeppelin 库** 实现核心逻辑，并在 **Sepolia 测试网** 上完成部署与铸造。

---

## 🧩 项目结构

- **MyNFT.sol**：主合约文件，继承自 `ERC721` 和 `Ownable`。
- **metadata.json**：NFT 元数据文件，描述名称、图片与属性。
- **IPFS**：存储图片与 JSON 元数据的分布式文件系统。

---

## 🚀 功能说明

- 部署合约，设置 NFT 名称与符号  
- 通过 `mintNFT` 函数铸造新的 NFT  
- 每个 NFT 绑定唯一的 `tokenURI`（即 IPFS 链接）  
- 拥有者可在链上查看、转移、验证 NFT

---

## 🛠️ 开发环境

- Remix IDE  
- Solidity 版本：^0.8.0  
- OpenZeppelin 合约库  
- MetaMask 钱包（连接 Sepolia 测试网）

---

## 📦 使用步骤

1. 编写并编译 `MyNFT.sol`
2. 上传图片与 `metadata.json` 到 IPFS（推荐使用 Pinata）
3. 在 Remix 中部署合约
4. 调用 `mintNFT(address recipient, string memory tokenURI)`
5. 在 Etherscan 上验证结果

---

## 🌐 示例链接

- 合约地址：[0xcC54e21B79bAa23a8E131a9F9f61392065e764B9](https://sepolia.etherscan.io/address/0xcC54e21B79bAa23a8E131a9F9f61392065e764B9)
- 图片 IPFS：[bafybeibeo3ymysajlrpoietisrh4tpz3hmyoi7b2ydstq34ez5bttcnc6q](https://gateway.pinata.cloud/ipfs/bafybeibeo3ymysajlrpoietisrh4tpz3hmyoi7b2ydstq34ez5bttcnc6q)
- 元数据 IPFS：[bafkreidmhrfxude73wh33t3sly5eforgb3wsbvrt642wzte6vscihphawm](https://gateway.pinata.cloud/ipfs/bafkreidmhrfxude73wh33t3sly5eforgb3wsbvrt642wzte6vscihphawm)

---

## 🧠 作者

- **作者**：Atom257  
- **说明**：这是一个练习项目，用于学习 NFT 与 Solidity 智能合约开发。

