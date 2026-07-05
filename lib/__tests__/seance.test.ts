import { describe, it, expect } from 'vitest';
import { buildSeanceMessages } from '../agent-core';
import type { SoulProfile } from '../soul-types';

const soul = (name: string): SoulProfile => ({
  tokenId: '1', name, personality: `${name} is bold`, memorySummary: '', keyFacts: [], avatarRootHash: undefined,
});

describe('buildSeanceMessages', () => {
  it('system prompt names the speaker, the other, and the persona', () => {
    const m = buildSeanceMessages(soul('Nova'), 'Sio', []);
    expect(m[0].role).toBe('system');
    expect(m[0].content).toContain('Nova');
    expect(m[0].content).toContain('Sio');
    expect(m[0].content).toContain('Nova is bold');
  });
  it('opens the conversation when the transcript is empty', () => {
    const m = buildSeanceMessages(soul('Nova'), 'Sio', []);
    expect(m[m.length - 1]).toEqual({ role: 'user', content: 'Greet Sio and open the conversation.' });
  });
  it('maps the transcript: own lines → assistant, the other → user', () => {
    const t = [{ speaker: 'Nova', text: 'hi' }, { speaker: 'Sio', text: 'greetings' }];
    const m = buildSeanceMessages(soul('Nova'), 'Sio', t);
    expect(m[1]).toEqual({ role: 'assistant', content: 'hi' });
    expect(m[2]).toEqual({ role: 'user', content: 'greetings' });
  });
});
