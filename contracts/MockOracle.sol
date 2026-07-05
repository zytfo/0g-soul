// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @notice Testnet stand-in for the 0G ERC-7857 TEE/ZKP oracle (no public oracle on Galileo).
///         A production deployment swaps this for the real attestation-verifying oracle.
contract MockOracle {
    function verifyProof(bytes calldata proof) external pure returns (bool) {
        return proof.length > 0;
    }
}
