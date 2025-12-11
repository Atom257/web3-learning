const { ethers, network } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [owner] = await ethers.getSigners();
  const MyStakeToken = await ethers.getContractFactory("MyStakeToken");
  const myStakeToken = await MyStakeToken.deploy();
  await myStakeToken.waitForDeployment();

  const contractAddr = await myStakeToken.getAddress();
  const ownerAddr = await owner.getAddress();
  console.log("contractAddr:", contractAddr);
  console.log("ownerAddr:", ownerAddr);

  //写deployment.json
  const networkName = network.name;

  // 1. 目录路径
  const dir = path.join(__dirname, "deployment");
  // 2. 自动创建目录（关键）
  fs.mkdirSync(dir, { recursive: true });

  // 3. 文件路径
  const filePath = path.join(dir, `deployment_${networkName}.json`);

  const data = {
    network: networkName,
    contractAddr,
    ownerAddr,
    updatedAt: new Date().toISOString(),
  };
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");

  console.log(`deployment.json 已更新: ${filePath}`);
}
main().catch((error) => {
  console.log(error);
  process.exitCode = 1;
});
