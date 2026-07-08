import type { NetworkId } from './networks';

const TESTNET_ROUTER = 'https://router-api-testnet.integratenetwork.work/v1';
const MAINNET_ROUTER = 'https://router-api.0g.ai/v1';

export type RouterConfig = { baseURL: string; apiKey: string };

/** 0G Compute Router credentials — testnet and mainnet are fully separate (pc.testnet.0g.ai vs pc.0g.ai). */
export function routerConfig(network: NetworkId = 'testnet'): RouterConfig {
  if (network === 'mainnet') {
    const apiKey = process.env.ROUTER_MAINNET_API_KEY;
    if (!apiKey) throw new Error('ROUTER_MAINNET_API_KEY is not set (create at pc.0g.ai)');
    return {
      baseURL: process.env.ROUTER_MAINNET_BASE_URL || MAINNET_ROUTER,
      apiKey,
    };
  }
  const apiKey = process.env.ROUTER_API_KEY;
  if (!apiKey) throw new Error('ROUTER_API_KEY is not set (create at pc.testnet.0g.ai)');
  return {
    baseURL: process.env.ROUTER_BASE_URL || TESTNET_ROUTER,
    apiKey,
  };
}

export function routerModel(network: NetworkId = 'testnet'): string {
  if (network === 'mainnet') {
    const m = process.env.ROUTER_MAINNET_MODEL || process.env.ROUTER_MODEL || process.env.MODEL;
    if (!m) throw new Error('ROUTER_MAINNET_MODEL or ROUTER_MODEL is not set');
    return m;
  }
  const m = process.env.ROUTER_MODEL || process.env.MODEL;
  if (!m) throw new Error('ROUTER_MODEL is not set');
  return m;
}
