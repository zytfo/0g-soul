import { defineChain } from 'viem';

/** 0G Galileo testnet (chain ID 16602). Not in wagmi's default chain list. */
export const galileo = defineChain({
  id: 16602,
  name: '0G Galileo Testnet',
  nativeCurrency: { name: '0G', symbol: '0G', decimals: 18 },
  rpcUrls: { default: { http: ['https://evmrpc-testnet.0g.ai'] } },
  blockExplorers: { default: { name: '0G Scan', url: 'https://chainscan-galileo.0g.ai' } },
  testnet: true,
});

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
