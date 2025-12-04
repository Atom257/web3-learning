const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("==== Set Price Feed ====");

  // 读取部署信息
  const data = JSON.parse(fs.readFileSync("deployment.json"));
  const oracleAddress = data.PriceOracle;

  if (!oracleAddress) throw new Error("PriceOracle not found.");

  const PriceOracle = await ethers.getContractFactory("PriceOracle");
  const oracle = PriceOracle.attach(oracleAddress);

  // 1. 部署 Mock PriceFeed（8 decimals，ETH/USD = 2000）
  console.log("Deploying MockPriceFeed (ETH/USD = 2000)...");
  const MockFeed = await ethers.getContractFactory("MockPriceFeed");
  const feed = await MockFeed.deploy(2000n * 10n ** 8n); // $2000 * 1e8
  await feed.waitForDeployment();
  const feedAddress = await feed.getAddress();

  console.log("MockPriceFeed deployed at:", feedAddress);

  // 2. 设置到 PriceOracle
  console.log("Setting ETH price feed...");
  const tx = await oracle.setPriceFeed(ethers.ZeroAddress, feedAddress);
  await tx.wait();

  console.log("ETH price feed set successfully!");
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
