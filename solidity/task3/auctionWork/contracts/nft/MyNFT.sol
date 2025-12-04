// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MyNFT
 * @dev 简略的 ERC721 NFT 合约，支持铸造和转移
 */
contract MyNFT is ERC721, Ownable {
    // Token ID 计数器
    uint256 private _tokenIdCounter;
    
    // 基础 URI（用于 tokenURI）
    string private _baseTokenURI;
    
    /**
     * @dev 构造函数
     * @param name NFT 名称
     * @param symbol NFT 符号
     * @param baseTokenURI 基础 URI（用于 tokenURI）
     */
    constructor(
        string memory name,
        string memory symbol,
        string memory baseTokenURI
    ) ERC721(name, symbol) Ownable(msg.sender) {
        _baseTokenURI = baseTokenURI;
    }
    
    /**
     * @notice 铸造 NFT 给指定地址
     * @param to 接收 NFT 的地址
     * @return tokenId 新铸造的 NFT token ID
     */
    function mint(address to) public onlyOwner returns (uint256) {
        _tokenIdCounter++;
        uint256 tokenId = _tokenIdCounter;
        _safeMint(to, tokenId);
        return tokenId;
    }
    
    /**
     * @notice 批量铸造 NFT
     * @param to 接收 NFT 的地址
     * @param amount 铸造数量
     */
    function mintBatch(address to, uint256 amount) public onlyOwner {
        for (uint256 i = 0; i < amount; i++) {
            mint(to);
        }
    }
    
    /**
     * @notice 设置基础 URI
     * @param baseTokenURI 新的基础 URI
     */
    function setBaseURI(string memory baseTokenURI) public onlyOwner {
        _baseTokenURI = baseTokenURI;
    }
    
    /**
     * @notice 获取 token URI
     * @param tokenId Token ID
     * @return Token URI
     */
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        _requireOwned(tokenId);
        return string(abi.encodePacked(_baseTokenURI, _toString(tokenId)));
    }
    
    /**
     * @notice 获取当前总供应量
     * @return 已铸造的 NFT 总数
     */
    function totalSupply() public view returns (uint256) {
        return _tokenIdCounter;
    }
    
    /**
     * @dev 将 uint256 转换为字符串
     */
    function _toString(uint256 value) internal pure returns (string memory) {
        if (value == 0) {
            return "0";
        }
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
            value /= 10;
        }
        return string(buffer);
    }
}

