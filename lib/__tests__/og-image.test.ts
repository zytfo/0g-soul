import { describe, it, expect, vi, afterEach } from 'vitest';
import { avatarPrompt, evolveAvatarPrompt, generateAvatar } from '../og-image';

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

describe('evolveAvatarPrompt', () => {
  it('includes personality, summary, and facts', () => {
    const p = evolveAvatarPrompt({
      personality: 'warm poet',
      memorySummary: 'user loves stargazing',
      keyFacts: ['night owl', 'plays piano'],
    });
    expect(p).toContain('warm poet');
    expect(p).toContain('stargazing');
    expect(p).toContain('night owl');
    expect(p.toLowerCase()).toContain('evolve');
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

  it('throws when mainnet ROUTER_MAINNET_API_KEY is missing', async () => {
    vi.stubEnv('ROUTER_MAINNET_API_KEY', '');
    await expect(generateAvatar('warm', { network: 'mainnet' })).rejects.toThrow(/ROUTER_MAINNET_API_KEY/);
  });

  it('mainnet uses z-image-turbo via generations endpoint', async () => {
    vi.stubEnv('ROUTER_MAINNET_API_KEY', 'k');
    const b64 = Buffer.from('png').toString('base64');
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ data: [{ b64_json: b64 }] }), { status: 200 }),
    );
    vi.stubGlobal('fetch', fetchMock);
    await generateAvatar('warm', { network: 'mainnet' });
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/images/generations'),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer k',
          'Content-Type': 'application/json',
        }),
      }),
    );
    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(body.model).toBe('z-image-turbo');
    expect(body.response_format).toBe('b64_json');
  });
});
