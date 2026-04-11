// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract GelecekArsaNFT is ERC721, Ownable {
    uint256 private _nextTokenId;

    mapping(uint256 => string) private _landIds;      // tokenId -> "N1", "T42"
    mapping(string => uint256) private _landToToken;   // "N1" -> tokenId

    constructor() ERC721("GelecekArsa", "GARSA") Ownable(msg.sender) {}

    /// Platform backend mint eder (sadece owner)
    function mintLand(address to, string calldata landId) external onlyOwner returns (uint256) {
        require(_landToToken[landId] == 0, "Land already minted");
        _nextTokenId++;
        uint256 tokenId = _nextTokenId;
        _mint(to, tokenId);
        _landIds[tokenId] = landId;
        _landToToken[landId] = tokenId;
        return tokenId;
    }

    /// Platform backend transfer eder (kullanicilarin gas odemesine gerek yok)
    function transferLand(address from, address to, uint256 tokenId) external onlyOwner {
        _transfer(from, to, tokenId);
    }

    function getLandId(uint256 tokenId) external view returns (string memory) {
        return _landIds[tokenId];
    }

    function getTokenByLandId(string calldata landId) external view returns (uint256) {
        return _landToToken[landId];
    }

    function totalMinted() external view returns (uint256) {
        return _nextTokenId;
    }
}
