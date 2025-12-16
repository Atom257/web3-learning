// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/MemeFactory.sol";
import "../src/MemeToken.sol";
import "../src/MemeVesting.sol";

contract MemeLaunchTest is Test {
    MemeFactory factory;
    MemeToken token;
    MemeVesting vesting;

    address admin = address(this);
    address project = address(0xBEEF);

    function setUp() public {
        factory = new MemeFactory();
    }

    function test_full_meme_launch_flow() public {
        // 1️⃣ deploy token
        address tokenAddr = factory.deployToken(
            "MyMeme",
            "MEME",
            1_000_000 ether
        );
        token = MemeToken(tokenAddr);

        // 2️⃣ launch 前不能转账
        vm.expectRevert();
        token.transfer(project, 1 ether);

        // 3️⃣ 创建 vesting（锁 30%）
        address vestingAddr = factory.createVesting(
            tokenAddr,
            project,
            300_000 ether,
            30 days
        );
        vesting = MemeVesting(vestingAddr);

        // 4️⃣ 非 admin 不能 launch
        vm.prank(project);
        vm.expectRevert();
        factory.launchToken(tokenAddr);

        // 5️⃣ admin launch
        factory.launchToken(tokenAddr);

        // 6️⃣ launch 后可以转账（由 Factory 转）
        vm.prank(address(factory));
        token.transfer(project, 1 ether);
        assertEq(token.balanceOf(project), 1 ether);

        // 7️⃣ vesting 初期不能全部领取
        vm.prank(project);
        vm.expectRevert();
        vesting.claim();

        // 8️⃣ 时间快进一半
        vm.warp(block.timestamp + 15 days);

        vm.prank(project);
        vesting.claim();

        uint256 claimed = token.balanceOf(project);
        assertGt(claimed, 1 ether); // 说明领到了 vesting
        assertLt(claimed, 300_000 ether); // 说明不是一次性
    }
}
