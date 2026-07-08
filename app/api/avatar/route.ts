import { NextRequest, NextResponse } from 'next/server';
import { generateAvatar } from '@/lib/og-image';
import { uploadBytes, downloadBytes } from '@/lib/og-storage';
import { parseNetwork } from '@/lib/networks';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  let body: {
    personality?: unknown;
    memorySummary?: unknown;
    keyFacts?: unknown;
    evolve?: unknown;
    network?: unknown;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid body' }, { status: 400 });
  }
  try {
    const { personality, memorySummary, keyFacts, evolve, network: netRaw } = body;
    if (typeof personality !== 'string') return NextResponse.json({ error: 'personality required' }, { status: 400 });
    const network = parseNetwork(typeof netRaw === 'string' ? netRaw : null);
    const facts = Array.isArray(keyFacts) ? keyFacts.filter((f): f is string => typeof f === 'string') : [];
    const bytes = await generateAvatar(personality, {
      evolve: evolve === true,
      memorySummary: typeof memorySummary === 'string' ? memorySummary : undefined,
      keyFacts: facts,
      network,
    });
    const { rootHash } = await uploadBytes(bytes, network);
    return NextResponse.json({ rootHash });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'avatar failed' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const rootHash = req.nextUrl.searchParams.get('rootHash');
    if (!rootHash) return NextResponse.json({ error: 'rootHash required' }, { status: 400 });
    const network = parseNetwork(req.nextUrl.searchParams.get('network'));
    const bytes = await downloadBytes(rootHash, network);
    return new Response(Buffer.from(bytes), {
      headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=31536000, immutable' },
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'fetch failed' }, { status: 500 });
  }
}
