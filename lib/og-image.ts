import { readFile } from 'node:fs/promises';
import path from 'node:path';

const BASE_URL = process.env.ROUTER_BASE_URL || 'https://router-api-testnet.integratenetwork.work/v1';

export function avatarPrompt(personality: string): string {
  const p = personality.toLowerCase();
  let color = 'emerald green';
  if (p.includes('stoic') || p.includes('calm')) color = 'cool steel-blue';
  else if (p.includes('gremlin') || p.includes('chaotic')) color = 'hot magenta with glitch sparks';
  else if (p.includes('poet') || p.includes('dreamy')) color = 'soft violet';
  else if (p.includes('warm') || p.includes('witty')) color = 'warm amber-gold';
  return `recolor this into a ${color} glowing soul orb. Keep the CRT pixel style, scanlines, the diamond motifs, and a dark background. Centered, iconic, 512x512.`;
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
