const { ethers } = require("hardhat");
const fs = require("fs");
const { log } = require("console");

function formatAuctionInfo(info) {
  return {
    seller: info.seller,
    itemId: info.itemId.toString(),
    paymentToken: info.paymentToken,
    reservePriceUsd: info.reservePriceUsd.toString(),
    highestBidUsd: info.highestBidUsd.toString(),
    highestBidAmount: info.highestBidAmount.toString(),
    highestBidder: info.highestBidder,
    startTime: new Date(Number(info.startTime) * 1000).toLocaleString(),
    endTime: new Date(Number(info.endTime) * 1000).toLocaleString(),
    settled: info.settled,
    nftAddress: info.nftAddress,
    nftTokenId: info.nftTokenId.toString(),
  };
}

async function main() {
  console.log("==== Get Auction Info ====");
  const data = JSON.parse(fs.readFileSync("deployment.json"));
  const proxyAddress = data.AuctionV1Proxy;
  if (!proxyAddress)
    throw new Error("Proxy address not found in deployment.json");

  // 连接合约
  const AuctionV1 = await ethers.getContractFactory("AuctionV1");
  const auction = AuctionV1.attach(proxyAddress);
  console.log("AuctionV1 address", await auction.getAddress());

  //获取 AuctionInfo
  const auctionId = 1;
  const auctionInfo = await auction.getAuctionInfo(auctionId);
  console.log("拍卖信息：", formatAuctionInfo(auctionInfo));
}

main().catch((error) => {
  console.log(error);
  process.exitCode = 1;
});
