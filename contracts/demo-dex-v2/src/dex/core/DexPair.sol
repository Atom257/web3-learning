// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "openzeppelin-contracts/contracts/token/ERC20/ERC20.sol";
import "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";

contract DexPair is ERC20 {
    address public factory;
    address public token0;
    address public token1;

    uint112 public reserve0;
    uint112 public reserve1;
    uint32 public blockTimestampLast;

    bool private initialized;
    uint256 private constant MINIMUM_LIQUIDITY = 1000;
    address constant BURN = 0x000000000000000000000000000000000000dEaD;
    event Mint(address indexed sender, uint256 amount0, uint256 amount1);
    event Burn(
        address indexed sender,
        uint256 amount0,
        uint256 amount1,
        address indexed to
    );
    event Swap(
        address indexed sender,
        uint256 amount0In,
        uint256 amount1In,
        uint256 amount0Out,
        uint256 amount1Out,
        address indexed to
    );

    constructor(address _factory) ERC20("DEX LP Token", "DEX-LP") {
        factory = _factory;
    }

    function initialize(address _token0, address _token1) external {
        require(msg.sender == factory, "FORBIDDEN");
        require(!initialized, "ALREADY_INITIALIZED");

        require(_token0 != address(0) && _token1 != address(0), "ZERO_ADDRESS");
        require(_token0 != _token1, "IDENTICAL_ADDRESS");

        token0 = _token0;
        token1 = _token1;
        initialized = true;
    }

    function getReserves()
        external
        view
        returns (
            uint112 _reserve0,
            uint112 _reserve1,
            uint32 _blockTimestampLast
        )
    {
        return (reserve0, reserve1, blockTimestampLast);
    }

    function mint(address to) external returns (uint256 liquidity) {
        // 读当前 reserves：_reserve0, _reserve1
        uint112 _reserve0 = reserve0;
        uint112 _reserve1 = reserve1;
        // 读当前余额：
        uint256 balance0 = IERC20(token0).balanceOf(address(this));
        uint256 balance1 = IERC20(token1).balanceOf(address(this));
        // 计算实际输入：
        uint256 amount0 = balance0 - _reserve0;
        uint256 amount1 = balance1 - _reserve1;
        // 计算 liquidity：
        // liquidity = sqrt(amount0 * amount1) - MINIMUM_LIQUIDITY
        // 然后把 MINIMUM_LIQUIDITY 记到 address(0)（锁定）
        // 否则：
        // liquidity = min(amount0 * totalSupply / _reserve0, amount1 * totalSupply / _reserve1)
        uint256 _totalSupply = totalSupply();
        if (_totalSupply == 0) {
            uint256 liquidityRaw = sqrt(amount0 * amount1);
            require(liquidityRaw > MINIMUM_LIQUIDITY, "INSUFFICIENT_LIQUIDITY");

            liquidity = liquidityRaw - MINIMUM_LIQUIDITY;
            // 锁死 LP

            _mint(BURN, MINIMUM_LIQUIDITY);
            _mint(to, liquidity);
        } else {
            liquidity = min(
                (amount0 * _totalSupply) / _reserve0,
                (amount1 * _totalSupply) / _reserve1
            );
            require(liquidity > 0, "INSUFFICIENT_LIQUIDITY_MINTED");

            _mint(to, liquidity);
        }

        // 更新 LP 状态：
        _update(balance0, balance1);
        // emit Mint(...)（事件可选但建议）
        emit Mint(msg.sender, amount0, amount1);
        // 返回 liquidity
        return liquidity;
    }

    function burn(
        address to
    ) external returns (uint256 amount0, uint256 amount1) {
        // 读取 reserves：_reserve0, _reserve1
        // uint112 _reserve0 = reserve0;
        // uint112 _reserve1 = reserve1;
        // 读取当前 token 余额：
        uint256 balance0 = IERC20(token0).balanceOf(address(this));
        uint256 balance1 = IERC20(token1).balanceOf(address(this));
        // 读取本次要 burn 的 LP 数量：
        uint256 liquidity = balanceOf(address(this));
        require(liquidity > 0, "NO_LIQUIDITY");

        // （约定：调用 burn 前，LP 份额已被转到 Pair；现在你还没实现 LP transfer，所以测试里你可以先“把 LP 记到 address(this)”——我们稍后会解决这一点）
        // 按比例计算应返还：
        uint256 _totalSupply = totalSupply();
        amount0 = (liquidity * balance0) / _totalSupply;
        amount1 = (liquidity * balance1) / _totalSupply;
        // （这里用 balance 或 reserve 都行，但 V2 用 balance 是为了处理 fee/tokens 直接转入等情况；你按 balance 写会更贴近真实）
        require(amount0 > 0 && amount1 > 0, "INSUFFICIENT_LIQUIDITY_BURNED");

        // 更新 LP 状态：
        _burn(address(this), liquidity);
        // 转出 token：
        IERC20(token0).transfer(to, amount0);
        IERC20(token1).transfer(to, amount1);

        // 重新读 balance0/balance1（转出后）
        uint256 newBalance0 = IERC20(token0).balanceOf(address(this));
        uint256 newBalance1 = IERC20(token1).balanceOf(address(this));

        _update(newBalance0, newBalance1);
        // emit Burn(...)（建议）
        emit Burn(msg.sender, amount0, amount1, to);
        return (amount0, amount1);
    }

    function swap(uint256 amount0Out, uint256 amount1Out, address to) external {
        require(to != token0 && to != token1, "INVALID_TO");

        // 读取 reserves：_reserve0, _reserve1
        uint112 _reserve0 = reserve0;
        uint112 _reserve1 = reserve1;

        // 1️⃣ 校验 amountOut 合法
        require(amount0Out > 0 || amount1Out > 0, "INSUFFICIENT_OUTPUT");
        require(
            amount0Out < _reserve0 && amount1Out < _reserve1,
            "INSUFFICIENT_LIQUIDITY"
        );
        require(
            (amount0Out > 0 && amount1Out == 0) ||
                (amount0Out == 0 && amount1Out > 0),
            "INVALID_OUTPUT"
        );

        // 2️⃣ 乐观转出 token（optimistic transfer）
        if (amount0Out > 0) IERC20(token0).transfer(to, amount0Out);
        if (amount1Out > 0) IERC20(token1).transfer(to, amount1Out);
        // 3️⃣ 读取新的 balance
        uint256 balance0 = IERC20(token0).balanceOf(address(this));
        uint256 balance1 = IERC20(token1).balanceOf(address(this));
        // 4️⃣ 反推 amountIn
        uint256 amount0In = balance0 > (_reserve0 - amount0Out)
            ? balance0 - (_reserve0 - amount0Out)
            : 0;

        uint256 amount1In = balance1 > (_reserve1 - amount1Out)
            ? balance1 - (_reserve1 - amount1Out)
            : 0;

        require(amount0In > 0 || amount1In > 0, "INSUFFICIENT_INPUT");

        require(balance0 * 1000 >= amount0In * 3, "FEE_UNDERFLOW");
        require(balance1 * 1000 >= amount1In * 3, "FEE_UNDERFLOW");

        // 5️⃣ 手续费 + 不变量校验
        uint256 balance0Adjusted = balance0 * 1000 - amount0In * 3;
        uint256 balance1Adjusted = balance1 * 1000 - amount1In * 3;
        require(
            balance0Adjusted * balance1Adjusted >=
                uint256(_reserve0) * uint256(_reserve1) * 1000 ** 2,
            "K"
        );
        // 6️⃣ _update
        _update(balance0, balance1);
        // 7️⃣ emit Swap
        emit Swap(msg.sender, amount0In, amount1In, amount0Out, amount1Out, to);
    }

    function _update(uint256 balance0, uint256 balance1) internal {
        require(balance0 <= type(uint112).max, "OVERFLOW");
        require(balance1 <= type(uint112).max, "OVERFLOW");

        reserve0 = uint112(balance0);
        reserve1 = uint112(balance1);
        blockTimestampLast = uint32(block.timestamp % 2 ** 32);
    }

    function sqrt(uint256 y) internal pure returns (uint256 z) {
        if (y > 3) {
            z = y;
            uint256 x = y / 2 + 1;
            while (x < z) {
                z = x;
                x = (y / x + x) / 2;
            }
        } else if (y != 0) {
            z = 1;
        }
    }

    function min(uint256 x, uint256 y) internal pure returns (uint256 z) {
        z = x < y ? x : y;
    }
}
