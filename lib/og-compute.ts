import OpenAI from 'openai';
import type { PromptMessage } from './agent-core';

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
