import { describe, it, expect } from 'vitest';
import { parseDistill } from '../distill';

describe('parseDistill', () => {
  it('parses clean JSON', () => {
    const d = parseDistill('{"summary":"Alex builds on 0G and loves jazz","facts":["name is Alex","builds on 0G","loves jazz"]}');
    expect(d.memorySummary).toBe('Alex builds on 0G and loves jazz');
    expect(d.keyFacts).toEqual(['name is Alex', 'builds on 0G', 'loves jazz']);
  });

  it('tolerates code fences and surrounding prose', () => {
    const d = parseDistill('Here you go:\n```json\n{"summary":"S","facts":["a","b"]}\n```\nhope that helps');
    expect(d.memorySummary).toBe('S');
    expect(d.keyFacts).toEqual(['a', 'b']);
  });

  it('caps facts at 6 and drops empty/non-string entries', () => {
    const d = parseDistill('{"summary":"x","facts":["1","","2",3,"4","5","6","7","8"]}');
    expect(d.keyFacts).toEqual(['1', '2', '4', '5', '6', '7']);
  });

  it('defaults gracefully when fields are missing', () => {
    const d = parseDistill('{}');
    expect(d.memorySummary).toBe('');
    expect(d.keyFacts).toEqual([]);
  });

  it('throws on unparseable input (so the save flow falls back to un-enriched state)', () => {
    expect(() => parseDistill('not json at all')).toThrow();
    expect(() => parseDistill('')).toThrow();
  });
});
