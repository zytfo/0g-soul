import { describe, it, expect } from 'vitest';
import { readingPauseMs } from '../seance-pace';

describe('readingPauseMs', () => {
  it('slow mode waits longer than normal for the same text', () => {
    expect(readingPauseMs('hello world', 'slow')).toBeGreaterThan(readingPauseMs('hello world', 'normal'));
  });
  it('scales with text length', () => {
    expect(readingPauseMs('x'.repeat(100), 'normal')).toBeGreaterThan(readingPauseMs('hi', 'normal'));
  });
});
