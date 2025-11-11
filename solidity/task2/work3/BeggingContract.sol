// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title BeggingContract
 * @dev 允许用户在限定时间内向合约捐赠 ETH，
 *      记录每位捐赠者的累计金额，
 *      并维护前三名捐赠者排行榜。
 *      合约所有者可以提取所有捐赠资金。
 */
contract BeggingContract {
    /// @notice 合约所有者地址（部署者）
    address public immutable owner;

    /// @notice 捐赠开始时间（时间戳）
    uint256 public startTime;

    /// @notice 捐赠结束时间（时间戳）
    uint256 public endTime;

    /// @notice 记录每个地址的累计捐赠金额
    mapping(address => uint256) public donations;

    /// @notice 排名映射：名次 => 地址
    /// 1 = 第一名, 2 = 第二名, 3 = 第三名
    mapping(uint256 => address) public rankToDonor;

    /// @notice 构造函数：设置合约所有者和捐赠时间窗口
    constructor() {
        owner = msg.sender;
        startTime = block.timestamp;
        endTime = block.timestamp + 7 days; // 默认持续 7 天
    }

    /// @notice 权限控制修饰符：仅限合约所有者调用
    modifier onlyOwner() {
        require(owner == msg.sender, "Not owner");
        _;
    }

    /// @notice 记录每次捐赠的事件
    event Donation(address indexed sender, uint256 amount);

    /**
     * @dev 内部函数：更新捐赠排行榜
     * 只在 donate() 中被调用。
     */
    function _updateRanking(address donor) internal {
        uint256 amount = donations[donor];

        // 读取当前前三名地址
        address first = rankToDonor[1];
        address second = rankToDonor[2];
        address third = rankToDonor[3];

        // 判断并插入到正确位置
        if (first == address(0) || amount > donations[first]) {
            // donor 成为第一名，其他名次依次后移
            rankToDonor[1] = donor;
            rankToDonor[2] = first;
            rankToDonor[3] = second;
        } else if (second == address(0) || amount > donations[second]) {
            // donor 成为第二名
            rankToDonor[2] = donor;
            rankToDonor[3] = second;
        } else if (third == address(0) || amount > donations[third]) {
            // donor 成为第三名
            rankToDonor[3] = donor;
        }
    }

    /**
     * @notice 用户捐赠函数（可支付）
     * @dev 仅在时间范围内允许捐赠
     */
    function donate() public payable returns (bool) {
        require(
            block.timestamp >= startTime && block.timestamp <= endTime,
            "Donation period closed"
        );
        require(msg.value > 0, "Must send ETH");

        // 累加捐赠金额
        donations[msg.sender] += msg.value;

        // 触发事件
        emit Donation(msg.sender, msg.value);

        // 更新排行榜
        _updateRanking(msg.sender);

        return true;
    }

    /**
     * @notice 合约所有者提取所有资金
     * @dev 使用 onlyOwner 修饰符限制权限
     */
    function withdraw() public onlyOwner returns (bool) {
        uint256 balance = address(this).balance;
        require(balance > 0, "No funds");
        payable(owner).transfer(balance);
        return true;
    }

    /**
     * @notice 查询某个地址的捐赠金额
     * @param donor 捐赠者地址
     * @return 该地址累计捐赠金额（wei）
     */
    function getDonation(address donor) public view returns (uint256) {
        require(donor != address(0), "Invalid address");
        return donations[donor];
    }

    /**
     * @notice 获取当前捐赠排行榜前三名
     * @return topAddresses 前三名地址数组
     * @return topAmounts 对应捐赠金额数组
     */
    function getTop3()
        public
        view
        returns (address[3] memory topAddresses, uint256[3] memory topAmounts)
    {
        for (uint256 i = 0; i < 3; i++) {
            address donor = rankToDonor[i + 1];
            topAddresses[i] = donor;
            topAmounts[i] = donations[donor];
        }
    }
}
