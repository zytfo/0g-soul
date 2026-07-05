'use client';

import { useWriteContract, useReadContract } from 'wagmi';
import { decodeEventLog, keccak256, type TransactionReceipt } from 'viem';
import { CONTRACT_ADDRESS, SOUL_ABI } from './chain';

export function useMint() {
  const { writeContractAsync } = useWriteContract();
  const mint = (to: `0x${string}`, publicURI: string, encryptedURI: string, metadataHash: `0x${string}`, sealedKey: `0x${string}`) =>
    writeContractAsync({ address: CONTRACT_ADDRESS, abi: SOUL_ABI, functionName: 'mint', args: [to, publicURI, encryptedURI, metadataHash, sealedKey] });
  return { mint };
}

export function useSetMemory() {
  const { writeContractAsync } = useWriteContract();
  const setMemory = (tokenId: bigint, encryptedURI: string, metadataHash: `0x${string}`, sealedKey: `0x${string}`) =>
    writeContractAsync({ address: CONTRACT_ADDRESS, abi: SOUL_ABI, functionName: 'setMemory', args: [tokenId, encryptedURI, metadataHash, sealedKey] });
  return { setMemory };
}

export function useSetPublicProfile() {
  const { writeContractAsync } = useWriteContract();
  const setPublicProfile = (tokenId: bigint, publicURI: string) =>
    writeContractAsync({ address: CONTRACT_ADDRESS, abi: SOUL_ABI, functionName: 'setPublicProfile', args: [tokenId, publicURI] });
  return { setPublicProfile };
}

export function useTransfer() {
  const { writeContractAsync } = useWriteContract();
  const transfer = (from: `0x${string}`, to: `0x${string}`, tokenId: bigint, sealedKey: `0x${string}`, proof: `0x${string}`) =>
    writeContractAsync({ address: CONTRACT_ADDRESS, abi: SOUL_ABI, functionName: 'transfer', args: [from, to, tokenId, sealedKey, proof] });
  return { transfer };
}

function useRead(fn: 'publicURIOf' | 'encryptedURIOf' | 'sealedKeyOf' | 'ownerOf', tokenId?: bigint) {
  return useReadContract({ address: CONTRACT_ADDRESS, abi: SOUL_ABI, functionName: fn, args: tokenId !== undefined ? [tokenId] : undefined, query: { enabled: tokenId !== undefined } });
}

export const usePublicURIOf = (t?: bigint) => useRead('publicURIOf', t);
export const useEncryptedURIOf = (t?: bigint) => useRead('encryptedURIOf', t);
export const useSealedKeyOf = (t?: bigint) => useRead('sealedKeyOf', t);
export const useOwnerOf = (t?: bigint) => useRead('ownerOf', t);

export { keccak256 };

export function tokenIdFromReceipt(receipt: TransactionReceipt): bigint | undefined {
  for (const log of receipt.logs) {
    if (log.address.toLowerCase() !== CONTRACT_ADDRESS.toLowerCase()) continue;
    try {
      const parsed = decodeEventLog({ abi: SOUL_ABI, data: log.data, topics: log.topics });
      if (parsed.eventName === 'AgentMinted') return (parsed.args as { tokenId: bigint }).tokenId;
    } catch {}
  }
  return undefined;
}
