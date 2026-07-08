'use client';

import { useSyncExternalStore } from 'react';
import { useAccount, useChainId, useSwitchChain } from 'wagmi';
import { aristotle, galileo, type NetworkId } from '@/lib/networks';

const STORAGE_KEY = 'soul:network-pref';
const listeners = new Set<() => void>();

function subscribePref(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

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
    listeners.forEach((l) => l());
  } catch {}
}

/** Browse/read network: wallet chain when on 0G, else saved pref (works disconnected). */
export function useGalleryNetwork(): NetworkId {
  const chainId = useChainId();
  const { isConnected } = useAccount();
  const pref = useSyncExternalStore(subscribePref, readNetworkPref, () => 'testnet' as NetworkId);

  if (isConnected) {
    if (chainId === aristotle.id) return 'mainnet';
    if (chainId === galileo.id) return 'testnet';
  }
  return pref;
}

/** @deprecated use useGalleryNetwork() in client components */
export function galleryNetwork(chainId?: number): NetworkId {
  if (chainId === aristotle.id) return 'mainnet';
  if (chainId === galileo.id) return 'testnet';
  return readNetworkPref();
}

export function useSoulNetwork(): { network: NetworkId; switchNetwork: (n: NetworkId) => Promise<void>; switching: boolean } {
  const chainId = useChainId();
  const { isConnected } = useAccount();
  const { switchChainAsync, isPending } = useSwitchChain();
  const network = useGalleryNetwork();

  async function switchNetwork(n: NetworkId) {
    writeNetworkPref(n);
    if (!isConnected) return;
    const target = n === 'mainnet' ? aristotle.id : galileo.id;
    if (chainId !== target) await switchChainAsync({ chainId: target });
  }

  return { network, switchNetwork, switching: isPending };
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
          {n === 'testnet' ? 'testnet' : 'mainnet'}
        </button>
      ))}
    </div>
  );
}
