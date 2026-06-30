import type { AgentState } from './agent-core';

/** Returns the URL for a soul avatar. Falls back to /logo.png when no rootHash is set. */
export const avatarUrl = (rootHash?: string) =>
  rootHash ? `/api/avatar?rootHash=${rootHash}` : '/logo.png';

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

/** Best-effort error message from a non-ok response (JSON .error, else statusText). */
async function errorText(res: Response): Promise<string> {
  try {
    const body = await res.json();
    return body?.error ?? res.statusText;
  } catch {
    return res.statusText || `HTTP ${res.status}`;
  }
}

/** Upload the agent state to 0G Storage and return its root hash. Throws on failure. */
export async function saveMemory(state: AgentState): Promise<string> {
  const res = await fetch('/api/memory', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ state }),
  });
  if (!res.ok) throw new Error(await errorText(res));
  const { rootHash } = await res.json();
  cacheState(rootHash, state);
  return rootHash;
}

/** Download an agent state from 0G Storage by root hash, falling back to local cache. */
export async function loadMemory(rootHash: string): Promise<AgentState> {
  try {
    const res = await fetch(`/api/memory?rootHash=${rootHash}`);
    if (!res.ok) throw new Error('download failed');
    const state = (await res.json()) as AgentState;
    cacheState(rootHash, state);
    return state;
  } catch (e) {
    const cached = readCache(rootHash);
    if (cached) return cached;
    throw e;
  }
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

const KEY = (rootHash: string) => `soul:mem:${rootHash}`;

export function cacheState(rootHash: string, state: AgentState) {
  try {
    localStorage.setItem(KEY(rootHash), JSON.stringify(state));
  } catch {}
}

export function readCache(rootHash: string): AgentState | null {
  try {
    const raw = localStorage.getItem(KEY(rootHash));
    return raw ? (JSON.parse(raw) as AgentState) : null;
  } catch {
    return null;
  }
}
