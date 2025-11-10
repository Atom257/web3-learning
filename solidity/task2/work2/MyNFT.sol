// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract MyNFT is ERC721URIStorage, Ownable {
    // 状态变量：用于记录下一个将被铸造的 NFT 的 ID
    uint public _nextTokenId;

    // 构造函数：设置 NFT 名称和符号，并初始化 owner
    constructor() ERC721("MyNFT", "MNFT") Ownable(msg.sender) {}

    // 铸造函数：允许 owner 铸造 NFT，并绑定元数据 URI
    function mintNFT(address to, string memory uri) public onlyOwner {
        require(to != address(0), "Invalid address");
        require(bytes(uri).length > 0, "Invalid token URI");

        uint256 tokenId = _nextTokenId++;
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, uri);
    }
}
