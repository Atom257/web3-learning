const { ethers } = require("hardhat");
const fs = require("fs");

function formatTime(sec) {
  return new Date(Number(sec) * 1000).toLocaleString();
}

async function main() {
  console.log("==== Place Bid ====");

  // 读取部署信息
  const data = JSON.parse(fs.readFileSync("deployment.json"));
  const proxyAddress = data.AuctionV1Proxy;

  if (!proxyAddress)
    throw new Error("Proxy address not found in deployment.json");

  // 连接合约
  const AuctionV1 = await ethers.getContractFactory("AuctionV1");
  const auction = AuctionV1.attach(proxyAddress);

  const auctionId = 1;
  const bidAmount = ethers.parseEther("0.1");

  // ===== 读取拍卖信息 =====
  const info = await auction.getAuctionInfo(auctionId);

  console.log("Seller:", info.seller);
  console.log("Highest Bidder:", info.highestBidder);
  console.log("HighestBidAmount:", ethers.formatEther(info.highestBidAmount));
  console.log("HighestBidUsd:", info.highestBidUsd.toString());
  console.log("Reserve Price (USD):", info.reservePriceUsd.toString());
  console.log("Start Time:", formatTime(info.startTime));
  console.log("End Time:", formatTime(info.endTime));
  console.log("----------------------------------");

  // ===== 检查是否已经结束 =====
  const now = Math.floor(Date.now() / 1000);
  if (now < info.startTime) {
    console.log("❌ 拍卖还未开始！");
    return;
  }
  if (now >= info.endTime) {
    console.log("❌ 拍卖已结束！");
    return;
  }

  // ===== 检查出价是否 > 当前最高价 =====
  if (info.highestBidAmount > 0n) {
    if (bidAmount <= info.highestBidAmount) {
      console.log(
        `❌ 出价太低！当前最高价是 ${ethers.formatEther(
          info.highestBidAmount
        )} ETH`
      );
      return;
    }
  }

  console.log(
    `🔵 准备出价：${ethers.formatEther(bidAmount)} ETH (auctionId=${auctionId})`
  );

  // ===== 执行出价 =====
  try {
    const tx = await auction.bid(auctionId, bidAmount, {
      value: bidAmount,
    });

    console.log("⏳ Waiting for tx...");
    const receipt = await tx.wait();

    // 查找 BidPlaced 事件
    const event = receipt.logs?.find(
      (l) => l.fragment && l.fragment.name === "BidPlaced"
    );

    if (event) {
      console.log("==== Bid Success! ====");
      console.log("Bidder:", event.args.bidder);
      console.log("USD Value:", event.args.usdValue.toString());
    } else {
      console.log("⚠️ 出价成功，但未解析事件，TX:", tx.hash);
    }
  } catch (err) {
    console.log("❌ 出价失败:");
    console.log(err.message);
  }

  console.log("==== Done ====");
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
