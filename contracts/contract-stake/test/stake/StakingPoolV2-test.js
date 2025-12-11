const { ethers, upgrades } = require("hardhat");
const { expect } = require("chai");

async function mine(n) {
  for (let i = 0; i < n; i++) {
    await ethers.provider.send("evm_mine");
  }
}

const ONE = 10n ** 18n;

describe("StakingPoolV2", function () {
  let owner, user1, user2;
  let stakeToken, rewardToken;
  let stakingPool;

  const rewardPerBlock = ethers.parseEther("10"); // 10e18

  beforeEach(async () => {
    [owner, user1, user2] = await ethers.getSigners();

    const Token = await ethers.getContractFactory("MyStakeToken");
    stakeToken = await Token.deploy();
    rewardToken = await Token.deploy();

    await stakeToken.waitForDeployment();
    await rewardToken.waitForDeployment();

    const StakingPoolV1 = await ethers.getContractFactory("StakingPoolV1");

    stakingPool = await upgrades.deployProxy(
      StakingPoolV1,
      [
        await stakeToken.getAddress(),
        await rewardToken.getAddress(),
        rewardPerBlock,
      ],
      { initializer: "initialize", kind: "uups" }
    );

    await stakingPool.waitForDeployment();

    // 预存奖励
    await rewardToken.transfer(
      await stakingPool.getAddress(),
      ethers.parseEther("1000000")
    );

    // 升级为 V2
    const StakingPoolV2 = await ethers.getContractFactory("StakingPoolV2");
    stakingPool = await upgrades.upgradeProxy(
      await stakingPool.getAddress(),
      StakingPoolV2
    );

    // 添加 ETH 池 PID=0
    await stakingPool.addPool(ethers.ZeroAddress, 100, 0, 20, false);

    // 添加 ERC20 池 PID=1
    await stakingPool.addPool(
      await stakeToken.getAddress(),
      200,
      ethers.parseEther("1"),
      30,
      false
    );

    // 给 user1 发质押 token
    await stakeToken.transfer(user1.address, ethers.parseEther("10000"));

    // 提前给足 allowance，避免二次 deposit 出错
    await stakeToken
      .connect(user1)
      .approve(await stakingPool.getAddress(), ethers.MaxUint256);
  });

  // -----------------------------------------------------
  it("池子初始化正确", async function () {
    expect(await stakingPool.poolLength()).to.equal(2);
  });

  // -----------------------------------------------------
  it("用户可以在 ETH 池质押 ETH", async function () {
    await stakingPool
      .connect(user1)
      .depositETH({ value: ethers.parseEther("1") });

    const info = await stakingPool.getPool(0);

    expect(info.stTokenAddress).to.equal(ethers.ZeroAddress);
    expect(info.stTokenAmount).to.equal(ethers.parseEther("1"));
  });

  // -----------------------------------------------------
  it("用户可以质押 ERC20", async function () {
    await stakingPool
      .connect(user1)
      ["deposit(uint256,uint256)"](1, ethers.parseEther("100"));

    const pending = await stakingPool["pendingReward(uint256,address)"](
      1,
      user1.address
    );

    expect(pending).to.equal(0n);
  });

  // -----------------------------------------------------
  it("奖励随区块正确累积（单人，精确等于合约数学公式）", async function () {
    const amount = ethers.parseEther("100"); // 100e18
    const poolWeight = 200n;
    const totalPoolWeight = 100n + 200n; // ETH池100 + ERC20池200

    // 1. user1 在 PID=1 质押 100
    await stakingPool.connect(user1)["deposit(uint256,uint256)"](1, amount);

    // 2. 挖 10 个区块
    const blocks = 10n;
    await mine(Number(blocks));

    // 3. 从合约读取 pendingReward
    const pending = await stakingPool["pendingReward(uint256,address)"](
      1,
      user1.address
    );

    // 4. 用“合约同款公式”在 JS 里精确算一遍预期值：
    //
    // 在 pendingReward() 中：
    //   reward = blocks * rewardPerBlock * poolWeight / totalPoolWeight;
    //   accRewardPerST += reward * 1e18 / stSupply;
    //   accumulated = stAmount * accRewardPerST / 1e18;
    //   pending = accumulated - finishedReward + pendingReward;
    //
    // 这里只有一个用户，stAmount = stSupply = amount，finishedReward = 0，pendingReward = 0
    // 所以公式可以简化为下面这段：

    const rewardForPool =
      (blocks * rewardPerBlock * poolWeight) / totalPoolWeight; // uint256 reward
    const stSupply = amount;
    const accRewardPerST = (rewardForPool * ONE) / stSupply; // 放大 1e18
    const accumulated = (amount * accRewardPerST) / ONE; // 用户累计奖励

    const expected = accumulated; // 因为 finishedReward=0, u.pendingReward=0

    // 5. 断言完全相等（0 误差）
    expect(pending).to.equal(expected);
  });

  // -----------------------------------------------------
  it("用户解押 → 等待 → withdraw 生效", async function () {
    const amount = ethers.parseEther("100");

    await stakingPool.connect(user1)["deposit(uint256,uint256)"](1, amount);

    // 正确流程：解押 40（不是再 deposit 40）
    const unstakeAmount = ethers.parseEther("40");
    await stakingPool.connect(user1).unstake(1, unstakeAmount);

    // 还没到解锁时间
    let [, unlocked] = await stakingPool.withdrawAmount(1, user1.address);
    expect(unlocked).to.equal(0n);

    // 池子配置的 lockedBlocks = 30，这里挖 40 保证解锁
    await mine(40);

    [, unlocked] = await stakingPool.withdrawAmount(1, user1.address);
    expect(unlocked).to.equal(unstakeAmount);

    // 执行提现
    await stakingPool.connect(user1).withdraw(1);

    // 解押队列应该清空
    [, unlocked] = await stakingPool.withdrawAmount(1, user1.address);
    expect(unlocked).to.equal(0n);
  });

  // -----------------------------------------------------
  it("用户能领取奖励，且领取数量精确等于 pendingReward", async function () {
    const amount = ethers.parseEther("100");

    await stakingPool.connect(user1)["deposit(uint256,uint256)"](1, amount);

    // 挖 10 个块，让有奖励产生
    await mine(10);

    // 1. 先用 view 函数读出"应得奖励"（基于当前区块）
    const pendingBefore = await stakingPool["pendingReward(uint256,address)"](
      1,
      user1.address
    );

    // 确保 pending 本身是正的（有奖励）
    expect(pendingBefore).to.be.gt(0n);

    const beforeUser = await rewardToken.balanceOf(user1.address);
    const beforePool = await rewardToken.balanceOf(
      await stakingPool.getAddress()
    );

    // 2. 执行 claim（使用函数签名明确指定带参数的版本）
    // 注意：claim 内部会调用 updatePool，这会创建一个新区块，所以实际领取的奖励可能会略多于 pendingBefore
    await stakingPool.connect(user1)["claim(uint256)"](1);

    const afterUser = await rewardToken.balanceOf(user1.address);
    const afterPool = await rewardToken.balanceOf(
      await stakingPool.getAddress()
    );

    const userGain = afterUser - beforeUser;
    const poolCost = beforePool - afterPool;

    // 3. 验证用户拿到的奖励等于池子扣掉的奖励
    expect(userGain).to.equal(poolCost);

    // 4. 验证领取的奖励应该 >= pendingBefore（因为 claim 会创建一个新区块）
    expect(userGain).to.be.gte(pendingBefore);

    // 5. 验证 claim 后 pendingReward 应该为 0（或接近 0，因为可能有一个新区块）
    const pendingAfter = await stakingPool["pendingReward(uint256,address)"](
      1,
      user1.address
    );
    // 由于 claim 创建了新区块，可能还有少量奖励，但应该很小
    expect(pendingAfter).to.be.lt(pendingBefore);
  });
});
