const { ethers, upgrades } = require("hardhat");
const fs = require("fs");
require("dotenv").config();

async function main() {
  console.log("==== Deploying PriceOracle ====");

  const PriceOracle = await ethers.getContractFactory("PriceOracle");
  const priceOracle = await upgrades.deployProxy(PriceOracle, [], {
    initializer: "initialize",
    kind: "transparent",
  });
  await priceOracle.waitForDeployment();
  const priceOracleAddr = await priceOracle.getAddress();
  console.log("PriceOracle deployed at:", priceOracleAddr);

  console.log("==== Deploying AuctionV1 (Transparent Proxy) ====");

  const AuctionV1 = await ethers.getContractFactory("AuctionV1");

  const feeBps = Number(process.env.FEE_BPS || "200"); // 默认 2%
  const feeRecipient = process.env.FEE_RECIPIENT; //收取手续费EOA

  if (!feeRecipient) {
    throw new Error("FEE_RECIPIENT not set in .env");
  }

  const proxy = await upgrades.deployProxy(
    AuctionV1,
    [
      priceOracleAddr, // oracle
      feeBps,
      feeRecipient,
    ],
    {
      kind: "transparent",
      initializer: "initialize",
    }
  );

  await proxy.waitForDeployment();

  const proxyAddr = await proxy.getAddress();
  console.log("AuctionV1 Proxy deployed at:", proxyAddr);

  // 查询 ProxyAdmin 地址
  const adminAddr = await upgrades.erc1967.getAdminAddress(proxyAddr);
  console.log("ProxyAdmin address:", adminAddr);

  // 查询当前实现合约地址
  const implAddr = await upgrades.erc1967.getImplementationAddress(proxyAddr);
  console.log("Implementation address:", implAddr);

  console.log("==== Writing deployment.json ====");

  const deploymentInfo = {
    network: process.env.HARDHAT_NETWORK || "unknown",
    PriceOracle: priceOracleAddr,
    AuctionV1Proxy: proxyAddr,
    ProxyAdmin: adminAddr,
    AuctionV1Implementation: implAddr,
    updatedAt: new Date().toISOString(),
  };

  fs.writeFileSync("deployment.json", JSON.stringify(deploymentInfo, null, 2));

  console.log("deployment.json saved:");
  console.log(deploymentInfo);

  console.log("==== Deployment Completed ====");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
