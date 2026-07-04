export type Distilled = { memorySummary: string; keyFacts: string[] };

/** Parse the model's JSON memory extraction. Tolerant of code fences / surrounding prose. */
export function parseDistill(text: string): Distilled {
  const cleaned = text.replace(/```json/gi, '').replace(/```/g, '').trim();
  const match = cleaned.match(/\{[\s\S]*\}/);
  const json = JSON.parse(match ? match[0] : cleaned);
  const memorySummary = typeof json.summary === 'string' ? json.summary.trim() : '';
  const keyFacts = Array.isArray(json.facts)
    ? json.facts
        .filter((f: unknown): f is string => typeof f === 'string' && f.trim().length > 0)
        .map((f: string) => f.trim())
        .slice(0, 6)
    : [];
  return { memorySummary, keyFacts };
}
