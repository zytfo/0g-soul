'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useChainId } from 'wagmi';
import { Terminal } from '@/components/Terminal';
import { avatarUrl } from '@/lib/soul-client';
import { galleryNetwork } from '@/components/NetworkSwitcher';

type Card = { tokenId: string; name: string; avatarRootHash: string | null; owner: string | null };

const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;

function SkeletonCard() {
  return (
    <div className="border border-[var(--phosphor-deep)] rounded-sm p-3 animate-pulse">
      <div className="mb-2 aspect-square w-full rounded-sm bg-[rgba(52,255,156,0.06)]" />
      <div className="h-4 w-3/4 rounded-sm bg-[rgba(52,255,156,0.08)]" />
      <div className="mt-2 h-3 w-1/2 rounded-sm bg-[rgba(52,255,156,0.05)]" />
    </div>
  );
}

export default function Explore() {
  const chainId = useChainId();
  const network = galleryNetwork(chainId);
  const [souls, setSouls] = useState<Card[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [done, setDone] = useState(false);
  const started = useRef(false);

  const load = useCallback(
    async (c: string | null, reset = false) => {
      setLoading(true);
      const qs = new URLSearchParams({ network });
      if (c) qs.set('cursor', c);
      const j = await fetch(`/api/gallery?${qs}`)
        .then((r) => r.json())
        .catch(() => ({ souls: [], nextCursor: null }));
      setSouls((prev) => (reset ? [] : prev).concat((j.souls ?? []) as Card[]));
      setCursor(j.nextCursor ?? null);
      if (!j.nextCursor) setDone(true);
      setLoading(false);
    },
    [network],
  );

  useEffect(() => {
    started.current = false;
  }, [network]);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    load(null, true);
  }, [load]);

  const empty = !loading && done && souls.length === 0;

  return (
    <Terminal path="~/explore">
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Link href="/" className="term-btn shrink-0 rounded-sm px-2 py-0.5 text-xs">‹ back</Link>
          <div>
            <p className="glow text-lg">{'// the soul gallery'}</p>
            <p className="text-[var(--phosphor-deep)] text-xs">
              every Soul on {network === 'mainnet' ? '0G Mainnet' : 'Galileo testnet'} — from anyone
            </p>
            <Link href="/seance" className="text-xs text-[var(--phosphor-dim)] underline decoration-dotted">⚯ start a séance ›</Link>
          </div>
        </div>

        {empty ? (
          <p className="text-[var(--phosphor-dim)] text-sm">no souls yet on this network — be the first to mint one.</p>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {loading && souls.length === 0
                ? Array.from({ length: 6 }, (_, i) => <SkeletonCard key={i} />)
                : souls.map((s) => (
                    <Link
                      key={s.tokenId}
                      href={`/agent/${s.tokenId}`}
                      className="border border-[var(--phosphor-deep)] rounded-sm p-3 transition-colors hover:bg-[rgba(52,255,156,0.06)]"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={avatarUrl(s.avatarRootHash ?? undefined, network)}
                        alt={s.name}
                        loading="lazy"
                        className="mb-2 aspect-square w-full rounded-sm border border-[var(--phosphor-deep)] object-cover"
                      />
                      <p className="glow text-sm truncate">{s.name}</p>
                      <p className="text-[var(--phosphor-deep)] text-xs">
                        #{s.tokenId}
                        {s.owner && <span> · by {short(s.owner)}</span>}
                      </p>
                    </Link>
                  ))}
            </div>

            <div className="pt-2 text-center text-sm">
              {loading && souls.length > 0 ? (
                <p className="text-[var(--phosphor-dim)]">loading more…<span className="cursor" /></p>
              ) : loading ? (
                <p className="text-[var(--phosphor-dim)]">loading from 0G Chain…<span className="cursor" /></p>
              ) : done ? (
                <p className="text-[var(--phosphor-deep)]">— that&apos;s all {souls.length} souls —</p>
              ) : (
                <button onClick={() => load(cursor)} className="term-btn rounded-sm px-4 py-2">
                  load more ↓
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </Terminal>
  );
}
