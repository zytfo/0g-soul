import { NextRequest, NextResponse } from 'next/server';
import { distillMemory } from '@/lib/og-compute';
import type { AgentState } from '@/lib/agent-core';
import { parseNetwork } from '@/lib/networks';

export const runtime = 'nodejs';
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  let state: AgentState, networkRaw: unknown;
  try {
    ({ state, network: networkRaw } = (await req.json()) as { state: AgentState; network?: string });
  } catch {
    return NextResponse.json({ error: 'invalid body' }, { status: 400 });
  }
  if (!state) return NextResponse.json({ error: 'state required' }, { status: 400 });
  const network = parseNetwork(typeof networkRaw === 'string' ? networkRaw : null);
  try {
    const distilled = await distillMemory(state, network);
    return NextResponse.json(distilled);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'distill failed' }, { status: 500 });
  }
}
