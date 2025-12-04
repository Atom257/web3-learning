const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("==== Set Chainlink Price Feed on Sepolia ====");

  // 读取部署信息
  const data = JSON.parse(fs.readFileSync("deployment.json"));
  const oracleAddress = data.PriceOracle;

  if (!oracleAddress) throw new Error("PriceOracle not found in deployment.json");

  const PriceOracle = await ethers.getContractFactory("PriceOracle");
  const oracle = PriceOracle.attach(oracleAddress);

  // Sepolia 测试网 Chainlink 价格源地址
  // ETH/USD: https://docs.chain.link/data-feeds/price-feeds/addresses?network=ethereum&page=1#sepolia-testnet
  const CHAINLINK_ETH_USD_SEPOLIA = "0x694AA1769357215DE4FAC081bf1f309aDC325306";

  console.log("Setting Chainlink ETH/USD price feed on Sepolia...");
  console.log("Price Feed Address:", CHAINLINK_ETH_USD_SEPOLIA);
  console.log("Oracle Address:", oracleAddress);

  // 检查是否为 owner
  const [signer] = await ethers.getSigners();
  const owner = await oracle.owner();
  if (signer.address.toLowerCase() !== owner.toLowerCase()) {
    throw new Error(`Only owner can set price feed. Owner: ${owner}, Signer: ${signer.address}`);
  }

  // 设置 ETH 价格源
  const tx = await oracle.setPriceFeed(ethers.ZeroAddress, CHAINLINK_ETH_USD_SEPOLIA);
  console.log("Transaction hash:", tx.hash);
  console.log("Waiting for confirmation...");
  await tx.wait();

  console.log("\n==== ETH Price Feed Set Successfully ====");
  console.log("ETH/USD Price Feed:", CHAINLINK_ETH_USD_SEPOLIA);
  
  // 验证设置
  const feedAddress = await oracle.getPriceFeed(ethers.ZeroAddress);
  console.log("Verified Feed Address:", feedAddress);
  
  if (feedAddress.toLowerCase() === CHAINLINK_ETH_USD_SEPOLIA.toLowerCase()) {
    console.log("✅ Price feed verified successfully!");
  } else {
    console.log("⚠️  Warning: Feed address mismatch!");
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

