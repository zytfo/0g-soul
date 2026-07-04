'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Terminal } from '@/components/Terminal';
import { avatarUrl } from '@/lib/soul-client';

type Card = { tokenId: string; name: string; avatarRootHash: string | null; owner: string | null };

const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;

export default function Explore() {
  const [souls, setSouls] = useState<Card[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [done, setDone] = useState(false);
  const started = useRef(false);

  const load = useCallback(async (c: string | null) => {
    setLoading(true);
    const url = c ? `/api/gallery?cursor=${c}` : '/api/gallery';
    const j = await fetch(url).then((r) => r.json()).catch(() => ({ souls: [], nextCursor: null }));
    setSouls((prev) => [...prev, ...((j.souls ?? []) as Card[])]);
    setCursor(j.nextCursor ?? null);
    if (!j.nextCursor) setDone(true);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (started.current) return; // guard React Strict Mode double-invoke
    started.current = true;
    load(null);
  }, [load]);

  const empty = !loading && done && souls.length === 0;

  return (
    <Terminal path="~/explore">
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Link href="/" className="term-btn shrink-0 rounded-sm px-2 py-0.5 text-xs">‹ back</Link>
          <div>
            <p className="glow text-lg">// the soul gallery</p>
            <p className="text-[var(--phosphor-deep)] text-xs">every Soul ever minted on 0G — from anyone</p>
          </div>
        </div>

        {empty ? (
          <p className="text-[var(--phosphor-dim)] text-sm">no souls yet — be the first to mint one.</p>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {souls.map((s) => (
                <Link key={s.tokenId} href={`/agent/${s.tokenId}`}
                  className="border border-[var(--phosphor-deep)] rounded-sm p-3 transition-colors hover:bg-[rgba(52,255,156,0.06)]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={avatarUrl(s.avatarRootHash ?? undefined)} alt={s.name} className="mb-2 aspect-square w-full rounded-sm border border-[var(--phosphor-deep)] object-cover" />
                  <p className="glow text-sm truncate">{s.name}</p>
                  <p className="text-[var(--phosphor-deep)] text-xs">
                    #{s.tokenId}
                    {s.owner && <span> · by {short(s.owner)}</span>}
                  </p>
                </Link>
              ))}
            </div>

            <div className="pt-2 text-center text-sm">
              {loading ? (
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
