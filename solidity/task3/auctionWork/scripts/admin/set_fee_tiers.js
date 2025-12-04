const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
  console.log("==== Set Fee Tiers (Dynamic Fee) ====");

  // 读取部署信息
  const data = JSON.parse(fs.readFileSync("deployment.json"));
  const proxyAddress = data.AuctionV1Proxy;

  if (!proxyAddress)
    throw new Error("Proxy address not found in deployment.json");

  // 连接合约
  const AuctionV1 = await ethers.getContractFactory("AuctionV1");
  const auction = AuctionV1.attach(proxyAddress);

  // 检查是否为 owner
  const [signer] = await ethers.getSigners();
  const owner = await auction.owner();
  if (signer.address !== owner) {
    throw new Error(`Only owner can set fee tiers. Current owner: ${owner}, Signer: ${signer.address}`);
  }

  // 获取当前费率阶梯数量
  const currentTierCount = await auction.getFeeTierCount();
  console.log("Current fee tier count:", currentTierCount.toString());

  if (currentTierCount > 0) {
    console.log("\nCurrent fee tiers:");
    for (let i = 0; i < currentTierCount; i++) {
      const tier = await auction.getFeeTier(i);
      console.log(
        `  Tier ${i}: minAmountUsd=${tier.minAmountUsd.toString()}, feeBps=${tier.feeBps.toString()} (${(Number(tier.feeBps) / 100).toFixed(2)}%)`
      );
    }
  }

  // 从环境变量或命令行参数获取费率阶梯
  // 格式: "0:500,100000000000:300,1000000000000:200,10000000000000:100"
  // 表示: $0-$1k:5%, $1k-$10k:3%, $10k-$100k:2%, $100k+:1%
  const tiersInput = process.argv[2] || process.env.FEE_TIERS;

  if (!tiersInput) {
    console.log("\nUsage:");
    console.log("  npx hardhat run scripts/admin/set_fee_tiers.js --network localhost -- '0:500,100000000000:300,1000000000000:200,10000000000000:100'");
    console.log("  or");
    console.log("  FEE_TIERS='0:500,100000000000:300,1000000000000:200,10000000000000:100' npx hardhat run scripts/admin/set_fee_tiers.js --network localhost");
    console.log("\nFormat: 'minAmountUsd1:feeBps1,minAmountUsd2:feeBps2,...'");
    console.log("  - minAmountUsd: Minimum amount in USD (8 decimals, e.g., 100000000000 = $1,000)");
    console.log("  - feeBps: Fee in basis points (e.g., 500 = 5%)");
    console.log("\nExample tiers:");
    console.log("  $0-$1,000:     5% (0:500)");
    console.log("  $1,000-$10,000: 3% (100000000000:300)");
    console.log("  $10,000-$100,000: 2% (1000000000000:200)");
    console.log("  $100,000+:     1% (10000000000000:100)");
    return;
  }

  // 解析费率阶梯
  const tiers = [];
  const pairs = tiersInput.split(",");
  
  for (const pair of pairs) {
    const [minAmountUsdStr, feeBpsStr] = pair.split(":");
    if (!minAmountUsdStr || !feeBpsStr) {
      throw new Error(`Invalid format: ${pair}. Expected format: minAmountUsd:feeBps`);
    }
    
    const minAmountUsd = BigInt(minAmountUsdStr.trim());
    const feeBps = Number(feeBpsStr.trim());
    
    if (feeBps > 1000) {
      throw new Error(`Fee BPS cannot exceed 1000 (10%). Got: ${feeBps}`);
    }
    
    tiers.push({
      minAmountUsd: minAmountUsd,
      feeBps: feeBps,
    });
  }

  // 验证第一个阶梯从 0 开始
  if (tiers[0].minAmountUsd !== 0n) {
    throw new Error("First tier must start at 0");
  }

  // 验证阶梯顺序
  for (let i = 1; i < tiers.length; i++) {
    if (tiers[i].minAmountUsd <= tiers[i - 1].minAmountUsd) {
      throw new Error("Tiers must be in ascending order by minAmountUsd");
    }
  }

  console.log("\nSetting fee tiers:");
  for (let i = 0; i < tiers.length; i++) {
    const tier = tiers[i];
    const minAmount = Number(tier.minAmountUsd) / 1e8;
    console.log(
      `  Tier ${i}: $${minAmount.toLocaleString()} - feeBps=${tier.feeBps} (${(tier.feeBps / 100).toFixed(2)}%)`
    );
  }

  // 设置费率阶梯
  const tx = await auction.setFeeTiers(tiers);
  console.log("\nTransaction hash:", tx.hash);
  console.log("Waiting for confirmation...");
  await tx.wait();

  // 验证
  const newTierCount = await auction.getFeeTierCount();
  console.log("\n==== Fee Tiers Updated ====");
  console.log("New fee tier count:", newTierCount.toString());
  
  for (let i = 0; i < newTierCount; i++) {
    const tier = await auction.getFeeTier(i);
    const minAmount = Number(tier.minAmountUsd) / 1e8;
    console.log(
      `  Tier ${i}: $${minAmount.toLocaleString()} - feeBps=${tier.feeBps.toString()} (${(Number(tier.feeBps) / 100).toFixed(2)}%)`
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

