// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title LearnChain ERC20 Token
/// @notice 练习用 ERC20 代币，支持转账、授权与增发（仅限所有者）
/// @dev 参考 ERC20 标准接口
interface IERC20 {
    /// @notice 返回代币总量
    function totalSupply() external view returns (uint256);

    /// @notice 查询账户余额
    function balanceOf(address account) external view returns (uint256);

    /// @notice 从调用者账户向 `to` 转账指定数量代币
    function transfer(address to, uint256 amount) external returns (bool);

    /// @notice 返回授权额度
    function allowance(
        address owner,
        address spender
    ) external view returns (uint256);

    /// @notice 授权 `spender` 可从调用者账户转走 `amount` 代币
    function approve(address spender, uint256 amount) external returns (bool);

    /// @notice 代扣转账（需事先授权）
    function transferFrom(
        address from,
        address to,
        uint256 amount
    ) external returns (bool);

    /// @notice 记录转账事件
    event Transfer(address indexed from, address indexed to, uint256 value);

    /// @notice 记录授权事件
    event Approval(
        address indexed owner,
        address indexed spender,
        uint256 value
    );
}

/// @title LearnChain ERC20 实现合约
/// @notice 可增发、转账、授权的 ERC20 Token 练习
contract ERC20Demo is IERC20 {
    // === 基本信息 ===
    string public name = "LearnChain";
    string public symbol = "LRN";
    uint8 public decimals = 10;

    // === 状态变量 ===
    uint256 private _totalSupply;
    address public immutable owner;

    // === 账户余额与授权映射 ===
    mapping(address => uint256) private _balances;
    mapping(address => mapping(address => uint256)) private _allowances;

    // === 自定义错误 ===
    error Unauthorized(address caller, string action);

    // === 修饰符 ===
    modifier onlyOwner(string memory action) {
        if (msg.sender != owner) {
            revert Unauthorized(msg.sender, action);
        }
        _;
    }

    // === 构造函数 ===
    constructor() {
        owner = msg.sender;
    }

    // === ERC20 接口实现 ===

    /// @inheritdoc IERC20
    function totalSupply() public view override returns (uint256) {
        return _totalSupply;
    }

    /// @inheritdoc IERC20
    function balanceOf(address account) public view override returns (uint256) {
        return _balances[account];
    }

    /// @inheritdoc IERC20
    function transfer(
        address to,
        uint256 amount
    ) public override returns (bool) {
        require(to != address(0), "ERC20: transfer to zero address");
        require(_balances[msg.sender] >= amount, "ERC20: insufficient balance");

        _balances[msg.sender] -= amount;
        _balances[to] += amount;

        emit Transfer(msg.sender, to, amount);
        return true;
    }

    /// @inheritdoc IERC20
    function allowance(
        address owner_,
        address spender
    ) public view override returns (uint256) {
        return _allowances[owner_][spender];
    }

    /// @inheritdoc IERC20
    function approve(
        address spender,
        uint256 amount
    ) public override returns (bool) {
        require(spender != address(0), "ERC20: approve to zero address");

        _allowances[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    /// @inheritdoc IERC20
    function transferFrom(
        address from,
        address to,
        uint256 amount
    ) public override returns (bool) {
        require(to != address(0), "ERC20: transfer to zero address");
        require(_balances[from] >= amount, "ERC20: insufficient balance");
        require(
            _allowances[from][msg.sender] >= amount,
            "ERC20: allowance exceeded"
        );

        _balances[from] -= amount;
        _balances[to] += amount;
        _allowances[from][msg.sender] -= amount;

        emit Transfer(from, to, amount);
        return true;
    }

    // === 扩展功能 ===
    /// @notice 仅合约拥有者可调用，增发代币
    /// @param to 接收账户
    /// @param amount 增发数量
    function mint(address to, uint256 amount) external onlyOwner("mint") {
        _mint(to, amount);
    }

    /// @notice 代币持有人可自行销毁代币
    /// @param amount 要销毁的数量
    function burn(uint256 amount) external {
        _burn(msg.sender, amount);
    }

    /// @dev 内部增发逻辑
    function _mint(address to, uint256 amount) internal {
        require(to != address(0), "ERC20: mint to zero address");

        _totalSupply += amount;
        _balances[to] += amount;

        emit Transfer(address(0), to, amount);
    }

    /// @dev 内部销毁逻辑
    function _burn(address from, uint256 amount) internal {
        require(from != address(0), "ERC20: burn from zero address");
        require(_balances[from] >= amount, "ERC20: insufficient balance");

        _balances[from] -= amount;
        _totalSupply -= amount;
        emit Transfer(from, address(0), amount);
    }
}
