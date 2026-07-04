import { describe, it, expect } from 'vitest';
import { composeSoulMeta } from '../soul-meta';
import type { AgentState } from '../agent-core';

const st = (over: Partial<AgentState> = {}): AgentState => ({
  version: 1, name: 'Nova', personality: 'warm', memorySummary: '', keyFacts: [], history: [], ...over,
});

describe('composeSoulMeta', () => {
  it('uses the state name/personality/avatar when rootHash + state present', () => {
    const m = composeSoulMeta(2n, '0xabc', st({ avatarRootHash: '0xav' }));
    expect(m.name).toBe('Soul · Nova');
    expect(m.personality).toBe('warm');
    expect(m.avatarRootHash).toBe('0xav');
  });
  it('falls back to Soul #id when no rootHash or no state', () => {
    expect(composeSoulMeta(5n, '', null).name).toBe('Soul #5');
    expect(composeSoulMeta(5n, '0xabc', null).name).toBe('Soul #5');
    expect(composeSoulMeta(5n, '', null).personality).toBe('');
  });
});
