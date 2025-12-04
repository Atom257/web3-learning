const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("==== Set Price Oracle ====");

  // 读取部署信息
  const data = JSON.parse(fs.readFileSync("deployment.json"));
  const proxyAddress = data.AuctionV1Proxy;

  if (!proxyAddress)
    throw new Error("Proxy address not found in deployment.json");

  // 连接合约
  const AuctionV1 = await ethers.getContractFactory("AuctionV1");
  const auction = AuctionV1.attach(proxyAddress);

  // 获取当前价格预言机
  const currentOracle = await auction.priceOracle();
  console.log("Current price oracle:", currentOracle);

  // 新价格预言机地址（从环境变量或命令行参数获取）
  const newOracle = process.argv[2] 
    ? process.argv[2] 
    : process.env.NEW_PRICE_ORACLE
      ? process.env.NEW_PRICE_ORACLE
      : data.PriceOracle; // 默认使用 deployment.json 中的 PriceOracle

  if (!newOracle) {
    console.log("\nUsage:");
    console.log("  npx hardhat run scripts/set_price_oracle.js --network localhost -- 0x...");
    console.log("  or");
    console.log("  NEW_PRICE_ORACLE=0x... npx hardhat run scripts/set_price_oracle.js --network localhost");
    return;
  }

  if (!ethers.isAddress(newOracle)) {
    throw new Error("Invalid address format");
  }

  if (newOracle.toLowerCase() === currentOracle.toLowerCase()) {
    console.log("⚠️  New price oracle is the same as current oracle. No change needed.");
    return;
  }

  console.log("\nSetting new price oracle:", newOracle);

  // 检查是否为 owner
  const [signer] = await ethers.getSigners();
  const owner = await auction.owner();
  if (signer.address !== owner) {
    throw new Error(`Only owner can set price oracle. Current owner: ${owner}, Signer: ${signer.address}`);
  }

  // 设置价格预言机
  const tx = await auction.setPriceOracle(newOracle);
  console.log("Transaction hash:", tx.hash);
  console.log("Waiting for confirmation...");
  await tx.wait();

  // 验证
  const updatedOracle = await auction.priceOracle();
  console.log("\n==== Price Oracle Updated ====");
  console.log("New price oracle:", updatedOracle);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

