// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

interface IPriceOracle {
    /// @notice 返回 1 token = 多少 USD（8 decimals 与 Chainlink 一致）
    function getTokenPriceUsd(address token) external view returns (uint256);

    /// @notice token 数量换算为 USD
    function toUsdValue(
        address token,
        uint256 amount
    ) external view returns (uint256);

    /// @notice 设置某个 token 对应的 price feed 地址（只有 owner 能调用）
    function setPriceFeed(address token, address feed) external;

    /// @notice 返回 token 对应的价格源
    function getPriceFeed(address token) external view returns (address);
}
