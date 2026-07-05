import { NextRequest } from 'next/server';
import { seanceTurn } from '@/lib/og-compute';
import type { SoulProfile, SeanceLine } from '@/lib/soul-types';

export const runtime = 'nodejs';
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  const bad = (msg: string) =>
    new Response(JSON.stringify({ error: msg }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  let speaker: SoulProfile, otherName: string, transcript: SeanceLine[];
  try {
    ({ speaker, otherName, transcript } = (await req.json()) as { speaker: SoulProfile; otherName: string; transcript: SeanceLine[] });
  } catch {
    return bad('invalid body');
  }
  // validate the full speaker shape BEFORE streaming, so malformed input is a clean 400 (not a silent empty 200)
  if (!speaker?.name || typeof speaker.personality !== 'string' || !Array.isArray(speaker.keyFacts) || !otherName) {
    return bad('speaker (name, personality, keyFacts) and otherName required');
  }
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const d of await seanceTurn(speaker, otherName, transcript ?? [])) controller.enqueue(encoder.encode(d));
      } catch {
        // client treats an empty/short stream as a faded turn
      } finally {
        controller.close();
      }
    },
  });
  return new Response(stream, { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' } });
}
