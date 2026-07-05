import { createPublicClient, http } from 'viem';
import { galileo, CONTRACT_ADDRESS, SOUL_ABI } from './chain';
import { downloadBytes } from './og-storage';
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
  // existence check
  try {
    await client.readContract({ address: CONTRACT_ADDRESS, abi: SOUL_ABI, functionName: 'ownerOf', args: [tokenId] });
  } catch {
    return composeSoulMeta(tokenId, '', null);
  }
  let publicURI = '';
  try {
    publicURI = (await client.readContract({ address: CONTRACT_ADDRESS, abi: SOUL_ABI, functionName: 'publicURIOf', args: [tokenId] })) as string;
  } catch {
    return composeSoulMeta(tokenId, '', null);
  }
  if (!publicURI) return composeSoulMeta(tokenId, '', null);
  try {
    const bytes = await downloadBytes(publicURI);
    const p = JSON.parse(new TextDecoder().decode(bytes)) as { name?: string; personality?: string; avatarRootHash?: string };
    // Build a minimal AgentState shape for composeSoulMeta
    const state: AgentState = {
      version: 1,
      name: p.name || `Soul #${tokenId}`,
      personality: p.personality || '',
      memorySummary: '',
      keyFacts: [],
      history: [],
      avatarRootHash: p.avatarRootHash,
    };
    return composeSoulMeta(tokenId, publicURI, state);
  } catch {
    return composeSoulMeta(tokenId, '', null);
  }
}

export async function loadSoulProfile(tokenId: bigint): Promise<SoulProfile | null> {
  const client = createPublicClient({ chain: galileo, transport: http() });
  try {
    await client.readContract({ address: CONTRACT_ADDRESS, abi: SOUL_ABI, functionName: 'ownerOf', args: [tokenId] });
  } catch {
    return null;
  }
  const base: SoulProfile = { tokenId: tokenId.toString(), name: `Soul #${tokenId}`, personality: '', memorySummary: '', keyFacts: [] };
  let publicURI = '';
  try {
    publicURI = (await client.readContract({ address: CONTRACT_ADDRESS, abi: SOUL_ABI, functionName: 'publicURIOf', args: [tokenId] })) as string;
  } catch { return base; }
  if (!publicURI) return base;
  try {
    const bytes = await downloadBytes(publicURI);
    const p = JSON.parse(new TextDecoder().decode(bytes)) as { name?: string; personality?: string; avatarRootHash?: string };
    return { tokenId: tokenId.toString(), name: p.name || base.name, personality: p.personality || '', memorySummary: '', keyFacts: [], avatarRootHash: p.avatarRootHash };
  } catch { return base; }
}
