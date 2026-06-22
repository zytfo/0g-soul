import { NextRequest, NextResponse } from 'next/server';
import { buildMessages, type AgentState, type PromptMessage } from '@/lib/agent-core';
import { chat } from '@/lib/og-compute';

export const runtime = 'nodejs';
export const maxDuration = 30;

// Contract: `message` is the NEW user turn and must NOT already be present in
// `state.history`. The route appends it after buildMessages(state); if the
// client also pushed it into history, the model would see the turn twice.
export async function POST(req: NextRequest) {
  try {
    const { state, message } = (await req.json()) as { state: AgentState; message: string };
    if (!state || typeof message !== 'string') {
      return NextResponse.json({ error: 'state and message are required' }, { status: 400 });
    }
    const msgs: PromptMessage[] = [...buildMessages(state), { role: 'user', content: message }];
    const reply = await chat(msgs);
    return NextResponse.json({ reply });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'chat failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
