'use client';

import { ConnectButton } from '@rainbow-me/rainbowkit';
import Image from 'next/image';
import { ReactNode } from 'react';

export function Terminal({ children, path = '~' }: { children: ReactNode; path?: string }) {
  return (
    <div className="mx-auto w-full max-w-3xl px-3 py-5 sm:py-10">
      <div className="terminal rounded-sm">
        {/* titlebar */}
        <div className="flex items-center justify-between border-b border-[var(--phosphor-deep)] px-3 py-2 text-xs">
          <div className="flex items-center gap-2">
            <Image src="/logo.png" alt="" width={16} height={16} className="opacity-90" />
            <span className="ml-1 inline-block h-2.5 w-2.5 rounded-full bg-[var(--magenta)]" />
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-[var(--amber)]" />
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-[var(--phosphor)]" />
            <span className="ml-2 text-[var(--phosphor-dim)]">soul@0g:{path}$</span>
          </div>
          <ConnectButton.Custom>
            {({ account, chain, openConnectModal, openAccountModal, mounted }) => {
              const connected = mounted && account && chain;
              return (
                <button
                  onClick={connected ? openAccountModal : openConnectModal}
                  className="term-btn px-3 py-1 text-[11px] rounded-sm"
                >
                  {connected ? `◈ ${account.displayName}` : 'connect wallet'}
                </button>
              );
            }}
          </ConnectButton.Custom>
        </div>
        {/* body */}
        <div className="p-4 sm:p-6 min-h-[60vh] text-[15px] leading-relaxed">{children}</div>
      </div>
      <p className="mt-3 text-center text-[11px] text-[var(--phosphor-deep)]">
        memory on 0G Storage · identity on 0G Chain · inference on 0G Compute
      </p>
    </div>
  );
}

/** Logo + wordmark banner for Soul. */
export function SoulBanner() {
  return (
    <div className="flex items-center gap-4">
      <Image
        src="/logo.png"
        alt="Soul"
        width={88}
        height={88}
        priority
        className="h-20 w-20 shrink-0 [filter:drop-shadow(0_0_14px_rgba(52,255,156,0.45))]"
      />
      <div className="leading-none">
        <div
          className="glow font-[family-name:var(--font-display)] text-[clamp(40px,9vw,72px)]"
          aria-label="SOUL"
        >
          SOUL
        </div>
        <p className="mt-1 text-sm text-[var(--phosphor-dim)]">an AI you actually own</p>
      </div>
    </div>
  );
}
