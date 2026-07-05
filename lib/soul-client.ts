import type { AgentState } from './agent-core';
import type { SoulProfile, SeanceLine } from './soul-types';

/** Returns the URL for a soul avatar. Falls back to /logo.png when no rootHash is set. */
export const avatarUrl = (rootHash?: string) =>
  rootHash ? `/api/avatar?rootHash=${rootHash}` : '/logo.png';

export async function fetchSoulProfile(id: string): Promise<SoulProfile | null> {
  try {
    const res = await fetch(`/api/soul/${id}`);
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
): Promise<string> {
  const res = await fetch('/api/seance', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ speaker, otherName, transcript }),
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
): Promise<{ text: string; fallback: boolean }> {
  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ state, message }),
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
): Promise<{ memorySummary: string; keyFacts: string[] } | null> {
  try {
    const res = await fetch('/api/distill', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ state }),
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
export async function uploadBlob(bytes: Uint8Array): Promise<string> {
  const buf: ArrayBuffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  const res = await fetch('/api/blob', { method: 'POST', headers: { 'Content-Type': 'application/octet-stream' }, body: buf });
  if (!res.ok) throw new Error('blob upload failed');
  return (await res.json()).rootHash as string;
}

/** Download raw bytes from 0G Storage via /api/blob by rootHash. */
export async function downloadBlob(rootHash: string): Promise<Uint8Array> {
  const res = await fetch(`/api/blob?rootHash=${rootHash}`);
  if (!res.ok) throw new Error('blob download failed');
  return new Uint8Array(await res.arrayBuffer());
}

/* --- local registry of souls this wallet has minted (per address) --- */
export type SoulRef = { tokenId: string; name: string };

const OWNED = (addr: string) => `soul:owned:${addr.toLowerCase()}`;

export function rememberSoul(addr: string, ref: SoulRef) {
  try {
    const list = listSouls(addr).filter((s) => s.tokenId !== ref.tokenId);
    list.unshift(ref);
    localStorage.setItem(OWNED(addr), JSON.stringify(list));
  } catch {}
}

export function forgetSoul(addr: string, tokenId: string) {
  try {
    localStorage.setItem(OWNED(addr), JSON.stringify(listSouls(addr).filter((s) => s.tokenId !== tokenId)));
  } catch {}
}

export function listSouls(addr: string): SoulRef[] {
  try {
    const raw = localStorage.getItem(OWNED(addr));
    return raw ? (JSON.parse(raw) as SoulRef[]) : [];
  } catch {
    return [];
  }
}

