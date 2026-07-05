import { createPublicClient, http } from 'viem';
import { galileo, CONTRACT_ADDRESS, SOUL_ABI } from './chain';
import { downloadMemory } from './og-storage';
import type { AgentState } from './agent-core';
import type { SoulProfile } from './soul-types';

export type SoulMeta = { name: string; personality: string; avatarRootHash?: string };

export function composeSoulMeta(tokenId: bigint, rootHash: string, state: AgentState | null): SoulMeta {
  if (rootHash && state) {
    return { name: `Soul · ${state.name}`, personality: state.personality ?? '', avatarRootHash: state.avatarRootHash };
  }
  return { name: `Soul #${tokenId}`, personality: '' };
}

export async function loadSoulMeta(tokenId: bigint): Promise<SoulMeta> {
  const client = createPublicClient({ chain: galileo, transport: http() });
  let rootHash = '';
  try {
    rootHash = (await client.readContract({
      address: CONTRACT_ADDRESS, abi: SOUL_ABI, functionName: 'memoryOf', args: [tokenId],
    })) as string;
  } catch {
    return composeSoulMeta(tokenId, '', null);
  }
  let state: AgentState | null = null;
  if (rootHash) {
    try { state = await downloadMemory(rootHash); } catch { state = null; }
  }
  return composeSoulMeta(tokenId, rootHash, state);
}

export async function loadSoulProfile(tokenId: bigint): Promise<SoulProfile | null> {
  const client = createPublicClient({ chain: galileo, transport: http() });
  // existence check: ownerOf reverts (ERC721NonexistentToken) for tokens that were never minted,
  // so a non-existent id (e.g. 100, 1000) returns null instead of a phantom "Soul #100"
  try {
    await client.readContract({ address: CONTRACT_ADDRESS, abi: SOUL_ABI, functionName: 'ownerOf', args: [tokenId] });
  } catch {
    return null;
  }
  let rootHash = '';
  try {
    rootHash = (await client.readContract({
      address: CONTRACT_ADDRESS, abi: SOUL_ABI, functionName: 'memoryOf', args: [tokenId],
    })) as string;
  } catch {
    return null;
  }
  const base: SoulProfile = { tokenId: tokenId.toString(), name: `Soul #${tokenId}`, personality: '', memorySummary: '', keyFacts: [] };
  if (!rootHash) return base;
  try {
    const s = await downloadMemory(rootHash);
    return {
      tokenId: tokenId.toString(),
      name: s.name || base.name,
      personality: s.personality || '',
      memorySummary: s.memorySummary || '',
      keyFacts: Array.isArray(s.keyFacts) ? s.keyFacts : [],
      avatarRootHash: s.avatarRootHash,
    };
  } catch {
    return base;
  }
}
