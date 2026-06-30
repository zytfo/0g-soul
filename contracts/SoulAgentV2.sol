// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

contract SoulAgentV2 is ERC721 {
    using Strings for uint256;
    uint256 public nextId;
    mapping(uint256 => string) private _memory;

    event AgentMinted(uint256 indexed tokenId, address indexed owner, string rootHash);
    event MemoryUpdated(uint256 indexed tokenId, string rootHash);

    constructor() ERC721("Soul Agent", "SOUL") {}

    function mint(string calldata rootHash) external returns (uint256 tokenId) {
        tokenId = ++nextId;
        _safeMint(msg.sender, tokenId);
        _memory[tokenId] = rootHash;
        emit AgentMinted(tokenId, msg.sender, rootHash);
    }

    function setMemory(uint256 tokenId, string calldata rootHash) external {
        require(ownerOf(tokenId) == msg.sender, "not token owner");
        _memory[tokenId] = rootHash;
        emit MemoryUpdated(tokenId, rootHash);
    }

    function memoryOf(uint256 tokenId) external view returns (string memory) {
        return _memory[tokenId];
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        ownerOf(tokenId); // reverts ERC721NonexistentToken if not minted
        return string.concat("https://0g-soul.vercel.app/api/nft/", tokenId.toString());
    }
}
