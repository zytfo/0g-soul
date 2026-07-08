type Entry = { data: unknown; ts: number };

const store = new Map<string, Entry>();
const TTL_MS = 60_000;

export function galleryCacheGet<T>(key: string): T | null {
  const hit = store.get(key);
  if (!hit) return null;
  if (Date.now() - hit.ts > TTL_MS) {
    store.delete(key);
    return null;
  }
  return hit.data as T;
}

export function galleryCacheSet(key: string, data: unknown): void {
  store.set(key, { data, ts: Date.now() });
}
