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
