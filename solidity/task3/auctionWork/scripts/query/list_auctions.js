const { ethers } = require("hardhat");
const fs = require("fs");

function formatAuctionInfo(info, auctionId) {
  return {
    auctionId: auctionId.toString(),
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
  console.log("==== List All Auctions ====");

  // 读取部署信息
  const data = JSON.parse(fs.readFileSync("deployment.json"));
  const proxyAddress = data.AuctionV1Proxy;

  if (!proxyAddress)
    throw new Error("Proxy address not found in deployment.json");

  // 连接合约
  const AuctionV1 = await ethers.getContractFactory("AuctionV1");
  const auction = AuctionV1.attach(proxyAddress);

  // 获取拍卖总数
  const totalAuctions = await auction.totalAuctions();
  console.log("Total auctions:", totalAuctions.toString());
  console.log("");

  if (totalAuctions === 0n) {
    console.log("No auctions found.");
    return;
  }

  // 列出所有拍卖
  const auctions = [];
  for (let i = 1n; i <= totalAuctions; i++) {
    try {
      const info = await auction.getAuctionInfo(i);
      auctions.push(formatAuctionInfo(info, i));
    } catch (err) {
      console.log(`⚠️  Failed to get auction ${i}:`, err.message);
    }
  }

  // 显示结果
  console.log("==== Auction List ====");
  auctions.forEach((auction, index) => {
    console.log(`\n[${index + 1}] Auction ID: ${auction.auctionId}`);
    console.log(`  Seller: ${auction.seller}`);
    console.log(`  Item ID: ${auction.itemId}`);
    console.log(`  Payment Token: ${auction.paymentToken === ethers.ZeroAddress ? "ETH" : auction.paymentToken}`);
    console.log(`  Reserve Price (USD): $${(Number(auction.reservePriceUsd) / 1e8).toFixed(2)}`);
    console.log(`  Highest Bid (USD): $${(Number(auction.highestBidUsd) / 1e8).toFixed(2)}`);
    console.log(`  Highest Bidder: ${auction.highestBidder}`);
    console.log(`  Start Time: ${auction.startTime}`);
    console.log(`  End Time: ${auction.endTime}`);
    console.log(`  Status: ${auction.settled ? "Settled" : "Active"}`);
    if (auction.nftAddress !== ethers.ZeroAddress) {
      console.log(`  NFT: ${auction.nftAddress} #${auction.nftTokenId}`);
    }
  });

  console.log("\n==== Summary ====");
  const active = auctions.filter(a => !a.settled).length;
  const settled = auctions.filter(a => a.settled).length;
  const withNft = auctions.filter(a => a.nftAddress !== ethers.ZeroAddress).length;
  
  console.log(`Total: ${auctions.length}`);
  console.log(`Active: ${active}`);
  console.log(`Settled: ${settled}`);
  console.log(`With NFT: ${withNft}`);
  console.log(`Virtual (no NFT): ${auctions.length - withNft}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

