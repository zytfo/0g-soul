import OpenAI from 'openai';
import type { PromptMessage, AgentState } from './agent-core';
import { buildSeanceMessages } from './agent-core';
import { parseDistill, type Distilled } from './distill';
import type { SoulProfile, SeanceLine } from './soul-types';

const BASE_URL =
  process.env.ROUTER_BASE_URL || 'https://router-api-testnet.integratenetwork.work/v1';

const client = new OpenAI({
  apiKey: process.env.ROUTER_API_KEY,
  baseURL: BASE_URL,
  maxRetries: 1, // fail fast so the UI local-fallback can take over during a live demo
  timeout: 20000,
});

/** Send a chat completion through the 0G Compute Router (OpenAI-compatible). */
export async function chat(messages: PromptMessage[]): Promise<string> {
  const model = process.env.ROUTER_MODEL || process.env.MODEL;
  if (!model) throw new Error('ROUTER_MODEL is not set');
  if (!process.env.ROUTER_API_KEY) throw new Error('ROUTER_API_KEY is not set');
  const res = await client.chat.completions.create({ model, messages });
  return res.choices[0]?.message?.content ?? '';
}

/** Stream a chat completion through the 0G Compute Router (OpenAI-compatible). */
export async function chatStream(messages: PromptMessage[]): Promise<AsyncIterable<string>> {
  const model = process.env.ROUTER_MODEL || process.env.MODEL;
  if (!model) throw new Error('ROUTER_MODEL is not set');
  if (!process.env.ROUTER_API_KEY) throw new Error('ROUTER_API_KEY is not set');
  const stream = await client.chat.completions.create({ model, messages, stream: true });
  async function* gen() {
    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content;
      if (delta) yield delta;
    }
  }
  return gen();
}

export function seanceTurn(speaker: SoulProfile, otherName: string, transcript: SeanceLine[]): Promise<AsyncIterable<string>> {
  return chatStream(buildSeanceMessages(speaker, otherName, transcript));
}

/** Ask 0G Compute to distill what the companion should remember about the USER. */
export async function distillMemory(state: AgentState): Promise<Distilled> {
  const convo = state.history.map((m) => `${m.role}: ${m.content}`).join('\n');
  const messages: PromptMessage[] = [
    {
      role: 'system',
      content:
        `You maintain the long-term memory of an AI companion named ${state.name}. ` +
        `From the conversation, extract what the companion should remember about the USER (not about itself). ` +
        `Reply with ONLY minified JSON, no prose: ` +
        `{"summary":"2-3 sentence summary of the user and the relationship","facts":["short fact about the user"]} ` +
        `with at most 6 facts.`,
    },
    { role: 'user', content: convo || '(no conversation yet)' },
  ];
  return parseDistill(await chat(messages)); // reuses chat()'s model + ROUTER_API_KEY guards
}
