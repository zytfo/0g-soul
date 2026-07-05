import { readFile } from 'node:fs/promises';
import path from 'node:path';

const BASE_URL = process.env.ROUTER_BASE_URL || 'https://router-api-testnet.integratenetwork.work/v1';

const PALETTE = [
  'emerald green', 'warm amber-gold', 'cool steel-blue', 'soft violet',
  'hot magenta', 'electric cyan', 'crimson red', 'golden yellow', 'deep teal', 'burnt orange',
];

function hashIndex(s: string, n: number): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h % n;
}

export function avatarPrompt(personality: string): string {
  const p = personality.toLowerCase();
  let color: string;
  if (p.includes('stoic') || p.includes('calm')) color = 'cool steel-blue';
  else if (p.includes('gremlin') || p.includes('chaotic')) color = 'hot magenta with glitch sparks';
  else if (p.includes('poet') || p.includes('dreamy')) color = 'soft violet';
  else if (p.includes('warm') || p.includes('witty')) color = 'warm amber-gold';
  else color = PALETTE[hashIndex(p, PALETTE.length)]; // distinct color per custom character
  const clip = personality.length > 160 ? personality.slice(0, 160) : personality;
  return (
    `Reimagine this glowing soul as a UNIQUE ${color} emblem that embodies this character: "${clip}". ` +
    `Give it a distinctive silhouette and small symbols that reflect the character — not just a recolor. ` +
    `Keep the CRT pixel-art style, scanlines, diamond motifs, and dark background. Centered, iconic, 512x512.`
  );
}

export async function generateAvatar(personality: string): Promise<Uint8Array> {
  if (!process.env.ROUTER_API_KEY) throw new Error('ROUTER_API_KEY is not set');
  const baseBytes = await readFile(path.join(process.cwd(), 'public', 'avatar-base.png'));
  const form = new FormData();
  form.append('model', 'qwen-image-edit');
  form.append('prompt', avatarPrompt(personality));
  form.append('size', '512x512');
  form.append('image', new Blob([baseBytes], { type: 'image/png' }), 'base.png');
  const res = await fetch(`${BASE_URL}/images/edits`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.ROUTER_API_KEY}` },
    body: form,
  });
  if (!res.ok) throw new Error(`image edit failed: ${res.status} ${await res.text().catch(() => '')}`.trim());
  const json = await res.json();
  const b64 = json?.data?.[0]?.b64_json;
  if (!b64) throw new Error('no image in response');
  return new Uint8Array(Buffer.from(b64, 'base64'));
}
