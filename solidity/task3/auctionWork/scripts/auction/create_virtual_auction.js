const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("==== Create Auction ====");

  // 读取部署信息
  const data = JSON.parse(fs.readFileSync("deployment.json"));
  const proxyAddress = data.AuctionV1Proxy;

  if (!proxyAddress)
    throw new Error("Proxy address not found in deployment.json");

  // 连接合约
  const AuctionV1 = await ethers.getContractFactory("AuctionV1");
  const auction = AuctionV1.attach(proxyAddress);

  // 参数（可以修改）
  const itemId = 12345; // 虚拟物品 ID
  const paymentToken = ethers.ZeroAddress; // ETH 支付
  const reservePriceUsd = 100 * 1e8; // 底价 $100 （USD 精度 1e8）
  const startTime = Math.floor(Date.now() / 1000); // 立即开始
  const endTime = startTime + 60 * 10; // 10 分钟后结束

  console.log("Creating auction...");
  const tx = await auction.createAuction(
    itemId,
    paymentToken,
    reservePriceUsd,
    startTime,
    endTime,
    ethers.ZeroAddress, // V1 无 NFT
    0
  );

  console.log("Waiting for tx...");
  const receipt = await tx.wait();

  // 解析事件 AuctionCreated
  const event = receipt.logs?.find(
    (log) => log.fragment && log.fragment.name === "AuctionCreated"
  );

  if (event) {
    console.log(
      `Auction created successfully! AuctionId = ${event.args.auctionId.toString()}`
    );
  } else {
    console.log("Auction created (event not parsed). TX:", tx.hash);
  }

  console.log("==== Done ====");
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
