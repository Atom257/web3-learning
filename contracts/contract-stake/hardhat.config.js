require("@nomicfoundation/hardhat-toolbox");
require("@openzeppelin/hardhat-upgrades");
require("dotenv").config();
const { SEPOLIA_RPC, PRIVATE_KEY, ETHERSCAN_KEY } = process.env;
module.exports = {
  solidity: "0.8.23",
  networks: {
    sepolia: {
      url: SEPOLIA_RPC,
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
    },
  },
  etherscan: {
    apiKey: ETHERSCAN_KEY,
  },
};
