// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

interface IAuction {
    struct AuctionInfo {
        address seller;
        uint256 itemId;
        address paymentToken;
        uint256 reservePriceUsd;
        uint256 highestBidUsd;
        uint256 highestBidAmount;
        address highestBidder;
        uint256 startTime;
        uint256 endTime;
        bool settled;
        // V2 新增字段：真实 NFT 拍卖
        address nftAddress;
        uint256 nftTokenId;
    }

    event AuctionCreated(
        uint256 indexed auctionId,
        address indexed seller,
        uint256 indexed itemId,
        address paymentToken,
        uint256 reservePriceUsd,
        uint256 startTime,
        uint256 endTime
    );

    event BidPlaced(
        uint256 indexed auctionId,
        address indexed bidder,
        uint256 amount,
        uint256 usdValue
    );

    event AuctionSettled(
        uint256 indexed auctionId,
        address indexed winner,
        uint256 amountPaid
    );

    function createAuction(
        uint256 itemId,
        address paymentToken,
        uint256 reservePriceUsd,
        uint256 startTime,
        uint256 endTime,
        address nftAddress, // V1: address(0)
        uint256 nftTokenId // V1: 0
    ) external returns (uint256);

    function bid(uint256 auctionId, uint256 amount) external payable;

    function settleAuction(uint256 auctionId) external;

    function getAuctionInfo(
        uint256 auctionId
    ) external view returns (AuctionInfo memory);

    function getHighestBidUsd(
        uint256 auctionId
    ) external view returns (uint256);

    function totalAuctions() external view returns (uint256);
}
