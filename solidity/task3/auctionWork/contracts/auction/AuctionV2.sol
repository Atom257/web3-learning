// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "./AuctionV1.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

/**
 * @title AuctionV2
 * @dev 新增真实 NFT 拍卖功能，兼容 V1 可升级
 * @custom:oz-upgrades-unsafe-allow missing-initializer
 */
contract AuctionV2 is AuctionV1 {
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initializeV2() external reinitializer(2) {
        // V2 没有新状态变量需要初始化
        // 父合约的初始化器已经在 V1 中调用过，这里不需要再次调用
    }
    /**
     * @notice 创建拍卖（V2 支持 NFT）
     * 覆盖 V1 函数，但保留参数结构不变（proxy 升级要求）
     */
    function createAuction(
        uint256 itemId,
        address paymentToken,
        uint256 reservePriceUsd,
        uint256 startTime,
        uint256 endTime,
        address nftAddress, // V2 使用
        uint256 nftTokenId // V2 使用
    ) public override returns (uint256 auctionId) {
        // 保留 V1 逻辑（虚拟 itemId）
        auctionId = super.createAuction(
            itemId,
            paymentToken,
            reservePriceUsd,
            startTime,
            endTime,
            nftAddress,
            nftTokenId
        );

        // 如果传入了 NFT，则进行 NFT 拍卖
        if (nftAddress != address(0)) {
            _handleNftOnCreate(auctionId, nftAddress, nftTokenId);
        }
    }

    /**
     * @dev 内部函数：创建拍卖时托管 NFT
     */
    function _handleNftOnCreate(
        uint256 auctionId,
        address nftAddress,
        uint256 nftTokenId
    ) internal {
        Auction storage a = auctions[auctionId];

        // 要求调用者是 NFT 拥有者
        require(
            IERC721(nftAddress).ownerOf(nftTokenId) == msg.sender,
            "Not NFT owner"
        );

        // 转移到合约托管
        IERC721(nftAddress).transferFrom(msg.sender, address(this), nftTokenId);

        // 更新拍卖记录
        a.nftAddress = nftAddress;
        a.nftTokenId = nftTokenId;
    }

    /**
     * @dev 覆盖 V1 的 settleAuction，增加 NFT 转移逻辑
     */
    function settleAuction(uint256 auctionId) public override nonReentrant {
        require(
            auctionId > 0 && auctionId <= auctionCounter,
            "Invalid auctionId"
        );

        Auction storage a = auctions[auctionId];
        require(!a.settled, "Already settled");
        require(block.timestamp >= a.endTime, "Auction not ended");

        a.settled = true;

        // 如果没有人出价：退回 NFT（如果是 NFT 拍卖）
        if (a.highestBidder == address(0)) {
            if (a.nftAddress != address(0)) {
                IERC721(a.nftAddress).transferFrom(
                    address(this),
                    a.seller,
                    a.nftTokenId
                );
            }

            emit AuctionSettled(auctionId, address(0), 0);
            return;
        }

        // 有出价（资金结算使用父类逻辑，支持动态手续费）
        uint256 amount = a.highestBidAmount;
        uint256 fee = _calculateFee(amount, a.paymentToken, a.highestBidUsd);
        uint256 sellerAmount = amount - fee;

        // 支付资金
        _payout(a.paymentToken, a.seller, sellerAmount);
        if (fee > 0) {
            _payout(a.paymentToken, feeRecipient, fee);
        }

        // NFT 转给赢家
        if (a.nftAddress != address(0)) {
            IERC721(a.nftAddress).transferFrom(
                address(this),
                a.highestBidder,
                a.nftTokenId
            );
        }

        emit AuctionSettled(auctionId, a.highestBidder, amount);
    }
}
