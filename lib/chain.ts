/** Re-exports for backward compatibility — prefer `lib/networks.ts` for new code. */
export {
  galileo,
  aristotle,
  NETWORKS,
  parseNetwork,
  networkFromChainId,
  contractAddress,
  contractAddressForChain,
  explorerTx,
  type NetworkId,
} from './networks';

export const CONTRACT_ADDRESS = (process.env.NEXT_PUBLIC_CONTRACT_ADDRESS ||
  '0x956C346365e0D538cA5c6DB071B7a83F9c57E656') as `0x${string}`;

/** SoulINFT (ERC-7857) ABI — typed const covering all frontend-used fragments. */
export const SOUL_ABI = [
  {
    type: 'function',
    name: 'mint',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'publicURI', type: 'string' },
      { name: 'encryptedURI', type: 'string' },
      { name: 'metadataHash', type: 'bytes32' },
      { name: 'sealedKey', type: 'bytes' },
    ],
    outputs: [{ name: 'tokenId', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'setMemory',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'tokenId', type: 'uint256' },
      { name: 'encryptedURI', type: 'string' },
      { name: 'metadataHash', type: 'bytes32' },
      { name: 'sealedKey', type: 'bytes' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'setPublicProfile',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'tokenId', type: 'uint256' },
      { name: 'publicURI', type: 'string' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'transfer',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'from', type: 'address' },
      { name: 'to', type: 'address' },
      { name: 'tokenId', type: 'uint256' },
      { name: 'sealedKey', type: 'bytes' },
      { name: 'proof', type: 'bytes' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'clone',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'tokenId', type: 'uint256' },
      { name: 'sealedKey', type: 'bytes' },
      { name: 'proof', type: 'bytes' },
    ],
    outputs: [{ name: 'newId', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'authorizeUsage',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'tokenId', type: 'uint256' },
      { name: 'executor', type: 'address' },
      { name: 'permissions', type: 'bytes' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'publicURIOf',
    stateMutability: 'view',
    inputs: [{ name: 't', type: 'uint256' }],
    outputs: [{ name: '', type: 'string' }],
  },
  {
    type: 'function',
    name: 'encryptedURIOf',
    stateMutability: 'view',
    inputs: [{ name: 't', type: 'uint256' }],
    outputs: [{ name: '', type: 'string' }],
  },
  {
    type: 'function',
    name: 'metadataHashOf',
    stateMutability: 'view',
    inputs: [{ name: 't', type: 'uint256' }],
    outputs: [{ name: '', type: 'bytes32' }],
  },
  {
    type: 'function',
    name: 'sealedKeyOf',
    stateMutability: 'view',
    inputs: [{ name: 't', type: 'uint256' }],
    outputs: [{ name: '', type: 'bytes' }],
  },
  {
    type: 'function',
    name: 'ownerOf',
    stateMutability: 'view',
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    outputs: [{ name: '', type: 'address' }],
  },
  {
    type: 'function',
    name: 'nextId',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'event',
    name: 'AgentMinted',
    inputs: [
      { name: 'tokenId', type: 'uint256', indexed: true },
      { name: 'owner', type: 'address', indexed: true },
      { name: 'publicURI', type: 'string', indexed: false },
      { name: 'encryptedURI', type: 'string', indexed: false },
    ],
  },
] as const;
