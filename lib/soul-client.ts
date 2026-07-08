import type { AgentState } from './agent-core';
import type { SoulProfile, SeanceLine } from './soul-types';
import type { NetworkId } from './networks';

/** Returns the URL for a soul avatar. Falls back to /logo.png when no rootHash is set. */
export const avatarUrl = (rootHash?: string, network: NetworkId = 'testnet') =>
  rootHash ? `/api/avatar?rootHash=${rootHash}&network=${network}` : '/logo.png';

export async function fetchSoulProfile(id: string, network: NetworkId = 'testnet'): Promise<SoulProfile | null> {
  try {
    const res = await fetch(`/api/soul/${id}?network=${network}`);
    if (!res.ok) return null;
    return (await res.json()) as SoulProfile;
  } catch {
    return null;
  }
}

export async function streamSeanceTurn(
  speaker: SoulProfile,
  otherName: string,
  transcript: SeanceLine[],
  onToken: (delta: string) => void,
  network: NetworkId = 'testnet',
): Promise<string> {
  const res = await fetch('/api/seance', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ speaker, otherName, transcript, network }),
  });
  if (!res.ok || !res.body) throw new Error('seance turn failed');
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let text = '';
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value, { stream: true });
    if (chunk) { text += chunk; onToken(chunk); }
  }
  const tail = decoder.decode(); // flush any buffered multi-byte tail into the live feed too
  if (tail) { text += tail; onToken(tail); }
  return text;
}

/** Stream a chat turn. Falls back to a canned reply if the Compute route fails or returns empty.
 *  On fallback, returns the canned text WITHOUT appending via onToken — the caller reconciles the
 *  displayed entry to the returned `text`, so a partial stream + fallback never concatenate. */
export async function sendChatStream(
  state: AgentState,
  message: string,
  onToken: (delta: string) => void,
  network: NetworkId = 'testnet',
): Promise<{ text: string; fallback: boolean }> {
  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ state, message, network }),
    });
    if (!res.ok || !res.body) throw new Error('chat failed');
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let text = '';
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      if (chunk) { text += chunk; onToken(chunk); }
    }
    const tail = decoder.decode(); // flush any buffered multi-byte tail
    if (tail) { text += tail; onToken(tail); }
    if (!text.trim()) throw new Error('empty stream');
    return { text, fallback: false };
  } catch {
    const reply = `[0G Compute link unstable — local echo] I'm still here, ${state.name || 'friend'}. Say that again in a moment.`;
    return { text: reply, fallback: true };
  }
}

/** Ask the server (0G Compute) to distill memory summary + key facts from the conversation.
 *  Returns null on any failure so the save flow can proceed without enrichment. */
export async function distill(
  state: AgentState,
  network: NetworkId = 'testnet',
): Promise<{ memorySummary: string; keyFacts: string[] } | null> {
  try {
    const res = await fetch('/api/distill', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ state, network }),
    });
    if (!res.ok) return null;
    const j = await res.json();
    if (typeof j.memorySummary === 'string' && Array.isArray(j.keyFacts)) {
      return { memorySummary: j.memorySummary, keyFacts: j.keyFacts };
    }
    return null;
  } catch {
    return null;
  }
}

/** Upload raw bytes to 0G Storage via /api/blob; returns rootHash. */
export async function uploadBlob(bytes: Uint8Array, network: NetworkId = 'testnet'): Promise<string> {
  const buf: ArrayBuffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  const res = await fetch(`/api/blob?network=${network}`, { method: 'POST', headers: { 'Content-Type': 'application/octet-stream' }, body: buf });
  if (!res.ok) throw new Error('blob upload failed');
  return (await res.json()).rootHash as string;
}

/** Download raw bytes from 0G Storage via /api/blob by rootHash. */
export async function downloadBlob(rootHash: string, network: NetworkId = 'testnet'): Promise<Uint8Array> {
  const res = await fetch(`/api/blob?rootHash=${rootHash}&network=${network}`);
  if (!res.ok) throw new Error('blob download failed');
  return new Uint8Array(await res.arrayBuffer());
}

/* --- local registry of souls this wallet has minted (per address + network) --- */
export type SoulRef = { tokenId: string; name: string; network: NetworkId };

const OWNED = (addr: string, network: NetworkId) => `soul:owned:${network}:${addr.toLowerCase()}`;
const LEGACY_OWNED = (addr: string) => `soul:owned:${addr.toLowerCase()}`;

export function agentPath(tokenId: string | bigint, network: NetworkId = 'testnet'): string {
  const id = tokenId.toString();
  return network === 'mainnet' ? `/agent/${id}?network=mainnet` : `/agent/${id}`;
}

export function seancePath(a: string, b: string, network: NetworkId = 'testnet'): string {
  const base = `/seance/${a}/${b}`;
  return network === 'mainnet' ? `${base}?network=mainnet` : base;
}

function migrateLegacy(addr: string) {
  try {
    const raw = localStorage.getItem(LEGACY_OWNED(addr));
    if (!raw) return;
    const list = (JSON.parse(raw) as { tokenId: string; name: string }[]).map((s) => ({
      ...s,
      network: 'testnet' as NetworkId,
    }));
    localStorage.setItem(OWNED(addr, 'testnet'), JSON.stringify(list));
    localStorage.removeItem(LEGACY_OWNED(addr));
  } catch {}
}

export function rememberSoul(addr: string, ref: SoulRef) {
  try {
    migrateLegacy(addr);
    const network = ref.network ?? 'testnet';
    const list = listSouls(addr, network).filter((s) => s.tokenId !== ref.tokenId);
    list.unshift({ ...ref, network });
    localStorage.setItem(OWNED(addr, network), JSON.stringify(list));
  } catch {}
}

export function forgetSoul(addr: string, tokenId: string, network: NetworkId = 'testnet') {
  try {
    migrateLegacy(addr);
    localStorage.setItem(
      OWNED(addr, network),
      JSON.stringify(listSouls(addr, network).filter((s) => s.tokenId !== tokenId)),
    );
  } catch {}
}

export function listSouls(addr: string, network: NetworkId): SoulRef[] {
  try {
    if (network === 'testnet') migrateLegacy(addr);
    const raw = localStorage.getItem(OWNED(addr, network));
    if (!raw) return [];
    return (JSON.parse(raw) as SoulRef[]).map((s) => ({ ...s, network: s.network ?? network }));
  } catch {
    return [];
  }
}

