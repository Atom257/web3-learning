// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";
import "../interfaces/IPriceOracle.sol";

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
/**
 * @title PriceOracle
 * @dev 用于 token/USD 价格换算，支持 ETH 和 ERC20
 */
contract PriceOracle is Initializable, OwnableUpgradeable, IPriceOracle {
    // token 地址 -> Chainlink price feed 地址
    mapping(address => address) public priceFeeds;
    /// @notice 初始化函数（代替构造函数）
    function initialize() external initializer {
        __Ownable_init(msg.sender);
    }
    /// @notice 设置 token -> Chainlink 价格源
    function setPriceFeed(
        address token,
        address feed
    ) external override onlyOwner {
        priceFeeds[token] = feed;
    }

    /// @notice 获取 token 的价格源地址
    function getPriceFeed(
        address token
    ) external view override returns (address) {
        return priceFeeds[token];
    }

    /// @notice 获取 1 token = ? USD（返回 1e8 精度）
    function getTokenPriceUsd(
        address token
    ) public view override returns (uint256) {
        address feed = priceFeeds[token];
        require(feed != address(0), "Price feed not set");

        AggregatorV3Interface priceFeed = AggregatorV3Interface(feed);

        (, int256 price, , , ) = priceFeed.latestRoundData();
        require(price > 0, "Invalid price");

        return uint256(price); // Chainlink 返回本身就是 1e8 精度
    }

    /// @notice 将 token 数量换算为 USD（1e8 精度）
    function toUsdValue(
        address token,
        uint256 amount
    ) external view override returns (uint256) {
        uint256 priceUsd = getTokenPriceUsd(token);
        return (amount * priceUsd) / 1e18;
        // 默认 ERC20、ETH 用 18 decimals，price 是 1e8 精度
    }
}
