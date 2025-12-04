const { ethers, upgrades } = require("hardhat");
const fs = require("fs");
require("dotenv").config();

async function main() {
  console.log("==== Deploying PriceOracle ====");

  // 1. 部署 PriceOracle (Transparent Proxy)
  const PriceOracle = await ethers.getContractFactory("PriceOracle");
  const priceOracle = await upgrades.deployProxy(PriceOracle, [], {
    initializer: "initialize",
    kind: "transparent",
  });
  await priceOracle.waitForDeployment();
  const priceOracleAddr = await priceOracle.getAddress();
  console.log("PriceOracle Proxy deployed at:", priceOracleAddr);

  // 2. 查询 ProxyAdmin 地址
  const adminAddr = await upgrades.erc1967.getAdminAddress(priceOracleAddr);
  console.log("ProxyAdmin address:", adminAddr);

  // 3. 查询当前实现合约地址
  const implAddr = await upgrades.erc1967.getImplementationAddress(priceOracleAddr);
  console.log("Implementation address:", implAddr);

  // 4. 获取部署者地址（owner）
  const [deployer] = await ethers.getSigners();
  console.log("Deployer (Owner):", deployer.address);

  // 5. 可选：部署 MockPriceFeed 并设置 ETH 价格源（用于测试）
  const deployMockFeed = process.env.DEPLOY_MOCK_FEED !== "false"; // 默认部署
  let mockFeedAddress = null;
  
  if (deployMockFeed) {
    console.log("\n==== Deploying MockPriceFeed ====");
    const MockFeed = await ethers.getContractFactory("MockPriceFeed");
    const ethPriceUsd = process.env.ETH_PRICE_USD 
      ? BigInt(process.env.ETH_PRICE_USD) * 10n ** 8n 
      : 2000n * 10n ** 8n; // 默认 $2000
    
    const feed = await MockFeed.deploy(ethPriceUsd);
    await feed.waitForDeployment();
    mockFeedAddress = await feed.getAddress();
    console.log("MockPriceFeed deployed at:", mockFeedAddress);
    console.log("ETH/USD price:", ethPriceUsd.toString());

    // 设置 ETH 价格源（address(0) 代表 ETH）
    console.log("\n==== Setting ETH Price Feed ====");
    const tx = await priceOracle.setPriceFeed(ethers.ZeroAddress, mockFeedAddress);
    await tx.wait();
    console.log("ETH price feed set successfully!");
    console.log("Transaction hash:", tx.hash);
  }

  // 6. 保存部署信息
  console.log("\n==== Writing deployment.json ====");
  
  let deploymentInfo = {};
  if (fs.existsSync("deployment.json")) {
    deploymentInfo = JSON.parse(fs.readFileSync("deployment.json"));
  }

  deploymentInfo.PriceOracle = priceOracleAddr;
  deploymentInfo.PriceOracleProxyAdmin = adminAddr;
  deploymentInfo.PriceOracleImplementation = implAddr;
  deploymentInfo.PriceOracleOwner = deployer.address;
  
  if (mockFeedAddress) {
    deploymentInfo.MockPriceFeed = mockFeedAddress;
  }
  
  deploymentInfo.updatedAt = new Date().toISOString();

  fs.writeFileSync("deployment.json", JSON.stringify(deploymentInfo, null, 2));
  console.log("deployment.json updated:");
  console.log(JSON.stringify(deploymentInfo, null, 2));

  console.log("\n==== Deployment Completed ====");
  console.log("\nNext steps:");
  console.log("1. Use set_feed.js to set price feeds for other tokens");
  console.log("2. Use deploy_v1.js to deploy AuctionV1 (it will use this PriceOracle)");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

