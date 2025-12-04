const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("AuctionV2 Upgrade and NFT Auction", function () {
  let auction;
  let auctionV2;
  let priceOracle;
  let mockPriceFeed;
  let myNFT;
  let owner;
  let seller;
  let bidder1;
  let bidder2;
  let feeRecipient;

  const FEE_BPS = 200; // 2%
  const ETH_PRICE_USD = 2000n * 10n ** 8n; // $2000

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

    // 部署 MyNFT
    const MyNFT = await ethers.getContractFactory("MyNFT");
    myNFT = await MyNFT.deploy("Test NFT", "TNFT", "https://example.com/metadata/");
    await myNFT.waitForDeployment();
  });

  describe("升级到 V2", function () {
    it("应该成功升级到 V2", async function () {
      const AuctionV2 = await ethers.getContractFactory("AuctionV2");
      auctionV2 = await upgrades.upgradeProxy(await auction.getAddress(), AuctionV2);
      await auctionV2.waitForDeployment();

      // 验证升级后合约仍然可用
      expect(await auctionV2.priceOracle()).to.equal(await priceOracle.getAddress());
      expect(await auctionV2.feeBps()).to.equal(FEE_BPS);

      // 验证 V2 功能可用
      const startTime = (await time.latest()) + 1;
      const endTime = startTime + 3600;
      const tx = await auctionV2
        .connect(seller)
        .createAuction(1, ethers.ZeroAddress, 100n * 10n ** 8n, startTime, endTime, ethers.ZeroAddress, 0);
      await expect(tx).to.emit(auctionV2, "AuctionCreated");
    });

    it("应该保持 V1 的数据不变", async function () {
      // 在 V1 中创建一个拍卖
      const startTime = (await time.latest()) + 1;
      const endTime = startTime + 3600;
      const tx = await auction
        .connect(seller)
        .createAuction(1, ethers.ZeroAddress, 100n * 10n ** 8n, startTime, endTime, ethers.ZeroAddress, 0);
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

      // 升级到 V2
      const AuctionV2 = await ethers.getContractFactory("AuctionV2");
      auctionV2 = await upgrades.upgradeProxy(await auction.getAddress(), AuctionV2);
      await auctionV2.waitForDeployment();

      // 验证数据仍然存在
      const info = await auctionV2.getAuctionInfo(auctionId);
      expect(info.seller).to.equal(seller.address);
      expect(info.itemId).to.equal(1);
    });
  });

  describe("NFT 拍卖", function () {
    beforeEach(async function () {
      // 升级到 V2
      const AuctionV2 = await ethers.getContractFactory("AuctionV2");
      auctionV2 = await upgrades.upgradeProxy(await auction.getAddress(), AuctionV2);
      await auctionV2.waitForDeployment();

      // 给 seller 铸造一个 NFT
      await myNFT.mint(seller.address);
      const tokenId = 1;

      // 授权给拍卖合约
      await myNFT.connect(seller).approve(await auctionV2.getAddress(), tokenId);
    });

    it("应该成功创建 NFT 拍卖", async function () {
      const tokenId = 1;
      const startTime = (await time.latest()) + 1;
      const endTime = startTime + 3600;
      const reservePriceUsd = 100n * 10n ** 8n;

      const tx = await auctionV2
        .connect(seller)
        .createAuction(1, ethers.ZeroAddress, reservePriceUsd, startTime, endTime, await myNFT.getAddress(), tokenId);

      await expect(tx).to.emit(auctionV2, "AuctionCreated");

      // 验证 NFT 已转移到合约
      expect(await myNFT.ownerOf(tokenId)).to.equal(await auctionV2.getAddress());

      // 验证拍卖信息包含 NFT 地址
      const receipt = await tx.wait();
      const event = receipt.logs.find((log) => {
        try {
          const parsed = auctionV2.interface.parseLog(log);
          return parsed && parsed.name === "AuctionCreated";
        } catch {
          return false;
        }
      });
      const auctionId = event.args.auctionId;
      const info = await auctionV2.getAuctionInfo(auctionId);
      expect(info.nftAddress).to.equal(await myNFT.getAddress());
      expect(info.nftTokenId).to.equal(tokenId);
    });

    it("应该拒绝非 NFT 拥有者创建拍卖", async function () {
      const tokenId = 1;
      const startTime = (await time.latest()) + 1;
      const endTime = startTime + 3600;

      await expect(
        auctionV2
          .connect(bidder1)
          .createAuction(1, ethers.ZeroAddress, 100n * 10n ** 8n, startTime, endTime, await myNFT.getAddress(), tokenId)
      ).to.be.revertedWith("Not NFT owner");
    });

    it("应该拒绝未授权的 NFT 创建拍卖", async function () {
      // 铸造另一个 NFT 但不授权
      await myNFT.mint(seller.address);
      const tokenId = 2;
      const startTime = (await time.latest()) + 1;
      const endTime = startTime + 3600;

      await expect(
        auctionV2
          .connect(seller)
          .createAuction(1, ethers.ZeroAddress, 100n * 10n ** 8n, startTime, endTime, await myNFT.getAddress(), tokenId)
      ).to.be.reverted;
    });

    it("应该正确结算有出价的 NFT 拍卖", async function () {
      const tokenId = 1;
      const startTime = (await time.latest()) + 1;
      const endTime = startTime + 3600;
      const reservePriceUsd = 100n * 10n ** 8n;

      const tx = await auctionV2
        .connect(seller)
        .createAuction(1, ethers.ZeroAddress, reservePriceUsd, startTime, endTime, await myNFT.getAddress(), tokenId);
      const receipt = await tx.wait();
      const event = receipt.logs.find((log) => {
        try {
          const parsed = auctionV2.interface.parseLog(log);
          return parsed && parsed.name === "AuctionCreated";
        } catch {
          return false;
        }
      });
      const auctionId = event.args.auctionId;

      await time.increase(2);

      // 出价
      const bidAmount = ethers.parseEther("0.1"); // $200
      await auctionV2.connect(bidder1).bid(auctionId, bidAmount, { value: bidAmount });

      await time.increase(3601); // 推进到拍卖结束

      // 结算
      await auctionV2.settleAuction(auctionId);

      // 验证 NFT 已转移给赢家
      expect(await myNFT.ownerOf(tokenId)).to.equal(bidder1.address);
    });

    it("应该正确结算无出价的 NFT 拍卖（退回 NFT）", async function () {
      const tokenId = 1;
      const startTime = (await time.latest()) + 1;
      const endTime = startTime + 3600;

      const tx = await auctionV2
        .connect(seller)
        .createAuction(1, ethers.ZeroAddress, 100n * 10n ** 8n, startTime, endTime, await myNFT.getAddress(), tokenId);
      const receipt = await tx.wait();
      const event = receipt.logs.find((log) => {
        try {
          const parsed = auctionV2.interface.parseLog(log);
          return parsed && parsed.name === "AuctionCreated";
        } catch {
          return false;
        }
      });
      const auctionId = event.args.auctionId;

      await time.increase(3601); // 推进到拍卖结束

      // 结算
      await auctionV2.settleAuction(auctionId);

      // 验证 NFT 已退回给卖家
      expect(await myNFT.ownerOf(tokenId)).to.equal(seller.address);
    });

    it("应该支持虚拟物品拍卖（V1 兼容性）", async function () {
      const startTime = (await time.latest()) + 1;
      const endTime = startTime + 3600;

      const tx = await auctionV2
        .connect(seller)
        .createAuction(1, ethers.ZeroAddress, 100n * 10n ** 8n, startTime, endTime, ethers.ZeroAddress, 0);

      await expect(tx).to.emit(auctionV2, "AuctionCreated");

      const receipt = await tx.wait();
      const event = receipt.logs.find((log) => {
        try {
          const parsed = auctionV2.interface.parseLog(log);
          return parsed && parsed.name === "AuctionCreated";
        } catch {
          return false;
        }
      });
      const auctionId = event.args.auctionId;
      const info = await auctionV2.getAuctionInfo(auctionId);
      expect(info.nftAddress).to.equal(ethers.ZeroAddress);
      expect(info.nftTokenId).to.equal(0);
    });
  });

  describe("V2 功能完整性", function () {
    beforeEach(async function () {
      const AuctionV2 = await ethers.getContractFactory("AuctionV2");
      auctionV2 = await upgrades.upgradeProxy(await auction.getAddress(), AuctionV2);
      await auctionV2.waitForDeployment();
    });

    it("应该保持所有 V1 功能正常工作", async function () {
      // 创建虚拟物品拍卖
      const startTime = (await time.latest()) + 1;
      const endTime = startTime + 3600;
      const tx = await auctionV2
        .connect(seller)
        .createAuction(1, ethers.ZeroAddress, 100n * 10n ** 8n, startTime, endTime, ethers.ZeroAddress, 0);
      const receipt = await tx.wait();
      const event = receipt.logs.find((log) => {
        try {
          const parsed = auctionV2.interface.parseLog(log);
          return parsed && parsed.name === "AuctionCreated";
        } catch {
          return false;
        }
      });
      const auctionId = event.args.auctionId;

      await time.increase(2);

      // 出价
      const bidAmount = ethers.parseEther("0.1");
      await auctionV2.connect(bidder1).bid(auctionId, bidAmount, { value: bidAmount });

      // 结算
      await time.increase(3601);
      await auctionV2.settleAuction(auctionId);

      // 验证结算成功
      const info = await auctionV2.getAuctionInfo(auctionId);
      expect(info.settled).to.be.true;
      expect(info.highestBidder).to.equal(bidder1.address);
    });
  });
});

