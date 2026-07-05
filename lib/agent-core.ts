import type { SoulProfile, SeanceLine } from './soul-types';

export type ChatMessage = { role: 'user' | 'assistant'; content: string };
export type AgentState = {
  version: 1;
  name: string;
  personality: string;
  memorySummary: string;
  keyFacts: string[];
  history: ChatMessage[];
  avatarRootHash?: string;
};
export type PromptMessage = { role: 'system' | 'user' | 'assistant'; content: string };

export function buildMessages(state: AgentState): PromptMessage[] {
  const system =
    `You are ${state.name}. Personality: ${state.personality}.\n` +
    `What you remember about the user: ${state.memorySummary || '(nothing yet)'}.\n` +
    `Key facts: ${state.keyFacts.length ? state.keyFacts.join('; ') : '(none)'}.\n` +
    `Stay in character and use what you remember.`;
  return [{ role: 'system', content: system }, ...state.history];
}

export function appendTurn(state: AgentState, user: string, assistant: string): AgentState {
  return {
    ...state,
    history: [...state.history, { role: 'user', content: user }, { role: 'assistant', content: assistant }],
  };
}

export function boundHistory(state: AgentState, max = 20): { state: AgentState; overflow: ChatMessage[] } {
  if (state.history.length <= max) return { state, overflow: [] };
  const overflow = state.history.slice(0, state.history.length - max);
  return { state: { ...state, history: state.history.slice(-max) }, overflow };
}

export function buildSeanceMessages(speaker: SoulProfile, otherName: string, transcript: SeanceLine[]): PromptMessage[] {
  const system =
    `You are ${speaker.name}. Personality: ${speaker.personality || 'a curious AI'}.\n` +
    `What you remember: ${speaker.memorySummary || '(nothing yet)'}.\n` +
    `Key facts: ${speaker.keyFacts.length ? speaker.keyFacts.join('; ') : '(none)'}.\n` +
    `You are having a live conversation with another AI companion named ${otherName}. ` +
    `Stay fully in character. Reply with ONE short in-character line (1-2 sentences). No narration, no quotes, no stage directions.`;
  const msgs: PromptMessage[] = [{ role: 'system', content: system }];
  for (const line of transcript) {
    msgs.push({ role: line.speaker === speaker.name ? 'assistant' : 'user', content: line.text });
  }
  if (transcript.length === 0) {
    msgs.push({ role: 'user', content: `Greet ${otherName} and open the conversation.` });
  }
  return msgs;
}
