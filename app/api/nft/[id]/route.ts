import { NextRequest, NextResponse } from 'next/server';
import { loadSoulMeta } from '@/lib/soul-meta';

export const runtime = 'nodejs';
const ORIGIN = 'https://0g-soul.vercel.app';

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const meta = await loadSoulMeta(BigInt(id));
    const image = meta.avatarRootHash ? `${ORIGIN}/api/avatar?rootHash=${meta.avatarRootHash}` : `${ORIGIN}/logo.png`;
    return NextResponse.json({
      name: meta.name,
      description: 'An AI companion whose memory lives on 0G Storage and whose identity is owned on the 0G chain.',
      image,
      attributes: [{ trait_type: 'personality', value: meta.personality || 'unknown' }],
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'metadata failed' }, { status: 500 });
  }
}
