// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";

import "../../src/dex/core/DexFactory.sol";
import "../../src/dex/core/DexPair.sol";
import "../../src/dex/core/DexRouter.sol";
import "../../src/token/TokenLauncher.sol";
import "../../src/token/MockERC20.sol";

contract DexPairTest is Test {
    DexFactory factory;
    DexPair pair;
    TokenLauncher launcher;

    MockERC20 tokenA;
    MockERC20 tokenB;

    address alice = address(0xA11CE);
    address bob = address(0xB0B);

    function setUp() public {
        // 1. 部署 TokenLauncher
        launcher = new TokenLauncher();

        // 2. 创建两个 ERC20
        address tokenAAddr = launcher.createToken("TokenA", "A");
        address tokenBAddr = launcher.createToken("TokenB", "B");

        tokenA = MockERC20(tokenAAddr);
        tokenB = MockERC20(tokenBAddr);

        // 3. 给 alice 一些 token
        launcher.mintToken(0, alice, 1_000 ether);
        launcher.mintToken(1, alice, 1_000 ether);

        // 4. 部署 Factory
        factory = new DexFactory();

        // 5. 创建 Pair
        address pairAddr = factory.createPair(tokenAAddr, tokenBAddr);
        pair = DexPair(pairAddr);
    }

    function testMintInitialLiquidity() public {
        // alice 向 Pair 转入 token
        vm.startPrank(alice);
        tokenA.transfer(address(pair), 100 ether);
        tokenB.transfer(address(pair), 100 ether);

        uint256 liquidity = pair.mint(alice);
        vm.stopPrank();

        // 1. LP 被铸造
        assertGt(liquidity, 0);

        // 2. totalSupply > MINIMUM_LIQUIDITY
        assertGt(pair.totalSupply(), liquidity);

        // 3. reserves 更新正确
        (uint112 r0, uint112 r1, ) = pair.getReserves();
        assertEq(r0, 100 ether);
        assertEq(r1, 100 ether);

        // 4. alice 拿到 LP
        assertEq(pair.balanceOf(alice), liquidity);
    }

    function testSwapKDoesNotDecrease() public {
        // 1. alice 提供流动性
        vm.startPrank(alice);
        tokenA.transfer(address(pair), 100 ether);
        tokenB.transfer(address(pair), 100 ether);
        pair.mint(alice);
        vm.stopPrank();

        // 2. 记录 swap 前的 k
        (uint112 r0Before, uint112 r1Before, ) = pair.getReserves();
        uint256 kBefore = uint256(r0Before) * uint256(r1Before);

        // 3. 给 bob 一些 tokenA
        launcher.mintToken(0, bob, 10 ether);

        // 4. bob 用 tokenA 换 tokenB
        vm.startPrank(bob);
        tokenA.transfer(address(pair), 10 ether);

        // 假设我们想要换出 5 ether 的 tokenB（随便给一个合理值）
        pair.swap(0, 5 ether, bob);
        vm.stopPrank();

        // 5. 记录 swap 后的 k
        (uint112 r0After, uint112 r1After, ) = pair.getReserves();
        uint256 kAfter = uint256(r0After) * uint256(r1After);

        // 6. 核心断言：k 不减
        assertGe(kAfter, kBefore);
    }

    function testSwapAccruesFeesToLP_correct() public {
        // 1. alice 提供流动性
        vm.startPrank(alice);
        tokenA.transfer(address(pair), 100 ether);
        tokenB.transfer(address(pair), 100 ether);
        pair.mint(alice);
        vm.stopPrank();

        // 2. bob swap
        launcher.mintToken(0, bob, 10 ether);
        vm.startPrank(bob);
        tokenA.transfer(address(pair), 10 ether);
        pair.swap(0, 5 ether, bob);
        vm.stopPrank();

        // 3. alice burn
        vm.startPrank(alice);
        uint256 lp = pair.balanceOf(alice);
        pair.transfer(address(pair), lp);
        (uint256 amount0, uint256 amount1) = pair.burn(alice);
        vm.stopPrank();

        // 4. 用 pool 当前价格计算“价值”
        // price ≈ reserve1 / reserve0
        (uint112 r0, uint112 r1, ) = pair.getReserves();
        uint256 valueInToken1 = amount1 + (amount0 * r1) / r0;

        // 初始价值是 100 tokenB + 100 tokenA
        uint256 initialValue = 200 ether;

        assertGt(valueInToken1, initialValue);
    }

    function testAddLiquidityOptimalAmounts() public {
        // 部署 Router
        DexRouter router = new DexRouter(address(factory));

        // alice 初始加池
        vm.startPrank(alice);
        tokenA.approve(address(router), type(uint256).max);
        tokenB.approve(address(router), type(uint256).max);

        router.addLiquidity(
            address(tokenA),
            address(tokenB),
            100 ether,
            100 ether,
            0,
            0,
            alice
        );
        vm.stopPrank();

        // bob 再加池（非 1:1 比例）
        launcher.mintToken(0, bob, 100 ether);
        launcher.mintToken(1, bob, 10 ether);

        vm.startPrank(bob);
        tokenA.approve(address(router), type(uint256).max);
        tokenB.approve(address(router), type(uint256).max);

        (uint256 amountA, uint256 amountB, ) = router.addLiquidity(
            address(tokenA),
            address(tokenB),
            100 ether, // 想加很多 A
            10 ether, // B 不够
            0,
            0,
            bob
        );
        vm.stopPrank();

        // 断言：没有白送资产（按池子比例 1:1）
        assertEq(amountB, 10 ether);
        assertEq(amountA, 10 ether);
    }
    function testRouterSwapExactTokensForTokens() public {
        DexRouter router = new DexRouter(address(factory));

        // alice 加池
        vm.startPrank(alice);
        tokenA.approve(address(router), type(uint256).max);
        tokenB.approve(address(router), type(uint256).max);

        router.addLiquidity(
            address(tokenA),
            address(tokenB),
            100 ether,
            100 ether,
            0,
            0,
            alice
        );
        vm.stopPrank();

        // bob swap
        launcher.mintToken(0, bob, 10 ether);

        vm.startPrank(bob);
        tokenA.approve(address(router), type(uint256).max);

        uint256 out = router.swapExactTokensForTokens(
            address(tokenA),
            address(tokenB),
            10 ether,
            0,
            bob
        );
        vm.stopPrank();

        // bob 收到 tokenB
        assertGt(out, 0);
        assertEq(tokenB.balanceOf(bob), out);
    }
}
