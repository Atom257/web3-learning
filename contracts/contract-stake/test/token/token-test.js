const { ethers } = require("hardhat");
const { expect } = require("chai");

describe("MyStakeToken", function () {
  let Token, token, owner, addr;

  beforeEach(async function () {
    [owner, addr] = await ethers.getSigners();
    Token = await ethers.getContractFactory("MyStakeToken");
    token = await Token.deploy();
    await token.waitForDeployment();
  });

  it("部署后 owner 拥有全部代币", async function () {
    const ownerBalance = await token.balanceOf(owner.address);
    const totalSupply = await token.totalSupply();
    expect(ownerBalance).to.equal(totalSupply);
  });

  it("可以正常转账", async function () {
    const amount = ethers.parseEther("1000");
    await token.transfer(addr.address, amount);
    const addrBalance = await token.balanceOf(addr.address);
    expect(addrBalance).to.equal(amount);
  });
});
