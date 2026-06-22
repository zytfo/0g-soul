// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

/// @title SoulAgent
/// @notice ERC-721 where each token points to its AI companion's memory blob
///         stored on 0G Storage (referenced by root hash). The token holder
///         owns and updates the pointer.
contract SoulAgent is ERC721 {
    uint256 public nextId;
    mapping(uint256 => string) private _memory;

    event AgentMinted(uint256 indexed tokenId, address indexed owner, string rootHash);
    event MemoryUpdated(uint256 indexed tokenId, string rootHash);

    constructor() ERC721("Soul Agent", "SOUL") {}

    /// @notice Mint a new agent to the caller, pointing at its initial memory root hash.
    function mint(string calldata rootHash) external returns (uint256 tokenId) {
        tokenId = ++nextId;
        _safeMint(msg.sender, tokenId);
        _memory[tokenId] = rootHash;
        emit AgentMinted(tokenId, msg.sender, rootHash);
    }

    /// @notice Update an agent's memory pointer. Only the token holder may call.
    function setMemory(uint256 tokenId, string calldata rootHash) external {
        require(ownerOf(tokenId) == msg.sender, "not token owner");
        _memory[tokenId] = rootHash;
        emit MemoryUpdated(tokenId, rootHash);
    }

    /// @notice Read an agent's current memory root hash.
    function memoryOf(uint256 tokenId) external view returns (string memory) {
        return _memory[tokenId];
    }
}
