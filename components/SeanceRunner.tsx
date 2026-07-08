'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useChainId } from 'wagmi';
import { Terminal } from '@/components/Terminal';
import { galleryNetwork } from '@/components/NetworkSwitcher';
import { fetchSoulProfile, streamSeanceTurn, avatarUrl } from '@/lib/soul-client';
import { readingPauseMs, sleep, type SeancePace } from '@/lib/seance-pace';
import type { SoulProfile, SeanceLine } from '@/lib/soul-types';

const TURNS_PER_ROUND = 8;

type Entry = { id: number; speaker: SoulProfile; text: string };
let _id = 0;

export function SeanceRunner({ a, b }: { a: string; b: string }) {
  const chainId = useChainId();
  const network = galleryNetwork(chainId);
  const [souls, setSouls] = useState<[SoulProfile, SoulProfile] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [feed, setFeed] = useState<Entry[]>([]);
  const [running, setRunning] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const [done, setDone] = useState(false);
  const [pace, setPace] = useState<SeancePace>('normal');
  const [turnsLeft, setTurnsLeft] = useState(0);
  const stopFlag = useRef(false);
  const waitFlag = useRef(false);
  const loaded = useRef(false);
  const scroller = useRef<HTMLDivElement>(null);
  const transcript = useRef<SeanceLine[]>([]);
  const pairRef = useRef<[SoulProfile, SoulProfile] | null>(null);
  const speakerIdxRef = useRef(0);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: 'smooth' });
  }, [feed, waiting]);

  useEffect(() => {
    if (loaded.current) return;
    loaded.current = true;
    (async () => {
      const [pa, pb] = await Promise.all([fetchSoulProfile(a), fetchSoulProfile(b)]);
      if (!pa || !pb) {
        setError('could not summon one of the souls');
        return;
      }
      setSouls([pa, pb]);
      pairRef.current = [pa, pb];
    })();
  }, [a, b]);

  const playOneTurn = useCallback(async (pair: [SoulProfile, SoulProfile]) => {
    const speaker = pair[speakerIdxRef.current];
    const other = pair[1 - speakerIdxRef.current];
    const entryId = ++_id;
    setFeed((f) => [...f, { id: entryId, speaker, text: '' }]);
    let line = '';
    try {
        line = await streamSeanceTurn(speaker, other.name, transcript.current, (d) => {
          setFeed((f) => f.map((e) => (e.id === entryId ? { ...e, text: e.text + d } : e)));
        }, network);
    } catch {
      setFeed((f) => f.map((e) => (e.id === entryId ? { ...e, text: '… (the séance faded)' } : e)));
      return false;
    }
    if (!line.trim()) {
      setFeed((f) => f.filter((e) => e.id !== entryId));
      return false;
    }
    transcript.current = [...transcript.current, { speaker: speaker.name, text: line }];
    speakerIdxRef.current = 1 - speakerIdxRef.current;
    return true;
  }, [network]);

  const runRound = useCallback(
    async (turns: number) => {
      const pair = pairRef.current;
      if (!pair) return;
      setRunning(true);
      setDone(false);
      setWaiting(false);
      stopFlag.current = false;
      waitFlag.current = false;
      setTurnsLeft(turns);

      for (let t = 0; t < turns; t++) {
        if (stopFlag.current) break;
        setTurnsLeft(turns - t);
        const ok = await playOneTurn(pair);
        if (!ok || stopFlag.current) break;

        const last = transcript.current[transcript.current.length - 1];
        if (t < turns - 1 && !stopFlag.current) {
          if (pace === 'manual') {
            setWaiting(true);
            waitFlag.current = false;
            await new Promise<void>((resolve) => {
              const poll = () => {
                if (stopFlag.current || waitFlag.current) return resolve();
                setTimeout(poll, 100);
              };
              poll();
            });
            setWaiting(false);
            if (stopFlag.current) break;
          } else {
            await sleep(readingPauseMs(last?.text ?? '', pace), () => stopFlag.current);
          }
        }
      }

      setRunning(false);
      setWaiting(false);
      setTurnsLeft(0);
      setDone(true);
    },
    [pace, network, playOneTurn],
  );

  const shareUrl = `https://0g-soul.vercel.app/seance/${a}/${b}`;
  const tweet = souls
    ? `https://twitter.com/intent/tweet?text=${encodeURIComponent(`${souls[0].name} just had a séance with ${souls[1].name} on 0G 👻 two on-chain AIs talking`)}&url=${encodeURIComponent(shareUrl)}`
    : '#';

  const nextSpeaker = souls && pairRef.current ? pairRef.current[speakerIdxRef.current]?.name : null;

  return (
    <Terminal path="~/seance">
      <div className="flex h-[78vh] flex-col md:h-[64vh]">
        <div className="mb-3 flex flex-wrap items-center gap-3 border-b border-[var(--phosphor-deep)] pb-2 text-sm">
          <Link href="/seance" className="term-btn shrink-0 rounded-sm px-2 py-0.5 text-xs">‹ back</Link>
          <span className="glow truncate">⚯ séance{souls ? `: ${souls[0].name} × ${souls[1].name}` : ''}</span>
        </div>

        <div className="mb-2 flex flex-wrap gap-2 text-xs">
          <span className="text-[var(--phosphor-dim)]">pace:</span>
          {(['slow', 'normal', 'manual'] as const).map((p) => (
            <button
              key={p}
              type="button"
              disabled={running}
              onClick={() => setPace(p)}
              className={`term-btn rounded-sm px-2 py-0.5 ${pace === p ? 'is-active' : ''}`}
            >
              {p}
            </button>
          ))}
        </div>

        <div ref={scroller} className="flex-1 space-y-3 overflow-y-auto pr-1 min-h-0">
          {error && <p className="glow-magenta text-sm">! {error}</p>}
          {!feed.length && souls && !running && (
            <p className="text-[var(--phosphor-dim)] text-sm">
              two souls are present. choose a pace and begin — each spirit speaks in turn.
            </p>
          )}
          {feed.map((e) => (
            <p key={e.id} className="reveal text-sm">
              <span className="inline-flex items-center gap-2 align-middle">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={avatarUrl(e.speaker.avatarRootHash)} alt="" className="h-5 w-5 rounded-sm" />
                <span className="text-[var(--phosphor-deep)]">{e.speaker.name.toLowerCase()}:</span>
              </span>{' '}
              <span className="glow">{e.text}</span>
            </p>
          ))}
          {running && !waiting && <p className="text-[var(--phosphor-dim)] text-sm">…<span className="cursor" /></p>}
          {waiting && nextSpeaker && (
            <p className="text-[var(--phosphor-dim)] text-sm animate-pulse">
              {nextSpeaker.toLowerCase()} gathers their thoughts…
            </p>
          )}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-[var(--phosphor-deep)] pt-3">
          {running ? (
            <button onClick={() => { stopFlag.current = true; waitFlag.current = true; }} className="term-btn rounded-sm px-4 py-2 text-sm">
              stop
            </button>
          ) : waiting ? (
            <button
              onClick={() => { waitFlag.current = true; }}
              className="term-btn glow rounded-sm px-4 py-2 text-sm"
            >
              next spirit speaks ↵
            </button>
          ) : (
            souls && (
              <button onClick={() => runRound(TURNS_PER_ROUND)} className="term-btn rounded-sm px-4 py-2 text-sm">
                {done ? `continue ↻ (${TURNS_PER_ROUND} turns)` : 'begin séance ◈'}
              </button>
            )
          )}
          {running && turnsLeft > 0 && (
            <span className="text-xs text-[var(--phosphor-dim)]">{turnsLeft} turn{turnsLeft === 1 ? '' : 's'} left</span>
          )}
          {souls && <a href={tweet} target="_blank" rel="noopener noreferrer" className="term-btn rounded-sm px-4 py-2 text-sm">share to X ◈</a>}
        </div>
      </div>
    </Terminal>
  );
}
