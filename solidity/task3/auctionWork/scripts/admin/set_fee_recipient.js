const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("==== Set Fee Recipient ====");

  // 读取部署信息
  const data = JSON.parse(fs.readFileSync("deployment.json"));
  const proxyAddress = data.AuctionV1Proxy;

  if (!proxyAddress)
    throw new Error("Proxy address not found in deployment.json");

  // 连接合约
  const AuctionV1 = await ethers.getContractFactory("AuctionV1");
  const auction = AuctionV1.attach(proxyAddress);

  // 获取当前手续费接收地址
  const currentRecipient = await auction.feeRecipient();
  console.log("Current fee recipient:", currentRecipient);

  // 新手续费接收地址（从环境变量或命令行参数获取）
  const newRecipient = process.argv[2] 
    ? process.argv[2] 
    : process.env.NEW_FEE_RECIPIENT;

  if (!newRecipient) {
    console.log("\nUsage:");
    console.log("  npx hardhat run scripts/set_fee_recipient.js --network localhost -- 0x...");
    console.log("  or");
    console.log("  NEW_FEE_RECIPIENT=0x... npx hardhat run scripts/set_fee_recipient.js --network localhost");
    return;
  }

  if (!ethers.isAddress(newRecipient)) {
    throw new Error("Invalid address format");
  }

  if (newRecipient.toLowerCase() === currentRecipient.toLowerCase()) {
    console.log("⚠️  New fee recipient is the same as current recipient. No change needed.");
    return;
  }

  console.log("\nSetting new fee recipient:", newRecipient);

  // 检查是否为 owner
  const [signer] = await ethers.getSigners();
  const owner = await auction.owner();
  if (signer.address !== owner) {
    throw new Error(`Only owner can set fee recipient. Current owner: ${owner}, Signer: ${signer.address}`);
  }

  // 设置手续费接收地址
  const tx = await auction.setFeeRecipient(newRecipient);
  console.log("Transaction hash:", tx.hash);
  console.log("Waiting for confirmation...");
  await tx.wait();

  // 验证
  const updatedRecipient = await auction.feeRecipient();
  console.log("\n==== Fee Recipient Updated ====");
  console.log("New fee recipient:", updatedRecipient);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

