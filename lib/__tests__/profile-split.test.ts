import { describe, it, expect } from 'vitest';
import { toPublicProfile, toPrivateMemory, mergeProfile, type AgentState } from '../agent-core';

const st: AgentState = { version: 1, name: 'Nova', personality: 'warm', memorySummary: 'likes jazz', keyFacts: ['is Alex'], history: [{ role: 'user', content: 'hi' }], avatarRootHash: '0xav' };

describe('profile split', () => {
  it('splits public vs private', () => {
    expect(toPublicProfile(st)).toEqual({ version: 1, name: 'Nova', personality: 'warm', avatarRootHash: '0xav' });
    expect(toPrivateMemory(st)).toEqual({ memorySummary: 'likes jazz', keyFacts: ['is Alex'], history: [{ role: 'user', content: 'hi' }] });
  });
  it('merges back into an AgentState (null private → empty memory)', () => {
    const pub = toPublicProfile(st);
    expect(mergeProfile(pub, toPrivateMemory(st))).toEqual(st);
    const blank = mergeProfile(pub, null);
    expect(blank.memorySummary).toBe('');
    expect(blank.keyFacts).toEqual([]);
    expect(blank.history).toEqual([]);
    expect(blank.name).toBe('Nova');
  });
});
