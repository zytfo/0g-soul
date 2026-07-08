'use client';

import { useWriteContract, useReadContract, useChainId } from 'wagmi';
import { decodeEventLog, keccak256, type TransactionReceipt } from 'viem';
import { contractAddress, chainIdForNetwork, networkFromChainId, type NetworkId } from './networks';
import { SOUL_ABI } from './chain';

function resolveNetwork(network?: NetworkId, walletChainId?: number): NetworkId {
  return network ?? networkFromChainId(walletChainId);
}

export function useMint(network?: NetworkId) {
  const walletChainId = useChainId();
  const resolved = resolveNetwork(network, walletChainId);
  const address = contractAddress(resolved);
  const chainId = chainIdForNetwork(resolved);
  const { writeContractAsync } = useWriteContract();
  const mint = (to: `0x${string}`, publicURI: string, encryptedURI: string, metadataHash: `0x${string}`, sealedKey: `0x${string}`) =>
    writeContractAsync({ address, chainId, abi: SOUL_ABI, functionName: 'mint', args: [to, publicURI, encryptedURI, metadataHash, sealedKey] });
  return { mint };
}

export function useSetMemory(network?: NetworkId) {
  const walletChainId = useChainId();
  const resolved = resolveNetwork(network, walletChainId);
  const address = contractAddress(resolved);
  const chainId = chainIdForNetwork(resolved);
  const { writeContractAsync } = useWriteContract();
  const setMemory = (tokenId: bigint, encryptedURI: string, metadataHash: `0x${string}`, sealedKey: `0x${string}`) =>
    writeContractAsync({ address, chainId, abi: SOUL_ABI, functionName: 'setMemory', args: [tokenId, encryptedURI, metadataHash, sealedKey] });
  return { setMemory };
}

export function useSetPublicProfile(network?: NetworkId) {
  const walletChainId = useChainId();
  const resolved = resolveNetwork(network, walletChainId);
  const address = contractAddress(resolved);
  const chainId = chainIdForNetwork(resolved);
  const { writeContractAsync } = useWriteContract();
  const setPublicProfile = (tokenId: bigint, publicURI: string) =>
    writeContractAsync({ address, chainId, abi: SOUL_ABI, functionName: 'setPublicProfile', args: [tokenId, publicURI] });
  return { setPublicProfile };
}

export function useTransfer(network?: NetworkId) {
  const walletChainId = useChainId();
  const resolved = resolveNetwork(network, walletChainId);
  const address = contractAddress(resolved);
  const chainId = chainIdForNetwork(resolved);
  const { writeContractAsync } = useWriteContract();
  const transfer = (from: `0x${string}`, to: `0x${string}`, tokenId: bigint, sealedKey: `0x${string}`, proof: `0x${string}`) =>
    writeContractAsync({ address, chainId, abi: SOUL_ABI, functionName: 'transfer', args: [from, to, tokenId, sealedKey, proof] });
  return { transfer };
}

function useRead(fn: 'publicURIOf' | 'encryptedURIOf' | 'sealedKeyOf' | 'ownerOf', tokenId?: bigint, network?: NetworkId) {
  const walletChainId = useChainId();
  const resolved = resolveNetwork(network, walletChainId);
  const address = contractAddress(resolved);
  const chainId = chainIdForNetwork(resolved);
  return useReadContract({
    address,
    chainId,
    abi: SOUL_ABI,
    functionName: fn,
    args: tokenId !== undefined ? [tokenId] : undefined,
    query: { enabled: tokenId !== undefined },
  });
}

export const usePublicURIOf = (t?: bigint, network?: NetworkId) => useRead('publicURIOf', t, network);
export const useEncryptedURIOf = (t?: bigint, network?: NetworkId) => useRead('encryptedURIOf', t, network);
export const useSealedKeyOf = (t?: bigint, network?: NetworkId) => useRead('sealedKeyOf', t, network);
export const useOwnerOf = (t?: bigint, network?: NetworkId) => useRead('ownerOf', t, network);

export { keccak256 };

export function tokenIdFromReceipt(receipt: TransactionReceipt, contract: `0x${string}`): bigint | undefined {
  for (const log of receipt.logs) {
    if (log.address.toLowerCase() !== contract.toLowerCase()) continue;
    try {
      const parsed = decodeEventLog({ abi: SOUL_ABI, data: log.data, topics: log.topics });
      if (parsed.eventName === 'AgentMinted') return (parsed.args as { tokenId: bigint }).tokenId;
    } catch {}
  }
  return undefined;
}
