const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("==== Check Contract Status ====");

  // 读取部署信息
  const data = JSON.parse(fs.readFileSync("deployment.json"));
  const proxyAddress = data.AuctionV1Proxy;

  if (!proxyAddress)
    throw new Error("Proxy address not found in deployment.json");

  // 连接合约
  const AuctionV1 = await ethers.getContractFactory("AuctionV1");
  const auction = AuctionV1.attach(proxyAddress);

  // 获取合约信息
  console.log("\n==== Auction Contract Status ====");
  console.log("Proxy Address:", proxyAddress);
  
  const owner = await auction.owner();
  console.log("Owner:", owner);

  const feeBps = await auction.feeBps();
  console.log("Fee BPS:", feeBps.toString());
  console.log("Fee Percentage:", (Number(feeBps) / 100).toFixed(2) + "%");

  const feeRecipient = await auction.feeRecipient();
  console.log("Fee Recipient:", feeRecipient);

  const priceOracle = await auction.priceOracle();
  console.log("Price Oracle:", priceOracle);

  const totalAuctions = await auction.totalAuctions();
  console.log("Total Auctions:", totalAuctions.toString());

  // 检查当前签名者
  const [signer] = await ethers.getSigners();
  console.log("\n==== Signer Info ====");
  console.log("Signer Address:", signer.address);
  console.log("Is Owner:", signer.address.toLowerCase() === owner.toLowerCase());

  // 检查 PriceOracle 状态
  if (priceOracle && priceOracle !== ethers.ZeroAddress) {
    console.log("\n==== PriceOracle Status ====");
    try {
      const PriceOracle = await ethers.getContractFactory("PriceOracle");
      const oracle = PriceOracle.attach(priceOracle);
      
      const oracleOwner = await oracle.owner();
      console.log("Oracle Owner:", oracleOwner);
      
      // 检查 ETH 价格源
      const ethFeed = await oracle.getPriceFeed(ethers.ZeroAddress);
      if (ethFeed && ethFeed !== ethers.ZeroAddress) {
        console.log("ETH Price Feed:", ethFeed);
        try {
          const ethPrice = await oracle.getTokenPriceUsd(ethers.ZeroAddress);
          console.log("ETH/USD Price:", (Number(ethPrice) / 1e8).toFixed(2));
        } catch (err) {
          console.log("⚠️  Could not fetch ETH price:", err.message);
        }
      } else {
        console.log("ETH Price Feed: Not set");
      }
    } catch (err) {
      console.log("⚠️  Could not check PriceOracle:", err.message);
    }
  }

  // 检查合约余额
  console.log("\n==== Contract Balances ====");
  const ethBalance = await ethers.provider.getBalance(proxyAddress);
  console.log("ETH Balance:", ethers.formatEther(ethBalance));

  console.log("\n==== Done ====");
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

