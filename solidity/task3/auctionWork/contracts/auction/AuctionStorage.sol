// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

/**
 * @title AuctionStorage
 * @dev 抽离存储布局以确保升级时的存储安全性
 * V1 用 itemId（虚拟拍品），V2 会新增 NFT 字段。
 */
contract AuctionStorage {
    struct Auction {
        // --- V1 字段 ---
        address seller;
        uint256 itemId; // 虚拟 ItemId
        address paymentToken; // ETH(ZERO_ADDRESS) 或 ERC20
        uint256 reservePriceUsd; // 底价（按 USD）
        uint256 highestBidUsd; // 当前最高出价（USD）
        uint256 highestBidAmount; // 实际 token/ETH 数量
        address highestBidder;
        uint256 startTime;
        uint256 endTime;
        bool settled;
        // --- V2 字段（升级时新增） ---
        address nftAddress; // NFT 合约地址（V1 为 address(0)）
        uint256 nftTokenId; // NFT ID（V1 为 0）
    }

    // 费率阶梯结构
    struct FeeTier {
        uint256 minAmountUsd; // 最小金额（USD，8 decimals）
        uint256 feeBps;      // 该区间的费率（basis points，例如 500 = 5%）
    }

    // 拍卖 ID → 拍卖数据
    mapping(uint256 => Auction) internal auctions;

    // 拍卖总数（用于生成新的拍卖 ID）
    uint256 internal auctionCounter;

    // 费率阶梯数组（按 minAmountUsd 升序排列）
    FeeTier[] internal feeTiers;

    // 是否启用动态手续费（false 时使用固定费率 feeBps）
    bool internal useDynamicFee;
}
