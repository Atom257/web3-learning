// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./MockERC20.sol";
import "openzeppelin-contracts/contracts/access/Ownable.sol";

contract TokenLauncher is Ownable {
    address[] public tokens;

    event TokenCreated(uint256 indexed tokenId, address indexed token);

    event TokenMinted(uint256 indexed tokenId, address indexed to, uint256 amount);

    constructor() Ownable(msg.sender) {}

    function createToken(string calldata name, string calldata symbol) external onlyOwner returns (address) {
        MockERC20 token = new MockERC20(name, symbol, address(this));
        tokens.push(address(token));

        emit TokenCreated(tokens.length - 1, address(token));
        return address(token);
    }

    function mintToken(uint256 tokenId, address to, uint256 value) external onlyOwner {
        require(tokenId < tokens.length, "invalid tokenId");
        MockERC20(tokens[tokenId]).mint(to, value);

        emit TokenMinted(tokenId, to, value);
    }

    function getToken(uint256 tokenId) external view returns (address token, string memory name, string memory symbol) {
        token = tokens[tokenId];
        name = ERC20(token).name();
        symbol = ERC20(token).symbol();
    }

    function tokenCount() external view returns (uint256) {
        return tokens.length;
    }
}
