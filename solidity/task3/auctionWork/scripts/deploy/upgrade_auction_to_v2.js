const { ethers, upgrades } = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("==== Upgrading AuctionV1 -> AuctionV2 ====");

  // 1. 读取 deployment.json
  const data = JSON.parse(fs.readFileSync("deployment.json"));
  const proxyAddress = data.AuctionV1Proxy;

  if (!proxyAddress) {
    throw new Error("AuctionV1Proxy not found in deployment.json");
  }

  console.log("Proxy address:", proxyAddress);

  // 2. 获取 AuctionV2 工厂
  const AuctionV2 = await ethers.getContractFactory("AuctionV2");

  // 3. 升级
  console.log("Upgrading proxy...");

  const upgraded = await upgrades.upgradeProxy(proxyAddress, AuctionV2);
  await upgraded.waitForDeployment();

  console.log("Upgrade completed!");

  // 4. 获取新的 Implementation 地址
  const newImpl = await upgrades.erc1967.getImplementationAddress(proxyAddress);
  console.log("New implementation address:", newImpl);

  // 5. 更新 deployment.json
  const newData = {
    ...data,
    AuctionV2Implementation: newImpl,
    updatedAt: new Date().toISOString(),
  };

  fs.writeFileSync("deployment.json", JSON.stringify(newData, null, 2));
  console.log("deployment.json updated.");

  console.log("==== Upgrade Done ====");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
