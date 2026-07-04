import { describe, it, expect, vi, afterEach } from 'vitest';
import { avatarPrompt, generateAvatar } from '../og-image';

describe('avatarPrompt', () => {
  it('always asks to keep the CRT soul style and 512 framing', () => {
    const p = avatarPrompt('anything');
    expect(p.toLowerCase()).toContain('soul');
    expect(p.toLowerCase()).toContain('pixel');
  });
  it('weaves the personality text into the prompt', () => {
    const p = avatarPrompt('a grumpy space pirate who loves cats');
    expect(p).toContain('grumpy space pirate who loves cats');
  });
  it('maps the four presets to mutually distinct color directives', () => {
    const prompts = [
      avatarPrompt('warm, witty'),
      avatarPrompt('a calm, stoic mentor'),
      avatarPrompt('a chaotic, mischievous gremlin'),
      avatarPrompt('a dreamy poet'),
    ];
    expect(new Set(prompts).size).toBe(4);
  });
});

describe('generateAvatar error paths', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('throws when ROUTER_API_KEY is missing', async () => {
    vi.stubEnv('ROUTER_API_KEY', '');
    await expect(generateAvatar('warm')).rejects.toThrow(/ROUTER_API_KEY/);
  });

  it('throws when the API responds non-ok', async () => {
    vi.stubEnv('ROUTER_API_KEY', 'k');
    vi.stubGlobal('fetch', vi.fn(async () => new Response('boom', { status: 500 })));
    await expect(generateAvatar('warm')).rejects.toThrow(/image edit failed/);
  });

  it('throws when the response has no image', async () => {
    vi.stubEnv('ROUTER_API_KEY', 'k');
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify({ data: [{}] }), { status: 200 })),
    );
    await expect(generateAvatar('warm')).rejects.toThrow(/no image/);
  });
});
