// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../../src/token/TokenLauncher.sol";
import "../../src/token/MockERC20.sol";

contract TokenLauncherTest is Test {
    TokenLauncher launcher;

    address owner = address(0x1);
    address alice = address(0x2);

    function setUp() public {
        vm.prank(owner);
        launcher = new TokenLauncher();
    }

    function testCreateToken() public {
        vm.prank(owner);
        address tokenAddr = launcher.createToken("Test Token", "TT");

        assertEq(launcher.tokenCount(), 1);
        assertTrue(tokenAddr != address(0));

        MockERC20 token = MockERC20(tokenAddr);
        assertEq(token.name(), "Test Token");
        assertEq(token.symbol(), "TT");
        assertEq(token.decimals(), 18);
    }

    function testCreateTokenEmitEvent() public {
        vm.prank(owner);

        // 只校验 indexed 的 tokenId，其它一律不校验
        vm.expectEmit(true, false, false, false);
        emit TokenLauncher.TokenCreated(0, address(0));

        launcher.createToken("Event Token", "EVT");
    }

    function testMintToken() public {
        vm.startPrank(owner);
        address tokenAddr = launcher.createToken("Mint Token", "MINT");
        launcher.mintToken(0, alice, 100 ether);
        vm.stopPrank();

        MockERC20 token = MockERC20(tokenAddr);
        assertEq(token.balanceOf(alice), 100 ether);
    }

    function testMintTokenEmitEvent() public {
        vm.startPrank(owner);
        launcher.createToken("Mint Event", "ME");

        vm.expectEmit(true, true, false, true);
        emit TokenLauncher.TokenMinted(0, alice, 50 ether);
        launcher.mintToken(0, alice, 50 ether);
        vm.stopPrank();
    }

    function testGetToken() public {
        vm.prank(owner);
        launcher.createToken("Query Token", "QT");

        (address tokenAddr, string memory name, string memory symbol) = launcher.getToken(0);

        assertEq(name, "Query Token");
        assertEq(symbol, "QT");
        assertTrue(tokenAddr != address(0));
    }

    function testOnlyOwnerCanCreateToken() public {
        vm.prank(alice);
        vm.expectRevert();
        launcher.createToken("Fail Token", "FAIL");
    }

    function testOnlyOwnerCanMintToken() public {
        vm.prank(owner);
        launcher.createToken("Auth Token", "AUTH");

        vm.prank(alice);
        vm.expectRevert();
        launcher.mintToken(0, alice, 1 ether);
    }

    function testMintInvalidTokenIdReverts() public {
        vm.prank(owner);
        vm.expectRevert("invalid tokenId");
        launcher.mintToken(0, alice, 1 ether);
    }
}
