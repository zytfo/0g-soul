'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Terminal } from '@/components/Terminal';
import { fetchSoulProfile, streamSeanceTurn, avatarUrl } from '@/lib/soul-client';
import type { SoulProfile, SeanceLine } from '@/lib/soul-types';

const TURNS_PER_ROUND = 8;

type Entry = { id: number; speaker: SoulProfile; text: string };
let _id = 0;

export function SeanceRunner({ a, b }: { a: string; b: string }) {
  const [souls, setSouls] = useState<[SoulProfile, SoulProfile] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [feed, setFeed] = useState<Entry[]>([]);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const stopFlag = useRef(false);
  const started = useRef(false);
  const scroller = useRef<HTMLDivElement>(null);
  const transcript = useRef<SeanceLine[]>([]);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: 'smooth' });
  }, [feed]);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    (async () => {
      const [pa, pb] = await Promise.all([fetchSoulProfile(a), fetchSoulProfile(b)]);
      if (!pa || !pb) { setError('could not summon one of the souls'); return; }
      setSouls([pa, pb]);
      runRounds([pa, pb], TURNS_PER_ROUND);
    })();
  }, [a, b]);

  async function runRounds(pair: [SoulProfile, SoulProfile], turns: number) {
    setRunning(true);
    setDone(false);
    stopFlag.current = false;
    let speakerIdx = feed.length % 2; // resume alternation
    for (let t = 0; t < turns; t++) {
      if (stopFlag.current) break;
      const speaker = pair[speakerIdx];
      const other = pair[1 - speakerIdx];
      const entryId = ++_id;
      setFeed((f) => [...f, { id: entryId, speaker, text: '' }]);
      let line = '';
      try {
        line = await streamSeanceTurn(speaker, other.name, transcript.current, (d) => {
          setFeed((f) => f.map((e) => (e.id === entryId ? { ...e, text: e.text + d } : e)));
        });
      } catch {
        setFeed((f) => f.map((e) => (e.id === entryId ? { ...e, text: '… (the séance faded)' } : e)));
        break;
      }
      if (!line.trim()) { setFeed((f) => f.filter((e) => e.id !== entryId)); break; }
      transcript.current = [...transcript.current, { speaker: speaker.name, text: line }];
      speakerIdx = 1 - speakerIdx;
    }
    setRunning(false);
    setDone(true);
  }

  const shareUrl = `https://0g-soul.vercel.app/seance/${a}/${b}`;
  const tweet = souls
    ? `https://twitter.com/intent/tweet?text=${encodeURIComponent(`${souls[0].name} just had a séance with ${souls[1].name} on 0G 👻 two on-chain AIs talking`)}&url=${encodeURIComponent(shareUrl)}`
    : '#';

  return (
    <Terminal path="~/seance">
      <div className="flex h-[78vh] flex-col md:h-[64vh]">
        <div className="mb-3 flex items-center gap-3 border-b border-[var(--phosphor-deep)] pb-2 text-sm">
          <Link href="/seance" className="term-btn shrink-0 rounded-sm px-2 py-0.5 text-xs">‹ back</Link>
          <span className="glow truncate">
            ⚯ séance{souls ? `: ${souls[0].name} × ${souls[1].name}` : ''}
          </span>
        </div>

        <div ref={scroller} className="flex-1 space-y-3 overflow-y-auto pr-1 min-h-0">
          {error && <p className="glow-magenta text-sm">! {error}</p>}
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
          {running && <p className="text-[var(--phosphor-dim)] text-sm">…<span className="cursor" /></p>}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-[var(--phosphor-deep)] pt-3">
          {running ? (
            <button onClick={() => { stopFlag.current = true; }} className="term-btn rounded-sm px-4 py-2 text-sm">stop</button>
          ) : (
            souls && <button onClick={() => runRounds(souls, TURNS_PER_ROUND)} className="term-btn rounded-sm px-4 py-2 text-sm">
              {done ? 'continue ↻' : 'begin'}
            </button>
          )}
          {souls && <a href={tweet} target="_blank" rel="noopener noreferrer" className="term-btn rounded-sm px-4 py-2 text-sm">share to X ◈</a>}
        </div>
      </div>
    </Terminal>
  );
}
