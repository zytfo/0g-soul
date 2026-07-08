import { NextRequest, NextResponse } from 'next/server';
import { uploadBytes, downloadBytes } from '@/lib/og-storage';
import { parseNetwork } from '@/lib/networks';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const buf = new Uint8Array(await req.arrayBuffer());
    if (buf.length === 0) return NextResponse.json({ error: 'empty body' }, { status: 400 });
    const network = parseNetwork(req.nextUrl.searchParams.get('network'));
    const { rootHash } = await uploadBytes(buf, network);
    return NextResponse.json({ rootHash });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'upload failed' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const rootHash = req.nextUrl.searchParams.get('rootHash');
    if (!rootHash) return NextResponse.json({ error: 'rootHash required' }, { status: 400 });
    const network = parseNetwork(req.nextUrl.searchParams.get('network'));
    const bytes = await downloadBytes(rootHash, network);
    return new Response(Buffer.from(bytes), {
      headers: { 'Content-Type': 'application/octet-stream', 'Cache-Control': 'public, max-age=31536000, immutable' },
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'fetch failed' }, { status: 500 });
  }
}
