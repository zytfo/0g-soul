export type SeancePace = 'slow' | 'normal' | 'manual';

/** Pause after a line finishes streaming so the viewer can read it. */
export function readingPauseMs(text: string, pace: Exclude<SeancePace, 'manual'>): number {
  const base = pace === 'slow' ? 3000 : 1500;
  const perChar = pace === 'slow' ? 40 : 25;
  return base + text.length * perChar;
}

export function sleep(ms: number, stop?: () => boolean): Promise<void> {
  return new Promise((resolve) => {
    const start = Date.now();
    const tick = () => {
      if (stop?.()) return resolve();
      if (Date.now() - start >= ms) return resolve();
      setTimeout(tick, 80);
    };
    tick();
  });
}
