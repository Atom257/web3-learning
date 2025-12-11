const { ethers, upgrades } = require("hardhat");
const { expect, use } = require("chai");

describe("StakingPoolV1", function () {
  let owner, user1, user2;
  let StakeToken, RewardToken;
  let stakeToken, rewardToken;
  let StakingPoolV1, stakingPool;

  const REWARD_PER_BLOCK = ethers.parseEther("10"); // 每区块奖励 10 个 token

  // 简单挖出若干个区块
  async function mineBlocks(count) {
    for (let i = 0; i < count; i++) {
      await ethers.provider.send("evm_mine", []);
    }
  }
  beforeEach(async () => {
    [owner, user1, user2] = await ethers.getSigners();
    // 部署质押 token（用现有的 MyStakeToken 部署两次）
    StakeToken = await ethers.getContractFactory("MyStakeToken");
    RewardToken = await ethers.getContractFactory("MyStakeToken");

    stakeToken = await StakeToken.deploy();
    rewardToken = await RewardToken.deploy();

    await stakeToken.waitForDeployment();
    await rewardToken.waitForDeployment();

    // 部署 StakingPoolV1（通过 UUPS Proxy）
    StakingPoolV1 = await ethers.getContractFactory("StakingPoolV1");
    stakingPool = await upgrades.deployProxy(
      StakingPoolV1,
      [
        await stakeToken.getAddress(),
        await rewardToken.getAddress(),
        REWARD_PER_BLOCK,
      ],
      {
        initializer: "initialize",
        kind: "uups",
      }
    );

    await stakingPool.waitForDeployment();

    // 准备奖励池：把一部分 rewardToken 转入池子合约
    const rewardFund = ethers.parseEther("500000"); // 50万作为奖励池
    await rewardToken.transfer(await stakingPool.getAddress(), rewardFund);

    // 给 user 一些 stakeToken 作为质押用
    const userStakeAmount = ethers.parseEther("10000");
    await stakeToken.transfer(user1.address, userStakeAmount);
    await stakeToken.transfer(user2.address, userStakeAmount);
  });

  it("初始化参数正确", async function () {
    const totalStaked = await stakingPool.totalStaked();
    expect(totalStaked).to.equal(0n);
    expect(await stakingPool.totalStaked()).to.equal(0n);
  });

  it("用户可以正常质押", async function () {
    const amount = ethers.parseEther("1000");
    // user1 授权 stakingPool 花费 stakeToken
    await stakeToken
      .connect(user1)
      .approve(await stakingPool.getAddress(), amount);
    // 质押
    await stakingPool.connect(user1).deposit(amount);
    // 检查 user1 的质押数量
    const [userAmount, rewardDebt] = await stakingPool.userInfo(user1.address);
    expect(userAmount).to.equal(amount);
    expect(rewardDebt).to.be.greaterThanOrEqual(0n);
    // 检查合约中的总质押量
    const totalStaked = await stakingPool.totalStaked();
    expect(totalStaked).to.equal(amount);
  });
  it("质押后经过若干区块，pendingReward 正确", async function () {
    const amount = ethers.parseEther("1000");
    await stakeToken
      .connect(user1)
      .approve(await stakingPool.getAddress(), amount);

    // 让 deposit 落在一个单独的区块
    await mineBlocks(1);
    await stakingPool.connect(user1).deposit(amount);
    // 挖 10 个区块
    const blocks = 10;
    await mineBlocks(blocks);
    const pending = await stakingPool.pendingReward(user1.address);
    const expected = REWARD_PER_BLOCK * BigInt(blocks); // 只有一个用户，所以理论上 pending = blocks * rewardPerBlock

    expect(pending).to.equal(expected);
  });
  it("claim 会把奖励发给用户，并清零 pending", async function () {
    const amount = ethers.parseEther("1000");
    await stakeToken
      .connect(user1)
      .approve(await stakingPool.getAddress(), amount);
    await stakingPool.connect(user1).deposit(amount);
    // console.log("current block:", await ethers.provider.getBlockNumber());

    const blocks = 10;
    await mineBlocks(blocks - 1);
    // console.log("current block:", await ethers.provider.getBlockNumber());

    const rewardTokenAddr = await rewardToken.getAddress();
    const poolAddr = await stakingPool.getAddress();

    const beforeUserRewardBal = await rewardToken.balanceOf(user1.address);
    const beforePoolRewardBal = await rewardToken.balanceOf(poolAddr);
    // console.log("current block:", await ethers.provider.getBlockNumber());

    // 只领奖，不提本金
    await stakingPool.connect(user1).claim();
    // console.log("current block:", await ethers.provider.getBlockNumber());

    const afterUserRewardBal = await rewardToken.balanceOf(user1.address);
    const afterPoolRewardBal = await rewardToken.balanceOf(poolAddr);

    const diffUser = afterUserRewardBal - beforeUserRewardBal;
    const diffPool = beforePoolRewardBal - afterPoolRewardBal;
    const expected = REWARD_PER_BLOCK * BigInt(blocks);

    expect(diffUser).to.equal(expected);
    expect(diffPool).to.equal(expected);

    // 再次查询 pending 应该接近 0
    const pendingAfter = await stakingPool.pendingReward(user1.address);
    expect(pendingAfter).to.equal(0n);
  });

  it("withdraw 会退回本金并发奖励", async function () {
    const amount = ethers.parseEther("1000");
    await stakeToken
      .connect(user1)
      .approve(await stakingPool.getAddress(), amount);
    await stakingPool.connect(user1).deposit(amount);

    const blocks = 5;
    await mineBlocks(blocks - 1);

    const beforeStakeBal = await stakeToken.balanceOf(user1.address);
    const beforeRewardBal = await rewardToken.balanceOf(user1.address);

    await stakingPool.connect(user1).withdraw(amount);

    const afterStakeBal = await stakeToken.balanceOf(user1.address);
    const afterRewardBal = await rewardToken.balanceOf(user1.address);

    // 本金应该完整退还
    expect(afterStakeBal - beforeStakeBal).to.equal(amount);

    // 奖励应该等于 blocks * rewardPerBlock
    const expectedReward = REWARD_PER_BLOCK * BigInt(blocks);
    expect(afterRewardBal - beforeRewardBal).to.equal(expectedReward);

    // 用户质押数量应该为 0
    const [userAmount] = await stakingPool.userInfo(user1.address);
    expect(userAmount).to.equal(0n);
  });
  it("non-admin 无法 pause，admin 可以 pause / unpause", async function () {
    // 非 admin 调用 pause 应该失败
    await expect(stakingPool.connect(user1).pause()).to.be.reverted;

    // admin 可以 pause
    await stakingPool.connect(owner).pause();

    const amount = ethers.parseEther("100");
    await stakeToken
      .connect(user1)
      .approve(await stakingPool.getAddress(), amount);

    // 被 pause 后，deposit/withdraw/claim 都应该 revert（Pausable: paused）
    await expect(stakingPool.connect(user1).deposit(amount)).to.be.reverted; // 针对不同版本 OZ 兼容处理

    // 恢复
    await stakingPool.connect(owner).unpause();

    // 再次 deposit 应该可以成功
    await stakingPool.connect(user1).deposit(amount);
    const [userAmount] = await stakingPool.userInfo(user1.address);
    expect(userAmount).to.equal(amount);
  });
  it("admin 可以修改 rewardPerBlock，影响后续奖励", async function () {
    const amount = ethers.parseEther("1000");
    await stakeToken
      .connect(user1)
      .approve(await stakingPool.getAddress(), amount);

    // user1 质押
    await stakingPool.connect(user1).deposit(amount);

    // -------- 阶段 1：只用旧速率挖 10 个块 --------
    const blocksBefore = 10n;
    await mineBlocks(Number(blocksBefore));

    const pendingBefore = await stakingPool.pendingReward(user1.address);
    const expectedBefore = REWARD_PER_BLOCK * blocksBefore;
    expect(pendingBefore).to.equal(expectedBefore);

    // -------- 阶段 2：修改奖励速率（这一笔交易所在的区块，也按旧速率结算）--------
    const NEW_REWARD_PER_BLOCK = ethers.parseEther("20");
    await stakingPool.connect(owner).setRewardPerBlock(NEW_REWARD_PER_BLOCK);

    // 到这里为止：
    // on-chain 已经用“旧速率”结算了 (blocksBefore + 1) 个区块的奖励
    // 其中 +1 是 setRewardPerBlock 那个交易所在的这个新块

    // -------- 阶段 3：再用新速率挖 4 个块 --------
    const extraBlocks = 4n;
    await mineBlocks(Number(extraBlocks));

    // 理论总奖励：
    // 旧： (blocksBefore + 1) * old
    // 新： extraBlocks * new
    const pendingAfter = await stakingPool.pendingReward(user1.address);
    const expectedAfter =
      REWARD_PER_BLOCK * (blocksBefore + 1n) +
      NEW_REWARD_PER_BLOCK * extraBlocks;

    expect(pendingAfter).to.equal(expectedAfter);
  });
});
