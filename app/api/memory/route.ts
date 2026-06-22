import { NextRequest, NextResponse } from 'next/server';
import { uploadMemory, downloadMemory } from '@/lib/og-storage';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { state } = await req.json();
    if (!state) return NextResponse.json({ error: 'state is required' }, { status: 400 });
    const { rootHash } = await uploadMemory(state);
    return NextResponse.json({ rootHash });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'upload failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const rootHash = req.nextUrl.searchParams.get('rootHash');
    if (!rootHash) return NextResponse.json({ error: 'rootHash is required' }, { status: 400 });
    return NextResponse.json(await downloadMemory(rootHash));
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'download failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
