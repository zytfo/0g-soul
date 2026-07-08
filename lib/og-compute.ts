import OpenAI from 'openai';
import type { PromptMessage, AgentState } from './agent-core';
import { buildSeanceMessages } from './agent-core';
import { parseDistill, type Distilled } from './distill';
import type { SoulProfile, SeanceLine } from './soul-types';
import type { NetworkId } from './networks';
import { routerConfig, routerModel } from './router-config';

function client(network: NetworkId) {
  const { baseURL, apiKey } = routerConfig(network);
  return new OpenAI({
    apiKey,
    baseURL,
    maxRetries: 1,
    timeout: 20000,
  });
}

/** Send a chat completion through the 0G Compute Router (OpenAI-compatible). */
export async function chat(messages: PromptMessage[], network: NetworkId = 'testnet'): Promise<string> {
  const model = routerModel(network);
  const res = await client(network).chat.completions.create({ model, messages });
  return res.choices[0]?.message?.content ?? '';
}

/** Stream a chat completion through the 0G Compute Router (OpenAI-compatible). */
export async function chatStream(messages: PromptMessage[], network: NetworkId = 'testnet'): Promise<AsyncIterable<string>> {
  const model = routerModel(network);
  const stream = await client(network).chat.completions.create({ model, messages, stream: true });
  async function* gen() {
    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content;
      if (delta) yield delta;
    }
  }
  return gen();
}

export function seanceTurn(
  speaker: SoulProfile,
  otherName: string,
  transcript: SeanceLine[],
  network: NetworkId = 'testnet',
): Promise<AsyncIterable<string>> {
  return chatStream(buildSeanceMessages(speaker, otherName, transcript), network);
}

/** Ask 0G Compute to distill what the companion should remember about the USER. */
export async function distillMemory(state: AgentState, network: NetworkId = 'testnet'): Promise<Distilled> {
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
  return parseDistill(await chat(messages, network));
}
