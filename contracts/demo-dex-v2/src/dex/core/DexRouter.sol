// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";

interface IDexFactory {
    function getPair(
        address tokenA,
        address tokenB
    ) external view returns (address);
    function createPair(
        address tokenA,
        address tokenB
    ) external returns (address pair);
}

interface IDexPair {
    function token0() external view returns (address);
    function token1() external view returns (address);
    function getReserves()
        external
        view
        returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast);
    function mint(address to) external returns (uint256 liquidity);
    function swap(uint256 amount0Out, uint256 amount1Out, address to) external;
}

contract DexRouter {
    IDexFactory public immutable factory;

    constructor(address factory_) {
        factory = IDexFactory(factory_);
    }

    // --- helpers ---

    function _sort(
        address tokenA,
        address tokenB
    ) internal pure returns (address token0, address token1) {
        require(tokenA != tokenB, "IDENTICAL");
        (token0, token1) = tokenA < tokenB
            ? (tokenA, tokenB)
            : (tokenB, tokenA);
        require(token0 != address(0), "ZERO");
    }

    function _pairFor(
        address tokenA,
        address tokenB
    ) internal returns (address pair) {
        pair = factory.getPair(tokenA, tokenB);
        if (pair == address(0)) {
            pair = factory.createPair(tokenA, tokenB);
        }
    }

    function quote(
        uint256 amountA,
        uint112 reserveA,
        uint112 reserveB
    ) public pure returns (uint256 amountB) {
        require(amountA > 0, "INSUFFICIENT_AMOUNT");
        require(reserveA > 0 && reserveB > 0, "INSUFFICIENT_LIQUIDITY");
        amountB = (amountA * uint256(reserveB)) / uint256(reserveA);
    }

    function _getReservesFor(
        address pair,
        address tokenA,
        address tokenB
    ) internal view returns (uint112 reserveA, uint112 reserveB) {
        (uint112 r0, uint112 r1, ) = IDexPair(pair).getReserves();
        (address token0, ) = _sort(tokenA, tokenB);
        if (tokenA == token0) {
            (reserveA, reserveB) = (r0, r1);
        } else {
            (reserveA, reserveB) = (r1, r0);
        }
    }
    function getAmountOut(
        uint256 amountIn,
        uint112 reserveIn,
        uint112 reserveOut
    ) public pure returns (uint256 amountOut) {
        require(amountIn > 0, "INSUFFICIENT_INPUT");
        require(reserveIn > 0 && reserveOut > 0, "INSUFFICIENT_LIQUIDITY");

        uint256 amountInWithFee = amountIn * 997;
        uint256 numerator = amountInWithFee * reserveOut;
        uint256 denominator = uint256(reserveIn) * 1000 + amountInWithFee;
        amountOut = numerator / denominator;
    }

    // --- Step R1: addLiquidity only ---

    function addLiquidity(
        address tokenA,
        address tokenB,
        uint256 amountADesired,
        uint256 amountBDesired,
        uint256 amountAMin,
        uint256 amountBMin,
        address to
    ) external returns (uint256 amountA, uint256 amountB, uint256 liquidity) {
        require(to != address(0), "ZERO_TO");
        require(amountADesired > 0 && amountBDesired > 0, "ZERO_DESIRED");

        address pair = _pairFor(tokenA, tokenB);

        // 1) read reserves in A/B order
        (uint112 reserveA, uint112 reserveB) = _getReservesFor(
            pair,
            tokenA,
            tokenB
        );

        // 2) compute optimal amounts
        // TODO:
        if (reserveA == 0 && reserveB == 0) {
            require(amountADesired >= amountAMin, "INSUFFICIENT_A_AMOUNT");
            require(amountBDesired >= amountBMin, "INSUFFICIENT_B_AMOUNT");
            (amountA, amountB) = (amountADesired, amountBDesired);
        } else {
            uint256 amountBOptimal = quote(amountADesired, reserveA, reserveB);
            if (amountBOptimal <= amountBDesired) {
                require(amountBOptimal >= amountBMin, "INSUFFICIENT_B_AMOUNT");
                amountA = amountADesired;
                amountB = amountBOptimal;
            } else {
                uint256 amountAOptimal = quote(
                    amountBDesired,
                    reserveB,
                    reserveA
                );
                require(amountAOptimal <= amountADesired, "EXCESSIVE_A_AMOUNT");
                require(amountAOptimal >= amountAMin, "INSUFFICIENT_A_AMOUNT");
                amountA = amountAOptimal;
                amountB = amountBDesired;
            }
        }

        // 3) transfer tokens from user to pair
        IERC20(tokenA).transferFrom(msg.sender, pair, amountA);
        IERC20(tokenB).transferFrom(msg.sender, pair, amountB);

        // 4) mint LP to `to`
        liquidity = IDexPair(pair).mint(to);

        // 5) slippage bounds (min checks should be applied above when choosing amounts)
        return (amountA, amountB, liquidity);
    }
    function swapExactTokensForTokens(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 amountOutMin,
        address to
    ) external returns (uint256 amountOut) {
        require(tokenIn != tokenOut, "IDENTICAL");
        require(to != address(0), "ZERO_TO");

        address pair = factory.getPair(tokenIn, tokenOut);
        require(pair != address(0), "PAIR_NOT_EXISTS");

        // 1) read reserves in in/out order
        (uint112 reserveIn, uint112 reserveOut) = _getReservesFor(
            pair,
            tokenIn,
            tokenOut
        );

        // 2) compute output
        amountOut = getAmountOut(amountIn, reserveIn, reserveOut);
        require(amountOut >= amountOutMin, "INSUFFICIENT_OUTPUT");

        // 3) move input to pair
        IERC20(tokenIn).transferFrom(msg.sender, pair, amountIn);

        // 4) call pair.swap (指定输出)
        (address token0, ) = _sort(tokenIn, tokenOut);
        if (tokenIn == token0) {
            // tokenIn is token0 → amount1Out
            IDexPair(pair).swap(0, amountOut, to);
        } else {
            // tokenIn is token1 → amount0Out
            IDexPair(pair).swap(amountOut, 0, to);
        }

        return amountOut;
    }
}
