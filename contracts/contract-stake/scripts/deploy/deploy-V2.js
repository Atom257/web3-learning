const { ethers, upgrades } = require("hardhat");

async function main() {
  console.log("=== Deploying Reward & Stake Tokens ===");

  const RewardToken = await ethers.getContractFactory("MyStakeToken");
  const rewardToken = await RewardToken.deploy();
  await rewardToken.waitForDeployment();

  const StakeToken = await ethers.getContractFactory("MyStakeToken");
  const stakeToken = await StakeToken.deploy();
  await stakeToken.waitForDeployment();

  console.log("Reward Token:", await rewardToken.getAddress());
  console.log("Stake Token:", await stakeToken.getAddress());

  console.log("=== Deploying StakingPoolV1 ===");

  const StakingPoolV1 = await ethers.getContractFactory("StakingPoolV1");
  const rewardPerBlock = ethers.parseEther("10");

  // 注意：这里部署的是 V1，后面再升级成 V2
  const stakingPool = await upgrades.deployProxy(
    StakingPoolV1,
    [
      await stakeToken.getAddress(), // staking token
      await rewardToken.getAddress(), // reward token
      rewardPerBlock, // rewardPerBlock
    ],
    { initializer: "initialize", kind: "uups" }
  );

  await stakingPool.waitForDeployment();
  console.log("StakingPool Proxy Address:", await stakingPool.getAddress());

  // 准备奖励池
  const rewardFund = ethers.parseEther("1000000");
  await rewardToken.transfer(await stakingPool.getAddress(), rewardFund);
  console.log("Reward pool funded");

  console.log("\n=== Upgrade to V2 ===");

  const StakingPoolV2 = await ethers.getContractFactory("StakingPoolV2");
  const upgraded = await upgrades.upgradeProxy(
    await stakingPool.getAddress(),
    StakingPoolV2
  );

  console.log("StakingPool Upgraded to V2:", await upgraded.getAddress());

  console.log("\n=== Initialize Pools ===");

  // 添加 ETH 池（PID = 0）
  await upgraded.addPool(
    ethers.ZeroAddress,
    100, // poolWeight
    ethers.parseEther("0.01"),
    20, // locked blocks
    false
  );

  console.log("Pool 0: ETH pool added");

  // 添加 ERC20 池（PID = 1）
  await upgraded.addPool(
    await stakeToken.getAddress(),
    200,
    ethers.parseEther("1"),
    30,
    false
  );

  console.log("Pool 1: ERC20 pool added");

  console.log("\n=== Deployment Completed ===");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
