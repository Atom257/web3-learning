// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "../interfaces/IAuction.sol";
import "../interfaces/IPriceOracle.sol";
import "./AuctionStorage.sol";

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

// 基类
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";

/**
 * @title AuctionV1
 * @dev V1: 仅支持虚拟 itemId 拍卖，不处理真实 NFT 转移
 * 通过 Transparent Proxy 部署，可升级到 V2。
 */
contract AuctionV1 is
    Initializable,
    OwnableUpgradeable,
    ReentrancyGuardUpgradeable,
    IAuction,
    AuctionStorage
{
    // --------- 基本状态 ---------

    /// @notice 价格预言机
    IPriceOracle public priceOracle;

    /// @notice 手续费（万分比），例如 200 = 2%
    uint256 public feeBps;

    /// @notice 手续费接收地址
    address public feeRecipient;

    // --------- 初始化（取代构造函数，用于 Proxy 部署） ---------

    /// @notice 初始化函数，只能被调用一次（deployProxy 时调用）
    /// @param _oracle 价格预言机合约地址
    /// @param _feeBps 手续费（万分比）
    /// @param _feeRecipient 手续费接收地址

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }
    
    /// @dev 内部初始化函数，供子合约调用
    function __AuctionV1_init(
        address _oracle,
        uint256 _feeBps,
        address _feeRecipient
    ) internal onlyInitializing {
        __Ownable_init(msg.sender);
        __ReentrancyGuard_init();
        
        require(_oracle != address(0), "Invalid oracle");
        require(_feeRecipient != address(0), "Invalid feeRecipient");
        
        priceOracle = IPriceOracle(_oracle);
        feeBps = _feeBps;
        feeRecipient = _feeRecipient;
    }
    
    function initialize(
        address _oracle,
        uint256 _feeBps,
        address _feeRecipient
    ) external initializer {
        __AuctionV1_init(_oracle, _feeBps, _feeRecipient);
    }

    // --------- 管理函数（onlyOwner） ---------

    function setFeeBps(uint256 _feeBps) external onlyOwner {
        require(_feeBps <= 1000, "Fee too high"); // 最多 10%
        feeBps = _feeBps;
    }

    function setFeeRecipient(address _feeRecipient) external onlyOwner {
        require(_feeRecipient != address(0), "Invalid feeRecipient");
        feeRecipient = _feeRecipient;
    }

    function setPriceOracle(address _oracle) external onlyOwner {
        require(_oracle != address(0), "Invalid oracle");
        priceOracle = IPriceOracle(_oracle);
    }

    /**
     * @notice 设置费率阶梯（启用动态手续费）
     * @param tiers 费率阶梯数组，必须按 minAmountUsd 升序排列
     * @dev 第一个阶梯的 minAmountUsd 应该为 0
     */
    function setFeeTiers(AuctionStorage.FeeTier[] memory tiers) external onlyOwner {
        require(tiers.length > 0, "Tiers cannot be empty");
        
        // 验证阶梯顺序和有效性
        for (uint256 i = 0; i < tiers.length; i++) {
            require(tiers[i].feeBps <= 1000, "Fee too high"); // 最多 10%
            
            if (i > 0) {
                require(
                    tiers[i].minAmountUsd > tiers[i - 1].minAmountUsd,
                    "Tiers must be in ascending order"
                );
            } else {
                require(tiers[i].minAmountUsd == 0, "First tier must start at 0");
            }
        }
        
        // 清空旧阶梯
        delete feeTiers;
        
        // 添加新阶梯
        for (uint256 i = 0; i < tiers.length; i++) {
            feeTiers.push(tiers[i]);
        }
        
        // 启用动态手续费
        useDynamicFee = true;
    }

    /**
     * @notice 禁用动态手续费，使用固定费率
     */
    function disableDynamicFee() external onlyOwner {
        useDynamicFee = false;
    }

    /**
     * @notice 获取费率阶梯数量
     */
    function getFeeTierCount() external view returns (uint256) {
        return feeTiers.length;
    }

    /**
     * @notice 获取指定索引的费率阶梯
     */
    function getFeeTier(uint256 index) external view returns (AuctionStorage.FeeTier memory) {
        require(index < feeTiers.length, "Index out of bounds");
        return feeTiers[index];
    }

    /**
     * @notice 查询指定金额（USD）对应的费率（basis points）
     * @param amountUsd 金额（USD，8 decimals）
     * @return feeBpsValue 费率（basis points）
     */
    function getFeeBpsForAmount(uint256 amountUsd) public view returns (uint256 feeBpsValue) {
        if (!useDynamicFee || feeTiers.length == 0) {
            return feeBps; // 返回固定费率
        }
        
        // 从后往前查找，找到第一个 minAmountUsd <= amountUsd 的阶梯
        for (uint256 i = feeTiers.length; i > 0; i--) {
            if (amountUsd >= feeTiers[i - 1].minAmountUsd) {
                return feeTiers[i - 1].feeBps;
            }
        }
        
        // 如果金额小于所有阶梯，返回第一个阶梯的费率
        return feeTiers[0].feeBps;
    }

    // --------- IAuction 实现 ---------

    /// @notice 创建拍卖（V1 中 nftAddress / nftTokenId 不使用）
    function createAuction(
        uint256 itemId,
        address paymentToken,
        uint256 reservePriceUsd,
        uint256 startTime,
        uint256 endTime,
        address nftAddress, // V1 中忽略
        uint256 nftTokenId // V1 中忽略
    ) public virtual override returns (uint256 auctionId) {
        require(itemId != 0, "Invalid itemId");
        require(endTime > startTime, "Invalid time range");
        require(reservePriceUsd > 0, "Reserve must > 0");

        // 增加拍卖 ID
        auctionId = ++auctionCounter;

        Auction storage a = auctions[auctionId];
        a.seller = msg.sender;
        a.itemId = itemId;
        a.paymentToken = paymentToken;
        a.reservePriceUsd = reservePriceUsd;
        a.startTime = startTime;
        a.endTime = endTime;
        a.settled = false;

        // V1 中不使用，保持为默认值
        a.nftAddress = address(0);
        a.nftTokenId = 0;

        emit AuctionCreated(
            auctionId,
            msg.sender,
            itemId,
            paymentToken,
            reservePriceUsd,
            startTime,
            endTime
        );
    }

    /// @notice 出价（ETH 或 ERC20），amount 为本次出价数量
    /// @dev 如果 paymentToken = address(0)，则使用 ETH，amount 必须等于 msg.value
    function bid(
        uint256 auctionId,
        uint256 amount
    ) external payable override nonReentrant {
        require(
            auctionId > 0 && auctionId <= auctionCounter,
            "Invalid auctionId"
        );

        Auction storage a = auctions[auctionId];
        require(block.timestamp >= a.startTime, "Auction not started");
        require(block.timestamp < a.endTime, "Auction ended");
        require(!a.settled, "Auction settled");
        require(amount > 0, "Amount must > 0");

        // 处理支付
        if (a.paymentToken == address(0)) {
            // 使用 ETH 出价
            require(msg.value == amount, "ETH amount mismatch");
        } else {
            // 使用 ERC20 出价
            require(msg.value == 0, "No ETH allowed");
            IERC20(a.paymentToken).transferFrom(
                msg.sender,
                address(this),
                amount
            );
        }

        // 计算 USD 价值
        uint256 usdValue = priceOracle.toUsdValue(a.paymentToken, amount);
        require(usdValue >= a.reservePriceUsd, "Below reserve price");
        require(usdValue > a.highestBidUsd, "Bid too low");

        // 退还上一个出价者
        if (a.highestBidder != address(0)) {
            _refund(a.paymentToken, a.highestBidder, a.highestBidAmount);
        }

        // 更新最高出价
        a.highestBidder = msg.sender;
        a.highestBidUsd = usdValue;
        a.highestBidAmount = amount;

        emit BidPlaced(auctionId, msg.sender, amount, usdValue);
    }

    /// @notice 结束并结算拍卖，任何人可调用
    function settleAuction(
        uint256 auctionId
    ) public virtual override nonReentrant {
        require(
            auctionId > 0 && auctionId <= auctionCounter,
            "Invalid auctionId"
        );

        Auction storage a = auctions[auctionId];
        require(!a.settled, "Already settled");
        require(block.timestamp >= a.endTime, "Auction not ended");

        a.settled = true;

        // 没有出价者：什么也不做（V1 中没有 NFT 需要退还）
        if (a.highestBidder == address(0)) {
            emit AuctionSettled(auctionId, address(0), 0);
            return;
        }

        // 有中标者：将资金转给卖家 & 手续费
        uint256 amount = a.highestBidAmount;
        
        // 计算动态手续费
        uint256 fee = _calculateFee(amount, a.paymentToken, a.highestBidUsd);
        uint256 sellerAmount = amount - fee;

        _payout(a.paymentToken, a.seller, sellerAmount);
        if (fee > 0) {
            _payout(a.paymentToken, feeRecipient, fee);
        }

        emit AuctionSettled(auctionId, a.highestBidder, amount);
    }

    function getAuctionInfo(
        uint256 auctionId
    ) external view override returns (IAuction.AuctionInfo memory info) {
        require(
            auctionId > 0 && auctionId <= auctionCounter,
            "Invalid auctionId"
        );

        Auction storage a = auctions[auctionId];
        info = IAuction.AuctionInfo({
            seller: a.seller,
            itemId: a.itemId,
            paymentToken: a.paymentToken,
            reservePriceUsd: a.reservePriceUsd,
            highestBidUsd: a.highestBidUsd,
            highestBidAmount: a.highestBidAmount,
            highestBidder: a.highestBidder,
            startTime: a.startTime,
            endTime: a.endTime,
            settled: a.settled,
            nftAddress: a.nftAddress,
            nftTokenId: a.nftTokenId
        });
    }

    function getHighestBidUsd(
        uint256 auctionId
    ) external view override returns (uint256) {
        require(
            auctionId > 0 && auctionId <= auctionCounter,
            "Invalid auctionId"
        );
        return auctions[auctionId].highestBidUsd;
    }

    function totalAuctions() external view override returns (uint256) {
        return auctionCounter;
    }

    // --------- 内部工具函数 ---------

    /**
     * @dev 计算手续费（支持动态费率）
     * @param amount 拍卖金额（token/ETH 数量）
     * @param amountUsd 拍卖金额（USD，8 decimals）
     * @return fee 手续费金额
     */
    function _calculateFee(
        uint256 amount,
        address, // paymentToken - 保留用于未来扩展
        uint256 amountUsd
    ) internal view returns (uint256 fee) {
        uint256 feeBpsToUse;
        
        if (useDynamicFee && feeTiers.length > 0) {
            // 使用动态费率
            feeBpsToUse = getFeeBpsForAmount(amountUsd);
        } else {
            // 使用固定费率
            feeBpsToUse = feeBps;
        }
        
        fee = (amount * feeBpsToUse) / 10000;
    }

    function _refund(
        address paymentToken,
        address to,
        uint256 amount
    ) internal {
        if (amount == 0) return;
        if (paymentToken == address(0)) {
            (bool ok, ) = payable(to).call{value: amount}("");
            require(ok, "ETH refund failed");
        } else {
            IERC20(paymentToken).transfer(to, amount);
        }
    }

    function _payout(
        address paymentToken,
        address to,
        uint256 amount
    ) internal {
        if (amount == 0) return;
        if (paymentToken == address(0)) {
            (bool ok, ) = payable(to).call{value: amount}("");
            require(ok, "ETH payout failed");
        } else {
            IERC20(paymentToken).transfer(to, amount);
        }
    }

    // 为未来在本合约中继续添加状态变量预留 gap（与 OZ 模式保持一致）
    uint256[50] private __gap;
}
