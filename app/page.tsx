'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAccount } from 'wagmi';
import { Terminal, SoulBanner } from '@/components/Terminal';
import { ChatConsole } from '@/components/ChatConsole';
import { listSouls, avatarUrl, type SoulRef } from '@/lib/soul-client';
import type { AgentState } from '@/lib/agent-core';

const PRESETS = [
  { label: 'warm & witty', value: 'warm, witty, and genuinely curious about the user' },
  { label: 'stoic mentor', value: 'a calm, stoic mentor who speaks in short, weighty sentences' },
  { label: 'chaotic gremlin', value: 'a chaotic, mischievous gremlin who teases lovingly' },
  { label: 'dreamy poet', value: 'a dreamy poet who notices small beautiful details' },
];

const BOOT = [
  'booting soul kernel v0.1 …',
  'mounting 0G Storage … ok',
  'linking 0G Compute router … ok',
  'attaching 0G Chain (galileo:16602) … ok',
  'an AI you actually own. its memory lives on-chain.',
];

export default function Home() {
  const [stage, setStage] = useState<'create' | 'chat'>('create');
  const [name, setName] = useState('');
  const [persona, setPersona] = useState(PRESETS[0].value);
  const [state, setState] = useState<AgentState | null>(null);
  const [avatarRootHash, setAvatarRootHash] = useState<string>();
  const [genning, setGenning] = useState(false);
  const [genError, setGenError] = useState<string>();
  const { address } = useAccount();
  const [souls, setSouls] = useState<SoulRef[]>([]);
  useEffect(() => {
    setSouls(address ? listSouls(address) : []);
  }, [address]);

  function create(e: React.FormEvent) {
    e.preventDefault();
    const n = name.trim() || 'Nova';
    setState({
      version: 1,
      name: n,
      personality: persona,
      memorySummary: '',
      keyFacts: [],
      history: [],
      avatarRootHash,
    });
    setStage('chat');
  }

  return (
    <Terminal path={stage === 'chat' ? `~/${(state?.name ?? '').toLowerCase()}` : '~'}>
      {stage === 'create' ? (
        <div className="space-y-6">
          <div className="reveal">
            <SoulBanner />
          </div>

          <div className="space-y-1">
            {BOOT.map((l, i) => (
              <p
                key={i}
                className="reveal text-sm text-[var(--phosphor-dim)]"
                style={{ animationDelay: `${0.15 + i * 0.25}s` }}
              >
                <span className="text-[var(--phosphor-deep)]">›</span> {l}
              </p>
            ))}
          </div>

          {souls.length > 0 && (
            <div
              className="reveal space-y-2 border-t border-[var(--phosphor-deep)] pt-5"
              style={{ animationDelay: `${0.15 + BOOT.length * 0.25}s` }}
            >
              <p className="text-sm text-[var(--phosphor-dim)]">your souls ({souls.length})</p>
              <div className="space-y-1">
                {souls.map((s) => (
                  <Link
                    key={s.tokenId}
                    href={`/agent/${s.tokenId}`}
                    className="flex items-center justify-between border border-[var(--phosphor-deep)] px-3 py-2 text-sm transition-colors hover:bg-[rgba(52,255,156,0.06)]"
                  >
                    <span className="flex items-center gap-2 glow">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src="/logo.png" alt="" className="h-6 w-6 shrink-0" />
                      ◈ {s.name}{' '}
                      <span className="text-[var(--phosphor-dim)]">· Soul #{s.tokenId}</span>
                    </span>
                    <span className="text-[var(--phosphor-deep)]">resume ›</span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          <form
            onSubmit={create}
            className="reveal space-y-5 border-t border-[var(--phosphor-deep)] pt-6"
            style={{ animationDelay: `${0.2 + BOOT.length * 0.25}s` }}
          >
            <label className="block">
              <span className="text-sm text-[var(--phosphor-dim)]">name your soul</span>
              <div className="mt-1 flex items-center gap-2">
                <span className="glow">$</span>
                <input
                  className="term-input flex-1"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nova"
                  maxLength={24}
                  autoFocus
                />
              </div>
            </label>

            <div>
              <span className="text-sm text-[var(--phosphor-dim)]">choose a personality</span>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {PRESETS.map((p) => (
                  <button
                    type="button"
                    key={p.label}
                    onClick={() => setPersona(p.value)}
                    aria-pressed={persona === p.value}
                    className={`term-btn rounded-sm px-3 py-2 text-left text-xs ${
                      persona === p.value ? 'is-active' : ''
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <button
                type="button"
                disabled={genning}
                className="term-btn rounded-sm px-3 py-2 text-xs"
                onClick={async () => {
                  setGenning(true);
                  setGenError(undefined);
                  try {
                    const res = await fetch('/api/avatar', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ personality: persona }),
                    });
                    const j = await res.json().catch(() => ({}));
                    if (!res.ok || !j.rootHash) throw new Error(j.error || `generation failed (${res.status})`);
                    setAvatarRootHash(j.rootHash);
                  } catch (err) {
                    setGenError(err instanceof Error ? err.message : 'generation failed');
                  } finally {
                    setGenning(false);
                  }
                }}
              >
                {genning
                  ? 'rendering on 0G Compute… ~30s'
                  : avatarRootHash
                    ? 'regenerate face'
                    : 'generate face (0G image model)'}
              </button>
              {genError && <p className="text-xs glow-magenta">! {genError}</p>}
              {avatarRootHash && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatarUrl(avatarRootHash)}
                  alt="avatar preview"
                  className="mt-2 h-20 w-20 rounded-sm border border-[var(--phosphor-deep)]"
                />
              )}
            </div>

            <button type="submit" className="term-btn glow rounded-sm px-5 py-2 text-sm">
              initialize ◈
            </button>
          </form>
        </div>
      ) : (
        state && (
          <ChatConsole
            initialState={state}
            onBack={() => {
              setStage('create');
              setSouls(address ? listSouls(address) : []);
            }}
          />
        )
      )}
    </Terminal>
  );
}
