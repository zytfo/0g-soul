import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type { AgentState } from './agent-core';
import type { NetworkId } from './networks';
import { imageModel, routerConfig } from './router-config';

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

/** Prompt for regenerating a portrait after the soul has learned about its owner. */
export function evolveAvatarPrompt(state: Pick<AgentState, 'personality' | 'memorySummary' | 'keyFacts'>): string {
  const facts = state.keyFacts.length ? state.keyFacts.slice(0, 6).join('; ') : '(none yet)';
  const summary = state.memorySummary?.trim() || '(still forming)';
  const clip = state.personality.length > 120 ? state.personality.slice(0, 120) : state.personality;
  return (
    `Evolve this glowing soul emblem to reflect a deeper, lived-in character. ` +
    `Core personality: "${clip}". ` +
    `What they have learned: ${summary}. Key facts: ${facts}. ` +
    `Add subtle new symbols, wear, or aura that show growth — same CRT pixel-art soul, scanlines, diamond motifs, dark background. ` +
    `Centered, iconic, 512x512.`
  );
}

/** Mainnet text-to-image has no base reference — rephrase edit-oriented prompts. */
function textToImagePrompt(prompt: string): string {
  return prompt
    .replace(/^Reimagine this glowing soul/i, 'Create a glowing soul')
    .replace(/^Evolve this glowing soul emblem/i, 'Create an evolved glowing soul emblem');
}

function parseImageResponse(json: unknown): Uint8Array {
  const b64 = (json as { data?: { b64_json?: string }[] })?.data?.[0]?.b64_json;
  if (!b64) throw new Error('no image in response');
  return new Uint8Array(Buffer.from(b64, 'base64'));
}

async function generateAvatarViaEdit(
  baseURL: string,
  apiKey: string,
  model: string,
  prompt: string,
): Promise<Uint8Array> {
  const baseBytes = await readFile(path.join(process.cwd(), 'public', 'avatar-base.png'));
  const form = new FormData();
  form.append('model', model);
  form.append('prompt', prompt);
  form.append('size', '512x512');
  form.append('image', new Blob([baseBytes], { type: 'image/png' }), 'base.png');
  const res = await fetch(`${baseURL}/images/edits`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  });
  if (!res.ok) throw new Error(`image edit failed: ${res.status} ${await res.text().catch(() => '')}`.trim());
  return parseImageResponse(await res.json());
}

async function generateAvatarViaGeneration(
  baseURL: string,
  apiKey: string,
  model: string,
  prompt: string,
): Promise<Uint8Array> {
  const res = await fetch(`${baseURL}/images/generations`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      prompt,
      n: 1,
      size: '1024x1024',
      response_format: 'b64_json',
    }),
  });
  if (!res.ok) throw new Error(`image generation failed: ${res.status} ${await res.text().catch(() => '')}`.trim());
  return parseImageResponse(await res.json());
}

export async function generateAvatar(
  personality: string,
  opts?: { evolve?: boolean; memorySummary?: string; keyFacts?: string[]; network?: NetworkId },
): Promise<Uint8Array> {
  const network = opts?.network ?? 'testnet';
  const { baseURL, apiKey } = routerConfig(network);
  const model = imageModel(network);
  const prompt = opts?.evolve
    ? evolveAvatarPrompt({
        personality,
        memorySummary: opts.memorySummary ?? '',
        keyFacts: opts.keyFacts ?? [],
      })
    : avatarPrompt(personality);

  if (network === 'mainnet') {
    return generateAvatarViaGeneration(baseURL, apiKey, model, textToImagePrompt(prompt));
  }
  return generateAvatarViaEdit(baseURL, apiKey, model, prompt);
}
