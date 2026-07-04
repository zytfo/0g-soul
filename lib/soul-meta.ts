import { createPublicClient, http } from 'viem';
import { galileo, CONTRACT_ADDRESS, SOUL_ABI } from './chain';
import { downloadMemory } from './og-storage';
import type { AgentState } from './agent-core';

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
