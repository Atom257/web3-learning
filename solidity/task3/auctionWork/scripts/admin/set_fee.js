const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("==== Set Fee BPS ====");

  // 读取部署信息
  const data = JSON.parse(fs.readFileSync("deployment.json"));
  const proxyAddress = data.AuctionV1Proxy;

  if (!proxyAddress)
    throw new Error("Proxy address not found in deployment.json");

  // 连接合约
  const AuctionV1 = await ethers.getContractFactory("AuctionV1");
  const auction = AuctionV1.attach(proxyAddress);

  // 获取当前手续费
  const currentFeeBps = await auction.feeBps();
  console.log("Current fee BPS:", currentFeeBps.toString());
  console.log("Current fee percentage:", (Number(currentFeeBps) / 100).toFixed(2) + "%");

  // 新手续费（从环境变量或命令行参数获取）
  const newFeeBps = process.argv[2] 
    ? Number(process.argv[2]) 
    : process.env.NEW_FEE_BPS 
      ? Number(process.env.NEW_FEE_BPS)
      : null;

  if (newFeeBps === null) {
    console.log("\nUsage:");
    console.log("  npx hardhat run scripts/set_fee_bps.js --network localhost -- 300");
    console.log("  or");
    console.log("  NEW_FEE_BPS=300 npx hardhat run scripts/set_fee_bps.js --network localhost");
    console.log("\nNote: Fee BPS is in basis points (100 = 1%, 200 = 2%, max 1000 = 10%)");
    return;
  }

  if (newFeeBps > 1000) {
    throw new Error("Fee BPS cannot exceed 1000 (10%)");
  }

  if (newFeeBps === currentFeeBps) {
    console.log("⚠️  New fee BPS is the same as current fee BPS. No change needed.");
    return;
  }

  console.log("\nSetting new fee BPS:", newFeeBps);
  console.log("New fee percentage:", (newFeeBps / 100).toFixed(2) + "%");

  // 检查是否为 owner
  const [signer] = await ethers.getSigners();
  const owner = await auction.owner();
  if (signer.address !== owner) {
    throw new Error(`Only owner can set fee. Current owner: ${owner}, Signer: ${signer.address}`);
  }

  // 设置手续费
  const tx = await auction.setFeeBps(newFeeBps);
  console.log("Transaction hash:", tx.hash);
  console.log("Waiting for confirmation...");
  await tx.wait();

  // 验证
  const updatedFeeBps = await auction.feeBps();
  console.log("\n==== Fee BPS Updated ====");
  console.log("New fee BPS:", updatedFeeBps.toString());
  console.log("New fee percentage:", (Number(updatedFeeBps) / 100).toFixed(2) + "%");
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

