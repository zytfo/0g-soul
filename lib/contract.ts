'use client';

import { useWriteContract, useReadContract } from 'wagmi';
import { decodeEventLog } from 'viem';
import type { TransactionReceipt } from 'viem';
import { CONTRACT_ADDRESS, SOUL_ABI } from './chain';

/** Mint a new agent pointing at its initial memory root hash. */
export function useMintAgent() {
  const { writeContractAsync, isPending } = useWriteContract();
  const mint = (rootHash: string) =>
    writeContractAsync({
      address: CONTRACT_ADDRESS,
      abi: SOUL_ABI,
      functionName: 'mint',
      args: [rootHash],
    });
  return { mint, isPending };
}

/** Update an existing agent's memory pointer (must be the token owner). */
export function useSetMemory() {
  const { writeContractAsync, isPending } = useWriteContract();
  const setMemory = (tokenId: bigint, rootHash: string) =>
    writeContractAsync({
      address: CONTRACT_ADDRESS,
      abi: SOUL_ABI,
      functionName: 'setMemory',
      args: [tokenId, rootHash],
    });
  return { setMemory, isPending };
}

/** Read an agent's current memory root hash by tokenId. */
export function useMemoryOf(tokenId: bigint | undefined) {
  return useReadContract({
    address: CONTRACT_ADDRESS,
    abi: SOUL_ABI,
    functionName: 'memoryOf',
    args: tokenId !== undefined ? [tokenId] : undefined,
    query: { enabled: tokenId !== undefined },
  });
}

/** Read the on-chain owner of a tokenId (reverts for nonexistent → undefined). */
export function useOwnerOf(tokenId: bigint | undefined) {
  return useReadContract({
    address: CONTRACT_ADDRESS,
    abi: SOUL_ABI,
    functionName: 'ownerOf',
    args: tokenId !== undefined ? [tokenId] : undefined,
    query: { enabled: tokenId !== undefined },
  });
}

/** Pull the new tokenId from an AgentMinted event in a mint tx receipt. */
export function tokenIdFromReceipt(receipt: TransactionReceipt): bigint | undefined {
  for (const log of receipt.logs) {
    if (log.address.toLowerCase() !== CONTRACT_ADDRESS.toLowerCase()) continue;
    try {
      const parsed = decodeEventLog({ abi: SOUL_ABI, data: log.data, topics: log.topics });
      if (parsed.eventName === 'AgentMinted') {
        return (parsed.args as { tokenId: bigint }).tokenId;
      }
    } catch {
      // not our event — skip
    }
  }
  return undefined;
}
