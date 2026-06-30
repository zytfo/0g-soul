import { NextRequest, NextResponse } from 'next/server';
import { generateAvatar } from '@/lib/og-image';
import { uploadBytes, downloadBytes } from '@/lib/og-storage';

export const runtime = 'nodejs';
export const maxDuration = 60; // generation ~27s + upload ~10s fits; 60 is the Vercel Hobby cap (do NOT exceed or the deploy is rejected)

export async function POST(req: NextRequest) {
  let personality: unknown;
  try {
    ({ personality } = await req.json());
  } catch {
    return NextResponse.json({ error: 'invalid body' }, { status: 400 });
  }
  try {
    if (typeof personality !== 'string') return NextResponse.json({ error: 'personality required' }, { status: 400 });
    const bytes = await generateAvatar(personality);
    const { rootHash } = await uploadBytes(bytes);
    return NextResponse.json({ rootHash });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'avatar failed' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const rootHash = req.nextUrl.searchParams.get('rootHash');
    if (!rootHash) return NextResponse.json({ error: 'rootHash required' }, { status: 400 });
    const bytes = await downloadBytes(rootHash);
    return new Response(Buffer.from(bytes), {
      headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=31536000, immutable' },
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'fetch failed' }, { status: 500 });
  }
}
