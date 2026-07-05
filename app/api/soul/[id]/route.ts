import { NextRequest, NextResponse } from 'next/server';
import { loadSoulProfile } from '@/lib/soul-meta';

export const runtime = 'nodejs';

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    if (!/^\d+$/.test(id)) return NextResponse.json({ error: 'invalid id' }, { status: 400 });
    const profile = await loadSoulProfile(BigInt(id));
    if (!profile) return NextResponse.json({ error: 'not found' }, { status: 404 });
    return NextResponse.json(profile);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'failed' }, { status: 500 });
  }
}
