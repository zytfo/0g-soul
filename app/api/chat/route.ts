import { NextRequest } from 'next/server';
import { buildMessages, type AgentState, type PromptMessage } from '@/lib/agent-core';
import { chatStream } from '@/lib/og-compute';
import { parseNetwork } from '@/lib/networks';

export const runtime = 'nodejs';
export const maxDuration = 30;

// Contract: `message` is the NEW user turn and must NOT already be present in
// `state.history`. The route appends it after buildMessages(state); if the
// client also pushed it into history, the model would see the turn twice.
export async function POST(req: NextRequest) {
  let state: AgentState, message: string, networkRaw: unknown;
  try {
    ({ state, message, network: networkRaw } = (await req.json()) as {
      state: AgentState;
      message: string;
      network?: string;
    });
  } catch {
    return new Response(JSON.stringify({ error: 'invalid body' }), { status: 400 });
  }
  if (!state || typeof message !== 'string') {
    return new Response(JSON.stringify({ error: 'state and message are required' }), { status: 400 });
  }
  const network = parseNetwork(typeof networkRaw === 'string' ? networkRaw : null);
  const msgs: PromptMessage[] = [...buildMessages(state), { role: 'user', content: message }];
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const delta of await chatStream(msgs, network)) controller.enqueue(encoder.encode(delta));
      } catch {
        // send nothing and close cleanly; the client's empty-stream check triggers its fallback
      } finally {
        controller.close();
      }
    },
  });
  return new Response(stream, { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' } });
}
