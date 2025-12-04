const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");

describe("PriceOracle", function () {
  let priceOracle;
  let mockPriceFeed;
  let owner;
  let user;

  const ETH_PRICE_USD = 2000n * 10n ** 8n; // $2000, 8 decimals
  const TOKEN_PRICE_USD = 1n * 10n ** 8n; // $1, 8 decimals

  beforeEach(async function () {
    [owner, user] = await ethers.getSigners();

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
  });

  describe("初始化", function () {
    it("应该正确初始化", async function () {
      expect(await priceOracle.owner()).to.equal(owner.address);
    });

    it("应该允许 owner 设置价格源", async function () {
      await priceOracle.setPriceFeed(ethers.ZeroAddress, await mockPriceFeed.getAddress());
      expect(await priceOracle.getPriceFeed(ethers.ZeroAddress)).to.equal(await mockPriceFeed.getAddress());
    });

    it("应该拒绝非 owner 设置价格源", async function () {
      await expect(
        priceOracle.connect(user).setPriceFeed(ethers.ZeroAddress, await mockPriceFeed.getAddress())
      ).to.be.revertedWithCustomError(priceOracle, "OwnableUnauthorizedAccount");
    });
  });

  describe("价格查询", function () {
    beforeEach(async function () {
      await priceOracle.setPriceFeed(ethers.ZeroAddress, await mockPriceFeed.getAddress());
    });

    it("应该正确获取 ETH 价格", async function () {
      const price = await priceOracle.getTokenPriceUsd(ethers.ZeroAddress);
      expect(price).to.equal(ETH_PRICE_USD);
    });

    it("应该正确计算 USD 价值", async function () {
      const ethAmount = ethers.parseEther("1"); // 1 ETH
      const usdValue = await priceOracle.toUsdValue(ethers.ZeroAddress, ethAmount);
      // 1 ETH * $2000 = $2000 (with 8 decimals)
      expect(usdValue).to.equal(2000n * 10n ** 8n);
    });

    it("应该处理未设置的价格源", async function () {
      const unsetToken = ethers.Wallet.createRandom().address;
      await expect(priceOracle.getTokenPriceUsd(unsetToken)).to.be.revertedWith("Price feed not set");
    });

    it("应该处理多个代币的价格源", async function () {
      // 部署另一个 MockPriceFeed 用于 ERC20
      const MockPriceFeed = await ethers.getContractFactory("MockPriceFeed");
      const tokenPriceFeed = await MockPriceFeed.deploy(TOKEN_PRICE_USD);
      
      const tokenAddress = ethers.Wallet.createRandom().address;
      await priceOracle.setPriceFeed(tokenAddress, await tokenPriceFeed.getAddress());
      
      const price = await priceOracle.getTokenPriceUsd(tokenAddress);
      expect(price).to.equal(TOKEN_PRICE_USD);
    });
  });

  describe("价格更新", function () {
    beforeEach(async function () {
      await priceOracle.setPriceFeed(ethers.ZeroAddress, await mockPriceFeed.getAddress());
    });

    it("应该反映价格源的价格变化", async function () {
      const newPrice = 3000n * 10n ** 8n; // $3000
      await mockPriceFeed.updatePrice(newPrice);
      
      const price = await priceOracle.getTokenPriceUsd(ethers.ZeroAddress);
      expect(price).to.equal(newPrice);
    });
  });
});

