import { describe, it, expect, vi, afterEach } from 'vitest';
import { routerConfig, routerModel } from '../router-config';

describe('routerConfig', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('returns testnet defaults', () => {
    vi.stubEnv('ROUTER_API_KEY', 'sk-test');
    vi.stubEnv('ROUTER_BASE_URL', '');
    const c = routerConfig('testnet');
    expect(c.baseURL).toBe('https://router-api-testnet.integratenetwork.work/v1');
    expect(c.apiKey).toBe('sk-test');
  });

  it('returns mainnet defaults', () => {
    vi.stubEnv('ROUTER_MAINNET_API_KEY', 'sk-main');
    vi.stubEnv('ROUTER_MAINNET_BASE_URL', '');
    const c = routerConfig('mainnet');
    expect(c.baseURL).toBe('https://router-api.0g.ai/v1');
    expect(c.apiKey).toBe('sk-main');
  });

  it('throws when mainnet key missing', () => {
    vi.stubEnv('ROUTER_MAINNET_API_KEY', '');
    expect(() => routerConfig('mainnet')).toThrow(/ROUTER_MAINNET_API_KEY/);
  });
});

describe('routerModel', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('uses ROUTER_MODEL on testnet', () => {
    vi.stubEnv('ROUTER_MODEL', 'qwen2.5-omni');
    expect(routerModel('testnet')).toBe('qwen2.5-omni');
  });

  it('prefers ROUTER_MAINNET_MODEL on mainnet', () => {
    vi.stubEnv('ROUTER_MAINNET_MODEL', 'glm-main');
    vi.stubEnv('ROUTER_MODEL', 'qwen2.5-omni');
    expect(routerModel('mainnet')).toBe('glm-main');
  });
});
