// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

interface IOracle {
    function verifyProof(bytes calldata proof) external view returns (bool);
}

/// @title SoulINFT — an ERC-7857 Intelligent NFT for AI companions on 0G.
/// @notice Public profile (name/personality/avatar) is plaintext on 0G Storage; the private
///         memory is AES-encrypted on 0G Storage with a per-owner sealed key. Transfer clears
///         the private memory (no TEE re-encryption) — the character transfers, the memory stays.
contract SoulINFT is ERC721 {
    using Strings for uint256;

    uint256 public nextId;
    IOracle public oracle;

    struct Meta {
        string publicURI;      // 0G Storage root hash of the public profile (plaintext)
        string encryptedURI;   // 0G Storage root hash of the encrypted private memory
        bytes32 metadataHash;  // keccak256 of the private memory plaintext (integrity)
        bytes sealedKey;       // AES key sealed to the current owner
    }
    mapping(uint256 => Meta) private _meta;

    event AgentMinted(uint256 indexed tokenId, address indexed owner, string publicURI, string encryptedURI);
    event MemoryUpdated(uint256 indexed tokenId, string encryptedURI, bytes32 metadataHash);
    event PublicProfileUpdated(uint256 indexed tokenId, string publicURI);
    event AgentTransferred(uint256 indexed tokenId, address indexed from, address indexed to);
    event UsageAuthorized(uint256 indexed tokenId, address indexed executor);

    constructor(address _oracle) ERC721("Soul INFT", "SOUL") {
        require(_oracle != address(0), "oracle is zero");
        oracle = IOracle(_oracle);
    }

    function mint(address to, string calldata publicURI, string calldata encryptedURI, bytes32 metadataHash, bytes calldata sealedKey)
        external returns (uint256 tokenId)
    {
        tokenId = ++nextId;
        // CEI: populate metadata before _safeMint, so a contract recipient's onERC721Received
        // callback observes the fully-initialized token rather than empty fields.
        _meta[tokenId] = Meta(publicURI, encryptedURI, metadataHash, sealedKey);
        _safeMint(to, tokenId);
        emit AgentMinted(tokenId, to, publicURI, encryptedURI);
    }

    function setMemory(uint256 tokenId, string calldata encryptedURI, bytes32 metadataHash, bytes calldata sealedKey) external {
        require(ownerOf(tokenId) == msg.sender, "not owner");
        Meta storage m = _meta[tokenId];
        m.encryptedURI = encryptedURI;
        m.metadataHash = metadataHash;
        m.sealedKey = sealedKey;
        emit MemoryUpdated(tokenId, encryptedURI, metadataHash);
    }

    function setPublicProfile(uint256 tokenId, string calldata publicURI) external {
        require(ownerOf(tokenId) == msg.sender, "not owner");
        _meta[tokenId].publicURI = publicURI;
        emit PublicProfileUpdated(tokenId, publicURI);
    }

    /// @notice ERC-7857 transfer. Oracle-verified. Private memory does NOT carry over (no TEE):
    ///         the new owner inherits the public character and starts a fresh private memory.
    function transfer(address from, address to, uint256 tokenId, bytes calldata sealedKey, bytes calldata proof) external {
        require(ownerOf(tokenId) == msg.sender && msg.sender == from, "not owner");
        require(oracle.verifyProof(proof), "bad proof");
        Meta storage m = _meta[tokenId];
        m.encryptedURI = "";
        m.metadataHash = bytes32(0);
        m.sealedKey = sealedKey; // client passes empty; new owner re-keys on first save
        _safeTransfer(from, to, tokenId, "");
        emit AgentTransferred(tokenId, from, to);
    }

    function clone(address to, uint256 tokenId, bytes calldata sealedKey, bytes calldata proof) external returns (uint256 newId) {
        require(oracle.verifyProof(proof), "bad proof");
        Meta storage m = _meta[tokenId];
        newId = ++nextId;
        _safeMint(to, newId);
        _meta[newId] = Meta(m.publicURI, "", bytes32(0), sealedKey);
        emit AgentMinted(newId, to, m.publicURI, "");
    }

    function authorizeUsage(uint256 tokenId, address executor, bytes calldata) external {
        require(ownerOf(tokenId) == msg.sender, "not owner");
        emit UsageAuthorized(tokenId, executor);
    }

    function publicURIOf(uint256 t) external view returns (string memory) { return _meta[t].publicURI; }
    function encryptedURIOf(uint256 t) external view returns (string memory) { return _meta[t].encryptedURI; }
    function metadataHashOf(uint256 t) external view returns (bytes32) { return _meta[t].metadataHash; }
    function sealedKeyOf(uint256 t) external view returns (bytes memory) { return _meta[t].sealedKey; }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        ownerOf(tokenId);
        return string.concat("https://0g-soul.vercel.app/api/nft/", tokenId.toString());
    }
}
