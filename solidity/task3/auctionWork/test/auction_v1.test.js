const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("AuctionV1", function () {
  let auction;
  let priceOracle;
  let mockPriceFeed;
  let mockERC20;
  let owner;
  let seller;
  let bidder1;
  let bidder2;
  let feeRecipient;

  const FEE_BPS = 200; // 2%
  const ETH_PRICE_USD = 2000n * 10n ** 8n; // $2000
  const TOKEN_PRICE_USD = 1n * 10n ** 8n; // $1

  beforeEach(async function () {
    [owner, seller, bidder1, bidder2, feeRecipient] = await ethers.getSigners();

    // 部署 MockPriceFeed
    const MockPriceFeed = await ethers.getContractFactory("MockPriceFeed");
    mockPriceFeed = await MockPriceFeed.deploy(ETH_PRICE_USD);

    // 部署 PriceOracle
    const PriceOracle = await ethers.getContractFactory("PriceOracle");
    priceOracle = await upgrades.deployProxy(PriceOracle, [], {
      initializer: "initialize",
      kind: "transparent",
    });
    await priceOracle.waitForDeployment();
    await priceOracle.setPriceFeed(ethers.ZeroAddress, await mockPriceFeed.getAddress());

    // 部署 MockERC20
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    mockERC20 = await MockERC20.deploy("Test Token", "TEST");
    await mockERC20.waitForDeployment();

    // 为 ERC20 设置价格源
    const tokenPriceFeed = await MockPriceFeed.deploy(TOKEN_PRICE_USD);
    await priceOracle.setPriceFeed(await mockERC20.getAddress(), await tokenPriceFeed.getAddress());

    // 部署 AuctionV1
    const AuctionV1 = await ethers.getContractFactory("AuctionV1");
    auction = await upgrades.deployProxy(
      AuctionV1,
      [await priceOracle.getAddress(), FEE_BPS, feeRecipient.address],
      {
        initializer: "initialize",
        kind: "transparent",
      }
    );
    await auction.waitForDeployment();

    // 给 bidder 一些代币
    await mockERC20.mint(bidder1.address, ethers.parseEther("100000"));
    await mockERC20.mint(bidder2.address, ethers.parseEther("100000"));
  });

  describe("初始化", function () {
    it("应该正确初始化", async function () {
      expect(await auction.priceOracle()).to.equal(await priceOracle.getAddress());
      expect(await auction.feeBps()).to.equal(FEE_BPS);
      expect(await auction.feeRecipient()).to.equal(feeRecipient.address);
      expect(await auction.owner()).to.equal(owner.address);
    });

    it("应该拒绝非 owner 设置手续费", async function () {
      await expect(auction.connect(seller).setFeeBps(300)).to.be.revertedWithCustomError(
        auction,
        "OwnableUnauthorizedAccount"
      );
    });

    it("应该允许 owner 设置手续费", async function () {
      await auction.setFeeBps(300);
      expect(await auction.feeBps()).to.equal(300);
    });

    it("应该拒绝过高的手续费", async function () {
      await expect(auction.setFeeBps(1001)).to.be.revertedWith("Fee too high");
    });
  });

  describe("创建拍卖", function () {
    it("应该成功创建虚拟物品拍卖", async function () {
      const startTime = (await time.latest()) + 1;
      const endTime = startTime + 3600;

      const tx = await auction
        .connect(seller)
        .createAuction(1, ethers.ZeroAddress, 100n * 10n ** 8n, startTime, endTime, ethers.ZeroAddress, 0);

      await expect(tx).to.emit(auction, "AuctionCreated");
      const receipt = await tx.wait();
      const event = receipt.logs.find((log) => {
        try {
          const parsed = auction.interface.parseLog(log);
          return parsed && parsed.name === "AuctionCreated";
        } catch {
          return false;
        }
      });
      expect(event).to.not.be.undefined;
    });

    it("应该拒绝无效的拍卖参数", async function () {
      const startTime = (await time.latest()) + 1;
      const endTime = startTime - 1; // 结束时间早于开始时间

      await expect(
        auction
          .connect(seller)
          .createAuction(1, ethers.ZeroAddress, 100n * 10n ** 8n, startTime, endTime, ethers.ZeroAddress, 0)
      ).to.be.revertedWith("Invalid time range");
    });

    it("应该拒绝零底价", async function () {
      const startTime = (await time.latest()) + 1;
      const endTime = startTime + 3600;

      await expect(
        auction
          .connect(seller)
          .createAuction(1, ethers.ZeroAddress, 0, startTime, endTime, ethers.ZeroAddress, 0)
      ).to.be.revertedWith("Reserve must > 0");
    });
  });

  describe("ETH 出价", function () {
    let auctionId;
    const reservePriceUsd = 100n * 10n ** 8n; // $100

    beforeEach(async function () {
      const startTime = (await time.latest()) + 1;
      const endTime = startTime + 3600;
      const tx = await auction
        .connect(seller)
        .createAuction(1, ethers.ZeroAddress, reservePriceUsd, startTime, endTime, ethers.ZeroAddress, 0);
      const receipt = await tx.wait();
      const event = receipt.logs.find((log) => {
        try {
          const parsed = auction.interface.parseLog(log);
          return parsed && parsed.name === "AuctionCreated";
        } catch {
          return false;
        }
      });
      auctionId = event.args.auctionId;
      await time.increase(2); // 推进时间到拍卖开始
    });

    it("应该接受有效的 ETH 出价", async function () {
      const bidAmount = ethers.parseEther("0.1"); // 0.1 ETH = $200 > $100
      await expect(auction.connect(bidder1).bid(auctionId, bidAmount, { value: bidAmount }))
        .to.emit(auction, "BidPlaced")
        .withArgs(auctionId, bidder1.address, bidAmount, 200n * 10n ** 8n);
    });

    it("应该拒绝低于底价的出价", async function () {
      const bidAmount = ethers.parseEther("0.01"); // 0.01 ETH = $20 < $100
      await expect(
        auction.connect(bidder1).bid(auctionId, bidAmount, { value: bidAmount })
      ).to.be.revertedWith("Below reserve price");
    });

    it("应该拒绝低于当前最高出价的出价", async function () {
      const bid1 = ethers.parseEther("0.1"); // $200
      await auction.connect(bidder1).bid(auctionId, bid1, { value: bid1 });

      const bid2 = ethers.parseEther("0.05"); // $100
      await expect(
        auction.connect(bidder2).bid(auctionId, bid2, { value: bid2 })
      ).to.be.revertedWith("Bid too low");
    });

    it("应该退还上一个出价者的资金", async function () {
      const bid1 = ethers.parseEther("0.1");
      await auction.connect(bidder1).bid(auctionId, bid1, { value: bid1 });

      const bidder1BalanceBefore = await ethers.provider.getBalance(bidder1.address);
      const bid2 = ethers.parseEther("0.2");
      const tx = await auction.connect(bidder2).bid(auctionId, bid2, { value: bid2 });
      const receipt = await tx.wait();
      const gasUsed = receipt.gasUsed * receipt.gasPrice;
      const bidder1BalanceAfter = await ethers.provider.getBalance(bidder1.address);

      expect(bidder1BalanceAfter).to.be.closeTo(
        bidder1BalanceBefore + bid1 - gasUsed,
        ethers.parseEther("0.001")
      );
    });

    it("应该拒绝拍卖开始前的出价", async function () {
      // 创建新的拍卖，但时间未到
      const futureStartTime = (await time.latest()) + 100;
      const endTime = futureStartTime + 3600;
      const tx = await auction
        .connect(seller)
        .createAuction(2, ethers.ZeroAddress, reservePriceUsd, futureStartTime, endTime, ethers.ZeroAddress, 0);
      const receipt = await tx.wait();
      const event = receipt.logs.find((log) => {
        try {
          const parsed = auction.interface.parseLog(log);
          return parsed && parsed.name === "AuctionCreated";
        } catch {
          return false;
        }
      });
      const newAuctionId = event.args.auctionId;

      const bidAmount = ethers.parseEther("0.1");
      await expect(
        auction.connect(bidder1).bid(newAuctionId, bidAmount, { value: bidAmount })
      ).to.be.revertedWith("Auction not started");
    });
  });

  describe("ERC20 出价", function () {
    let auctionId;
    const reservePriceUsd = 100n * 10n ** 8n; // $100

    beforeEach(async function () {
      const startTime = (await time.latest()) + 1;
      const endTime = startTime + 3600;
      const tx = await auction
        .connect(seller)
        .createAuction(1, await mockERC20.getAddress(), reservePriceUsd, startTime, endTime, ethers.ZeroAddress, 0);
      const receipt = await tx.wait();
      const event = receipt.logs.find((log) => {
        try {
          const parsed = auction.interface.parseLog(log);
          return parsed && parsed.name === "AuctionCreated";
        } catch {
          return false;
        }
      });
      auctionId = event.args.auctionId;
      await time.increase(2);

      // 授权
      await mockERC20.connect(bidder1).approve(await auction.getAddress(), ethers.MaxUint256);
      await mockERC20.connect(bidder2).approve(await auction.getAddress(), ethers.MaxUint256);
    });

    it("应该接受有效的 ERC20 出价", async function () {
      const bidAmount = ethers.parseEther("200"); // 200 tokens = $200 > $100
      await expect(auction.connect(bidder1).bid(auctionId, bidAmount))
        .to.emit(auction, "BidPlaced")
        .withArgs(auctionId, bidder1.address, bidAmount, 200n * 10n ** 8n);
    });

    it("应该拒绝未授权的 ERC20 出价", async function () {
      const bidAmount = ethers.parseEther("200");
      await mockERC20.connect(bidder1).approve(await auction.getAddress(), 0);
      await expect(auction.connect(bidder1).bid(auctionId, bidAmount)).to.be.reverted;
    });
  });

  describe("结算拍卖", function () {
    let auctionId;
    const reservePriceUsd = 100n * 10n ** 8n;

    beforeEach(async function () {
      const startTime = (await time.latest()) + 1;
      const endTime = startTime + 3600;
      const tx = await auction
        .connect(seller)
        .createAuction(1, ethers.ZeroAddress, reservePriceUsd, startTime, endTime, ethers.ZeroAddress, 0);
      const receipt = await tx.wait();
      const event = receipt.logs.find((log) => {
        try {
          const parsed = auction.interface.parseLog(log);
          return parsed && parsed.name === "AuctionCreated";
        } catch {
          return false;
        }
      });
      auctionId = event.args.auctionId;
      await time.increase(2);
    });

    it("应该正确结算有出价的拍卖", async function () {
      const bidAmount = ethers.parseEther("0.1"); // $200
      await auction.connect(bidder1).bid(auctionId, bidAmount, { value: bidAmount });

      await time.increase(3601); // 推进到拍卖结束

      const sellerBalanceBefore = await ethers.provider.getBalance(seller.address);
      const feeRecipientBalanceBefore = await ethers.provider.getBalance(feeRecipient.address);

      const tx = await auction.settleAuction(auctionId);
      const receipt = await tx.wait();
      const gasUsed = receipt.gasUsed * receipt.gasPrice;

      const sellerBalanceAfter = await ethers.provider.getBalance(seller.address);
      const feeRecipientBalanceAfter = await ethers.provider.getBalance(feeRecipient.address);

      const fee = (bidAmount * BigInt(FEE_BPS)) / 10000n;
      const sellerAmount = bidAmount - fee;

      expect(sellerBalanceAfter).to.be.closeTo(sellerBalanceBefore + sellerAmount - gasUsed, ethers.parseEther("0.001"));
      expect(feeRecipientBalanceAfter).to.equal(feeRecipientBalanceBefore + fee);

      await expect(tx).to.emit(auction, "AuctionSettled").withArgs(auctionId, bidder1.address, bidAmount);
    });

    it("应该正确结算无出价的拍卖", async function () {
      await time.increase(3601);

      await expect(auction.settleAuction(auctionId))
        .to.emit(auction, "AuctionSettled")
        .withArgs(auctionId, ethers.ZeroAddress, 0);
    });

    it("应该拒绝未结束的拍卖结算", async function () {
      const bidAmount = ethers.parseEther("0.1");
      await auction.connect(bidder1).bid(auctionId, bidAmount, { value: bidAmount });

      await expect(auction.settleAuction(auctionId)).to.be.revertedWith("Auction not ended");
    });

    it("应该拒绝重复结算", async function () {
      const bidAmount = ethers.parseEther("0.1");
      await auction.connect(bidder1).bid(auctionId, bidAmount, { value: bidAmount });
      await time.increase(3601);
      await auction.settleAuction(auctionId);

      await expect(auction.settleAuction(auctionId)).to.be.revertedWith("Already settled");
    });
  });

  describe("查询功能", function () {
    it("应该正确返回拍卖信息", async function () {
      const startTime = (await time.latest()) + 1;
      const endTime = startTime + 3600;
      const reservePriceUsd = 100n * 10n ** 8n;

      const tx = await auction
        .connect(seller)
        .createAuction(1, ethers.ZeroAddress, reservePriceUsd, startTime, endTime, ethers.ZeroAddress, 0);
      const receipt = await tx.wait();
      const event = receipt.logs.find((log) => {
        try {
          const parsed = auction.interface.parseLog(log);
          return parsed && parsed.name === "AuctionCreated";
        } catch {
          return false;
        }
      });
      const auctionId = event.args.auctionId;

      const info = await auction.getAuctionInfo(auctionId);
      expect(info.seller).to.equal(seller.address);
      expect(info.itemId).to.equal(1);
      expect(info.reservePriceUsd).to.equal(reservePriceUsd);
      expect(info.settled).to.be.false;
    });

    it("应该正确返回总拍卖数", async function () {
      expect(await auction.totalAuctions()).to.equal(0);

      const startTime = (await time.latest()) + 1;
      const endTime = startTime + 3600;
      await auction
        .connect(seller)
        .createAuction(1, ethers.ZeroAddress, 100n * 10n ** 8n, startTime, endTime, ethers.ZeroAddress, 0);

      expect(await auction.totalAuctions()).to.equal(1);
    });
  });

  describe("动态手续费", function () {
    beforeEach(async function () {
      // 设置费率阶梯
      // $0-$1,000: 5%, $1,000-$10,000: 3%, $10,000-$100,000: 2%, $100,000+: 1%
      const tiers = [
        { minAmountUsd: 0n, feeBps: 500 },
        { minAmountUsd: 1000n * 10n ** 8n, feeBps: 300 },
        { minAmountUsd: 10000n * 10n ** 8n, feeBps: 200 },
        { minAmountUsd: 100000n * 10n ** 8n, feeBps: 100 },
      ];
      await auction.setFeeTiers(tiers);
    });

    it("应该正确查询不同金额的费率", async function () {
      // $500 -> 5%
      expect(await auction.getFeeBpsForAmount(500n * 10n ** 8n)).to.equal(500);
      
      // $5,000 -> 3%
      expect(await auction.getFeeBpsForAmount(5000n * 10n ** 8n)).to.equal(300);
      
      // $50,000 -> 2%
      expect(await auction.getFeeBpsForAmount(50000n * 10n ** 8n)).to.equal(200);
      
      // $500,000 -> 1%
      expect(await auction.getFeeBpsForAmount(500000n * 10n ** 8n)).to.equal(100);
    });

    it("应该在小额拍卖中使用高费率", async function () {
      const startTime = (await time.latest()) + 1;
      const endTime = startTime + 3600;
      const reservePriceUsd = 50n * 10n ** 8n; // $50

      const tx = await auction
        .connect(seller)
        .createAuction(1, ethers.ZeroAddress, reservePriceUsd, startTime, endTime, ethers.ZeroAddress, 0);
      const receipt = await tx.wait();
      const event = receipt.logs.find((log) => {
        try {
          const parsed = auction.interface.parseLog(log);
          return parsed && parsed.name === "AuctionCreated";
        } catch {
          return false;
        }
      });
      const auctionId = event.args.auctionId;

      await time.increase(2);

      // 出价 $200 (0.1 ETH)
      const bidAmount = ethers.parseEther("0.1"); // $200
      await auction.connect(bidder1).bid(auctionId, bidAmount, { value: bidAmount });

      await time.increase(3601);

      const feeRecipientBalanceBefore = await ethers.provider.getBalance(feeRecipient.address);
      await auction.settleAuction(auctionId);
      const feeRecipientBalanceAfter = await ethers.provider.getBalance(feeRecipient.address);

      // $200 应该使用 5% 费率
      const expectedFee = (bidAmount * 500n) / 10000n;
      expect(feeRecipientBalanceAfter - feeRecipientBalanceBefore).to.equal(expectedFee);
    });

    it("应该在大额拍卖中使用低费率", async function () {
      const startTime = (await time.latest()) + 1;
      const endTime = startTime + 3600;
      const reservePriceUsd = 50000n * 10n ** 8n; // $50,000

      const tx = await auction
        .connect(seller)
        .createAuction(1, ethers.ZeroAddress, reservePriceUsd, startTime, endTime, ethers.ZeroAddress, 0);
      const receipt = await tx.wait();
      const event = receipt.logs.find((log) => {
        try {
          const parsed = auction.interface.parseLog(log);
          return parsed && parsed.name === "AuctionCreated";
        } catch {
          return false;
        }
      });
      const auctionId = event.args.auctionId;

      await time.increase(2);

      // 出价 $200,000 (100 ETH)
      const bidAmount = ethers.parseEther("100"); // $200,000
      await auction.connect(bidder1).bid(auctionId, bidAmount, { value: bidAmount });

      await time.increase(3601);

      const feeRecipientBalanceBefore = await ethers.provider.getBalance(feeRecipient.address);
      await auction.settleAuction(auctionId);
      const feeRecipientBalanceAfter = await ethers.provider.getBalance(feeRecipient.address);

      // $200,000 应该使用 1% 费率
      const expectedFee = (bidAmount * 100n) / 10000n;
      expect(feeRecipientBalanceAfter - feeRecipientBalanceBefore).to.equal(expectedFee);
    });

    it("应该允许禁用动态手续费", async function () {
      await auction.disableDynamicFee();
      
      // 禁用后应该使用固定费率
      const startTime = (await time.latest()) + 1;
      const endTime = startTime + 3600;
      const reservePriceUsd = 50n * 10n ** 8n;

      const tx = await auction
        .connect(seller)
        .createAuction(1, ethers.ZeroAddress, reservePriceUsd, startTime, endTime, ethers.ZeroAddress, 0);
      const receipt = await tx.wait();
      const event = receipt.logs.find((log) => {
        try {
          const parsed = auction.interface.parseLog(log);
          return parsed && parsed.name === "AuctionCreated";
        } catch {
          return false;
        }
      });
      const auctionId = event.args.auctionId;

      await time.increase(2);

      const bidAmount = ethers.parseEther("0.1");
      await auction.connect(bidder1).bid(auctionId, bidAmount, { value: bidAmount });
      await time.increase(3601);

      const feeRecipientBalanceBefore = await ethers.provider.getBalance(feeRecipient.address);
      await auction.settleAuction(auctionId);
      const feeRecipientBalanceAfter = await ethers.provider.getBalance(feeRecipient.address);

      // 应该使用固定费率 FEE_BPS (2%)
      const expectedFee = (bidAmount * BigInt(FEE_BPS)) / 10000n;
      expect(feeRecipientBalanceAfter - feeRecipientBalanceBefore).to.equal(expectedFee);
    });

    it("应该拒绝无效的费率阶梯设置", async function () {
      // 第一个阶梯不是从 0 开始
      await expect(
        auction.setFeeTiers([
          { minAmountUsd: 1000n * 10n ** 8n, feeBps: 300 },
        ])
      ).to.be.revertedWith("First tier must start at 0");

      // 阶梯顺序错误（第二个小于第一个）
      await expect(
        auction.setFeeTiers([
          { minAmountUsd: 0n, feeBps: 500 },
          { minAmountUsd: 500n * 10n ** 8n, feeBps: 300 },
          { minAmountUsd: 100n * 10n ** 8n, feeBps: 200 }, // 小于前一个
        ])
      ).to.be.revertedWith("Tiers must be in ascending order");

      // 费率超过 10%
      await expect(
        auction.setFeeTiers([
          { minAmountUsd: 0n, feeBps: 1001 },
        ])
      ).to.be.revertedWith("Fee too high");
    });
  });
});

