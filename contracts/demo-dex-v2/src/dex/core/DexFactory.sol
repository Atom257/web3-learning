// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./DexPair.sol";

contract DexFactory {
    mapping(address => mapping(address => address)) public getPair;
    address[] public allPairs;

    event PairCreated(address indexed token0, address indexed token1, address pair, uint256 pairIndex);

    function createPair(address tokenA, address tokenB) external returns (address pair) {
        address token0;
        address token1;

        (token0, token1) = _sortTokens(tokenA, tokenB);
        require(getPair[token0][token1] == address(0), "PAIR_EXISTS");
        //   5. deploy Pair
        DexPair dexPair = new DexPair(address(this));
        //   6. Pair.initialize(token0, token1)
        dexPair.initialize(token0, token1);
        //   7. getPair[token0][token1] = pair
        pair = address(dexPair);
        getPair[token0][token1] = pair;
        getPair[token1][token0] = pair;
        //   8. allPairs.push(pair)
        allPairs.push(address(dexPair));
        //   9. emit PairCreated
        emit PairCreated(token0, token1, pair, allPairs.length - 1);
    }

    function _sortTokens(address tokenA, address tokenB) internal pure returns (address token0, address token1) {
        require(tokenA != tokenB, "IDENTICAL_ADDRESSES");
        require(tokenA != address(0), "ZERO_ADDRESS");
        (token0, token1) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);
    }
}
