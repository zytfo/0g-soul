import { NextRequest, NextResponse } from 'next/server';
import { distillMemory } from '@/lib/og-compute';
import type { AgentState } from '@/lib/agent-core';

export const runtime = 'nodejs';
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  let state: AgentState;
  try {
    ({ state } = (await req.json()) as { state: AgentState });
  } catch {
    return NextResponse.json({ error: 'invalid body' }, { status: 400 });
  }
  if (!state) return NextResponse.json({ error: 'state required' }, { status: 400 });
  try {
    const distilled = await distillMemory(state);
    return NextResponse.json(distilled);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'distill failed' }, { status: 500 });
  }
}
