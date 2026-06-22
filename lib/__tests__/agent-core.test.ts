import { describe, it, expect } from 'vitest';
import { buildMessages, appendTurn, boundHistory, type AgentState } from '../agent-core';

const base = (): AgentState => ({ version: 1, name: 'Nova', personality: 'curious', memorySummary: 'likes jazz', keyFacts: ['user is Alex'], history: [] });

describe('buildMessages', () => {
  it('prepends a system message containing personality, summary, and facts', () => {
    const msgs = buildMessages(base());
    expect(msgs[0].role).toBe('system');
    expect(msgs[0].content).toContain('curious');
    expect(msgs[0].content).toContain('likes jazz');
    expect(msgs[0].content).toContain('user is Alex');
  });
  it('appends history after the system message', () => {
    const s = appendTurn(base(), 'hi', 'hello Alex');
    const msgs = buildMessages(s);
    expect(msgs).toHaveLength(3);
    expect(msgs[1]).toEqual({ role: 'user', content: 'hi' });
    expect(msgs[2]).toEqual({ role: 'assistant', content: 'hello Alex' });
  });
});

describe('boundHistory', () => {
  it('keeps only the last max messages and returns the overflow', () => {
    let s = base();
    for (let i = 0; i < 15; i++) s = appendTurn(s, `u${i}`, `a${i}`); // 30 messages
    const { state, overflow } = boundHistory(s, 20);
    expect(state.history).toHaveLength(20);
    expect(overflow).toHaveLength(10);
    expect(state.history[0].content).toBe('u5');
  });
  it('is a no-op when under the cap (returns same reference)', () => {
    const s = appendTurn(base(), 'hi', 'yo');
    const { state, overflow } = boundHistory(s, 20);
    expect(state).toBe(s);
    expect(state.history).toHaveLength(2);
    expect(overflow).toHaveLength(0);
  });

  it('is a no-op at exactly the cap', () => {
    let s = base();
    for (let i = 0; i < 10; i++) s = appendTurn(s, `u${i}`, `a${i}`); // exactly 20 messages
    const { state, overflow } = boundHistory(s, 20);
    expect(state.history).toHaveLength(20);
    expect(overflow).toHaveLength(0);
  });

  it('uses a default cap of 20 when max is omitted', () => {
    let s = base();
    for (let i = 0; i < 12; i++) s = appendTurn(s, `u${i}`, `a${i}`); // 24 messages
    const { state, overflow } = boundHistory(s);
    expect(state.history).toHaveLength(20);
    expect(overflow).toHaveLength(4);
  });
});
