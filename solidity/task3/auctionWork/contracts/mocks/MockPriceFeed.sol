// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

/**
 * @dev 一个简单的 Chainlink mock 预言机，用于本地测试。
 * 返回固定的价格（USD 精度 1e8）。
 *
 * latestRoundData 应返回:
 * - roundId
 * - answer (int256)
 * - startedAt
 * - updatedAt
 * - answeredInRound
 */
contract MockPriceFeed {
    int256 private _price;
    uint8 private _decimals;

    constructor(int256 initialPrice) {
        _price = initialPrice;
        _decimals = 8; // Chainlink ETH/USD 是 8 decimals
    }

    function decimals() external view returns (uint8) {
        return _decimals;
    }

    function updatePrice(int256 newPrice) external {
        _price = newPrice;
    }

    function latestRoundData()
        external
        view
        returns (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        )
    {
        return (
            1, // roundId
            _price, // 价格
            block.timestamp,
            block.timestamp,
            1 // answeredInRound
        );
    }
}
