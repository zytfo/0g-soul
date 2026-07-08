'use client';

import { useAccount, useChainId, useSwitchChain } from 'wagmi';
import { aristotle, galileo, networkFromChainId, type NetworkId } from '@/lib/networks';

const STORAGE_KEY = 'soul:network-pref';

export function readNetworkPref(): NetworkId {
  if (typeof window === 'undefined') return 'testnet';
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v === 'mainnet' ? 'mainnet' : 'testnet';
  } catch {
    return 'testnet';
  }
}

export function writeNetworkPref(network: NetworkId) {
  try {
    localStorage.setItem(STORAGE_KEY, network);
  } catch {}
}

export function useSoulNetwork(): { network: NetworkId; switchNetwork: (n: NetworkId) => Promise<void>; switching: boolean } {
  const chainId = useChainId();
  const { switchChainAsync, isPending } = useSwitchChain();
  const network = networkFromChainId(chainId);

  async function switchNetwork(n: NetworkId) {
    writeNetworkPref(n);
    const target = n === 'mainnet' ? aristotle.id : galileo.id;
    if (chainId !== target) await switchChainAsync({ chainId: target });
  }

  return { network, switchNetwork, switching: isPending };
}

/** Gallery / read APIs follow wallet network when connected, else local pref. */
export function galleryNetwork(chainId?: number): NetworkId {
  if (chainId === aristotle.id) return 'mainnet';
  if (chainId === galileo.id) return 'testnet';
  return readNetworkPref();
}

export function NetworkSwitcher() {
  const { network, switchNetwork, switching } = useSoulNetwork();
  const { isConnected } = useAccount();

  return (
    <div className="flex items-center gap-1 text-[10px]">
      {(['testnet', 'mainnet'] as const).map((n) => (
        <button
          key={n}
          type="button"
          disabled={switching}
          onClick={() => switchNetwork(n)}
          className={`term-btn rounded-sm px-2 py-0.5 ${network === n ? 'is-active' : ''}`}
          title={isConnected ? `switch wallet to ${n}` : `browse ${n} souls`}
        >
          {n === 'testnet' ? 'galileo' : 'mainnet'}
        </button>
      ))}
    </div>
  );
}
