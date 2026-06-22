'use client';

import '@rainbow-me/rainbowkit/styles.css';
import { RainbowKitProvider, getDefaultConfig } from '@rainbow-me/rainbowkit';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { galileo } from '@/lib/chain';

const config = getDefaultConfig({
  appName: 'Soul',
  // A real WalletConnect projectId enables mobile QR; injected (MetaMask) works without it.
  projectId: process.env.NEXT_PUBLIC_WC_PROJECT_ID || 'soul-demo',
  chains: [galileo],
  ssr: true,
});

const queryClient = new QueryClient();

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>{children}</RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
