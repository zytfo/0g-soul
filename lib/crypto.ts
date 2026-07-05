const enc = new TextEncoder();
const dec = new TextDecoder();

function hexToBytes(hex: string): Uint8Array<ArrayBuffer> {
  const h = hex.startsWith('0x') ? hex.slice(2) : hex;
  if (h.length % 2 !== 0) throw new Error('hex string must have even length');
  const a = new Uint8Array(h.length / 2);
  for (let i = 0; i < a.length; i++) {
    const byte = parseInt(h.slice(i * 2, i * 2 + 2), 16);
    if (Number.isNaN(byte)) throw new Error('invalid hex character');
    a[i] = byte;
  }
  return a;
}

/** AES-GCM encrypt → iv(12) || ciphertext. */
export async function encryptBytes(plain: Uint8Array<ArrayBuffer>, key: CryptoKey): Promise<Uint8Array<ArrayBuffer>> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plain));
  const out = new Uint8Array(iv.length + ct.length);
  out.set(iv);
  out.set(ct, iv.length);
  return out;
}

export async function decryptBytes(data: Uint8Array<ArrayBuffer>, key: CryptoKey): Promise<Uint8Array<ArrayBuffer>> {
  const iv = data.slice(0, 12);
  const ct = data.slice(12);
  return new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ct));
}

export function randomKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
}
export async function exportRawKey(k: CryptoKey): Promise<Uint8Array<ArrayBuffer>> {
  return new Uint8Array(await crypto.subtle.exportKey('raw', k));
}
export function importRawKey(raw: Uint8Array<ArrayBuffer>): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', raw, { name: 'AES-GCM' }, true, ['encrypt', 'decrypt']);
}

/** Derive a per-owner AES wrap key from a wallet signature (HKDF-SHA256). */
export async function wrapKeyFromSignature(signature: string): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey('raw', hexToBytes(signature), 'HKDF', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'HKDF', hash: 'SHA-256', salt: Uint8Array.from(enc.encode('soul-wrap')), info: Uint8Array.from(enc.encode('v1')) },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

export async function sealKey(K: CryptoKey, wrap: CryptoKey): Promise<Uint8Array<ArrayBuffer>> {
  return encryptBytes(await exportRawKey(K), wrap);
}
export async function unsealKey(sealed: Uint8Array<ArrayBuffer>, wrap: CryptoKey): Promise<CryptoKey> {
  return importRawKey(await decryptBytes(sealed, wrap));
}
export async function encryptJSON(obj: unknown, K: CryptoKey): Promise<Uint8Array<ArrayBuffer>> {
  return encryptBytes(Uint8Array.from(enc.encode(JSON.stringify(obj))), K);
}
export async function decryptJSON<T>(data: Uint8Array<ArrayBuffer>, K: CryptoKey): Promise<T> {
  return JSON.parse(dec.decode(await decryptBytes(data, K))) as T;
}
