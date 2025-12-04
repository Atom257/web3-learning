const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("==== Create NFT Auction (V2) ====");

  // 读取部署信息
  const data = JSON.parse(fs.readFileSync("deployment.json"));
  const proxyAddress = data.AuctionV1Proxy; // 升级后也是 V2

  if (!proxyAddress)
    throw new Error("Proxy address not found in deployment.json");

  // 连接合约（使用 V2，因为支持 NFT）
  const AuctionV2 = await ethers.getContractFactory("AuctionV2");
  const auction = AuctionV2.attach(proxyAddress);

  // 参数（从环境变量或使用默认值）
  const nftAddress = process.env.NFT_ADDRESS || process.argv[2];
  const nftTokenId = process.env.NFT_TOKEN_ID 
    ? BigInt(process.env.NFT_TOKEN_ID) 
    : process.argv[3] 
      ? BigInt(process.argv[3])
      : null;

  if (!nftAddress || nftTokenId === null) {
    console.log("\nUsage:");
    console.log("  npx hardhat run scripts/create_nft_auction.js --network localhost -- <NFT_ADDRESS> <TOKEN_ID>");
    console.log("  or");
    console.log("  NFT_ADDRESS=0x... NFT_TOKEN_ID=1 npx hardhat run scripts/create_nft_auction.js --network localhost");
    console.log("\nNote: You must own the NFT to create an auction");
    return;
  }

  if (!ethers.isAddress(nftAddress)) {
    throw new Error("Invalid NFT address format");
  }

  // 其他参数
  const itemId = process.env.ITEM_ID ? BigInt(process.env.ITEM_ID) : BigInt(Date.now());
  const paymentToken = process.env.PAYMENT_TOKEN || ethers.ZeroAddress; // ETH 支付
  const reservePriceUsd = process.env.RESERVE_PRICE_USD 
    ? BigInt(process.env.RESERVE_PRICE_USD) * 10n ** 8n 
    : 100n * 10n ** 8n; // 默认 $100
  const startTime = process.env.START_TIME 
    ? BigInt(process.env.START_TIME) 
    : BigInt(Math.floor(Date.now() / 1000));
  const duration = process.env.DURATION_SECONDS 
    ? BigInt(process.env.DURATION_SECONDS) 
    : 600n; // 默认 10 分钟
  const endTime = startTime + duration;

  console.log("Parameters:");
  console.log("  NFT Address:", nftAddress);
  console.log("  NFT Token ID:", nftTokenId.toString());
  console.log("  Item ID:", itemId.toString());
  console.log("  Payment Token:", paymentToken);
  console.log("  Reserve Price (USD):", reservePriceUsd.toString());
  console.log("  Start Time:", new Date(Number(startTime) * 1000).toLocaleString());
  console.log("  End Time:", new Date(Number(endTime) * 1000).toLocaleString());

  // 检查 NFT 所有权
  const [signer] = await ethers.getSigners();
  const IERC721 = await ethers.getContractFactory("IERC721");
  const nft = IERC721.attach(nftAddress);
  
  try {
    const owner = await nft.ownerOf(nftTokenId);
    if (owner.toLowerCase() !== signer.address.toLowerCase()) {
      throw new Error(`You don't own this NFT. Owner: ${owner}, Your address: ${signer.address}`);
    }
    console.log("✓ NFT ownership verified");
  } catch (err) {
    if (err.message.includes("ERC721NonexistentToken")) {
      throw new Error(`NFT token ${nftTokenId} does not exist`);
    }
    throw err;
  }

  // 检查是否已授权
  try {
    const approved = await nft.getApproved(nftTokenId);
    const isApprovedForAll = await nft.isApprovedForAll(signer.address, proxyAddress);
    
    if (approved.toLowerCase() !== proxyAddress.toLowerCase() && !isApprovedForAll) {
      console.log("\n⚠️  Warning: NFT not approved for auction contract");
      console.log("Approving NFT...");
      const approveTx = await nft.approve(proxyAddress, nftTokenId);
      await approveTx.wait();
      console.log("✓ NFT approved");
    } else {
      console.log("✓ NFT already approved");
    }
  } catch (err) {
    console.log("⚠️  Could not check approval (contract may not support getApproved)");
    console.log("Attempting to approve...");
    try {
      const approveTx = await nft.approve(proxyAddress, nftTokenId);
      await approveTx.wait();
      console.log("✓ NFT approved");
    } catch (approveErr) {
      throw new Error(`Failed to approve NFT: ${approveErr.message}`);
    }
  }

  // 创建拍卖
  console.log("\nCreating NFT auction...");
  const tx = await auction.createAuction(
    itemId,
    paymentToken,
    reservePriceUsd,
    startTime,
    endTime,
    nftAddress,
    nftTokenId
  );

  console.log("Transaction hash:", tx.hash);
  console.log("Waiting for confirmation...");
  const receipt = await tx.wait();

  // 解析事件
  const event = receipt.logs?.find(
    (log) => log.fragment && log.fragment.name === "AuctionCreated"
  );

  if (event) {
    const auctionId = event.args.auctionId;
    console.log("\n==== NFT Auction Created ====");
    console.log("Auction ID:", auctionId.toString());
    console.log("NFT Address:", nftAddress);
    console.log("NFT Token ID:", nftTokenId.toString());
  } else {
    console.log("⚠️  Auction created but event not parsed. TX:", tx.hash);
  }

  console.log("\n==== Done ====");
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

