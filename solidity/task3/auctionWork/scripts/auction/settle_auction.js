const { ethers } = require("hardhat");
const fs = require("fs");

function formatTime(sec) {
  return new Date(Number(sec) * 1000).toLocaleString();
}

async function main() {
  console.log("==== Settle Auction ====");

  // 读取代理地址
  const data = JSON.parse(fs.readFileSync("deployment.json"));
  const proxyAddress = data.AuctionV1Proxy;

  if (!proxyAddress)
    throw new Error("Proxy address not found in deployment.json");

  // 连接合约
  const AuctionV1 = await ethers.getContractFactory("AuctionV1");
  const auction = AuctionV1.attach(proxyAddress);

  const auctionId = 1;
  console.log("Trying to settle auction:", auctionId);

  // ===== 读取当前拍卖信息 =====
  const info = await auction.getAuctionInfo(auctionId);

  console.log("Seller:", info.seller);
  console.log("Start:", formatTime(info.startTime));
  console.log("End:", formatTime(info.endTime));
  console.log("Highest Bidder:", info.highestBidder);
  console.log("Highest Bid (Amount):", info.highestBidAmount.toString());
  console.log("--------------------------------");

  // ===== 检查是否到期 =====
  const now = Math.floor(Date.now() / 1000);

  if (now < info.endTime) {
    console.log("❌ 拍卖还没结束！");
    console.log(
      `当前时间：${formatTime(now)}，结束时间：${formatTime(info.endTime)}`
    );
    return;
  }

  if (info.settled) {
    console.log("⚠️ 该拍卖已经结算过了！");
    return;
  }

  console.log("🔵 拍卖已到期，可以执行结算...");

  // ===== 结算 =====
  const tx = await auction.settleAuction(auctionId);
  console.log("⏳ Waiting for transaction...");
  const receipt = await tx.wait();

  console.log("Transaction hash:", tx.hash);

  // ===== 解析事件 =====
  const event = receipt.logs?.find(
    (l) => l.fragment && l.fragment.name === "AuctionSettled"
  );

  if (event) {
    const winner = event.args.winner;
    const amount = event.args.amountPaid;

    console.log("==== Settle Result ====");
    console.log("Winner:", winner);
    console.log("Amount paid:", amount.toString());
  } else {
    console.log("⚠️ Event not found. But transaction succeeded.");
  }

  console.log("==== Done ====");
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
