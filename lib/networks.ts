import { defineChain, type Chain } from 'viem';

export type NetworkId = 'testnet' | 'mainnet';

/** 0G Galileo testnet (chain ID 16602). */
export const galileo = defineChain({
  id: 16602,
  name: '0G Galileo Testnet',
  nativeCurrency: { name: '0G', symbol: '0G', decimals: 18 },
  rpcUrls: { default: { http: ['https://evmrpc-testnet.0g.ai'] } },
  blockExplorers: { default: { name: '0G Scan', url: 'https://chainscan-galileo.0g.ai' } },
  testnet: true,
});

/** 0G Aristotle mainnet (chain ID 16661). */
export const aristotle = defineChain({
  id: 16661,
  name: '0G Mainnet',
  nativeCurrency: { name: '0G', symbol: '0G', decimals: 18 },
  rpcUrls: { default: { http: ['https://evmrpc.0g.ai'] } },
  blockExplorers: { default: { name: '0G Scan', url: 'https://chainscan.0g.ai' } },
});

export const NETWORKS: Record<
  NetworkId,
  { chain: Chain; rpc: string; indexer: string; explorer: string; contractEnv: string }
> = {
  testnet: {
    chain: galileo,
    rpc: 'https://evmrpc-testnet.0g.ai',
    indexer: 'https://indexer-storage-testnet-turbo.0g.ai',
    explorer: 'https://chainscan-galileo.0g.ai',
    contractEnv: 'NEXT_PUBLIC_CONTRACT_ADDRESS',
  },
  mainnet: {
    chain: aristotle,
    rpc: 'https://evmrpc.0g.ai',
    indexer: 'https://indexer-storage-turbo.0g.ai',
    explorer: 'https://chainscan.0g.ai',
    contractEnv: 'NEXT_PUBLIC_MAINNET_CONTRACT_ADDRESS',
  },
};

const DEFAULT_TESTNET = '0x956C346365e0D538cA5c6DB071B7a83F9c57E656' as const;
const DEFAULT_MAINNET = '0x9BDe8f9a9Aa62BDBc10Cf35abA25B444Ce09761C' as const;

export function parseNetwork(raw: string | null | undefined): NetworkId {
  return raw === 'mainnet' ? 'mainnet' : 'testnet';
}

export function networkFromChainId(chainId?: number): NetworkId {
  if (chainId === aristotle.id) return 'mainnet';
  return 'testnet';
}

export function contractAddress(network: NetworkId = 'testnet'): `0x${string}` {
  if (network === 'mainnet') {
    return (process.env.NEXT_PUBLIC_MAINNET_CONTRACT_ADDRESS || DEFAULT_MAINNET) as `0x${string}`;
  }
  return (process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || DEFAULT_TESTNET) as `0x${string}`;
}

export function contractAddressForChain(chainId?: number): `0x${string}` {
  return contractAddress(networkFromChainId(chainId));
}

export function explorerTx(network: NetworkId, hash: string): string {
  return `${NETWORKS[network].explorer}/tx/${hash}`;
}
