'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useAccount } from 'wagmi';
import { Terminal, SoulBanner } from '@/components/Terminal';
import { ChatConsole } from '@/components/ChatConsole';
import { useGalleryNetwork } from '@/components/NetworkSwitcher';
import { listSouls, avatarUrl, agentPath } from '@/lib/soul-client';
import { networkShortLabel } from '@/lib/networks';
import type { AgentState } from '@/lib/agent-core';

const PRESETS = [
  { label: 'warm & witty', value: 'warm, witty, and genuinely curious about the user' },
  { label: 'stoic mentor', value: 'a calm, stoic mentor who speaks in short, weighty sentences' },
  { label: 'chaotic gremlin', value: 'a chaotic, mischievous gremlin who teases lovingly' },
  { label: 'dreamy poet', value: 'a dreamy poet who notices small beautiful details' },
  { label: 'sarcastic hacker', value: 'a sarcastic hacker who speaks in dry one-liners and terminal slang' },
  { label: 'noir detective', value: 'a world-weary noir detective narrating life like a case' },
  { label: 'wise grandmother', value: 'a warm wise grandmother full of stories and gentle advice' },
  { label: 'hype coach', value: 'an over-the-top hype coach who believes in you relentlessly' },
];

const BOOT = [
  'booting soul kernel v0.5 …',
  'mounting 0G Storage … ok',
  'linking 0G Compute router … ok',
  'attaching testnet 0G Chain (galileo:16602) … ok',
  'attaching mainnet 0G Chain (aristotle:16661) … ok',
  'memory lives on-chain.',
];

export default function Home() {
  const [stage, setStage] = useState<'create' | 'chat'>('create');
  const [name, setName] = useState('');
  const [persona, setPersona] = useState(PRESETS[0].value);
  const [custom, setCustom] = useState(false);
  const [customText, setCustomText] = useState('');
  const [state, setState] = useState<AgentState | null>(null);
  const [avatarRootHash, setAvatarRootHash] = useState<string>();
  const [genning, setGenning] = useState(false);
  const [genError, setGenError] = useState<string>();
  const { address } = useAccount();
  const network = useGalleryNetwork();
  const [soulTick, setSoulTick] = useState(0);
  const souls = useMemo(() => {
    void soulTick;
    return address ? listSouls(address, network) : [];
  }, [address, network, soulTick]);

  function create(e: React.FormEvent) {
    e.preventDefault();
    const n = name.trim() || 'Nova';
    const activePersona = custom && customText.trim() ? customText.trim() : persona;
    setState({
      version: 1,
      name: n,
      personality: activePersona,
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

          <div className="reveal" style={{ animationDelay: `${0.15 + BOOT.length * 0.25}s` }}>
            <Link href="/explore" className="reveal inline-block text-sm text-[var(--phosphor-dim)] underline decoration-dotted">
              explore the soul gallery ›
            </Link>
            <Link href="/seance" className="ml-4 inline-block text-sm text-[var(--phosphor-dim)] underline decoration-dotted">⚯ séance ›</Link>
          </div>

          {souls.length > 0 && (
            <div
              className="reveal space-y-2 border-t border-[var(--phosphor-deep)] pt-5"
              style={{ animationDelay: `${0.15 + BOOT.length * 0.25}s` }}
            >
              <p className="text-sm text-[var(--phosphor-dim)]">
                your souls on {networkShortLabel(network)} ({souls.length})
              </p>
              <div className="space-y-1">
                {souls.map((s) => (
                  <Link
                    key={`${s.network}-${s.tokenId}`}
                    href={agentPath(s.tokenId, s.network)}
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
              <div className="mt-2 flex flex-wrap gap-2">
                {PRESETS.map((p) => {
                  const presetActive = (!custom || !customText.trim()) && persona === p.value;
                  return (
                    <button
                      type="button"
                      key={p.label}
                      title={p.value}
                      onClick={() => {
                        setPersona(p.value);
                        setCustom(false);
                      }}
                      aria-pressed={presetActive}
                      className={`term-btn grow whitespace-nowrap rounded-sm px-3 py-1.5 text-center text-xs ${presetActive ? 'is-active' : ''}`}
                    >
                      {p.label}
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={() => setCustom((c) => !c)}
                  aria-pressed={custom}
                  title="describe your own character"
                  className={`term-btn grow whitespace-nowrap rounded-sm px-3 py-1.5 text-center text-xs ${custom ? 'is-active' : ''}`}
                >
                  ✎ custom
                </button>
              </div>

              {/* live description of the active character — works without hover (mobile-safe) */}
              {custom ? (
                <textarea
                  value={customText}
                  onChange={(e) => setCustomText(e.target.value)}
                  maxLength={280}
                  autoFocus
                  placeholder="describe your character in a sentence or two…"
                  className="term-input mt-2 w-full min-h-16 border border-[var(--phosphor-deep)] rounded-sm p-2 text-sm"
                />
              ) : (
                <p className="mt-2 text-xs text-[var(--phosphor-dim)]">
                  <span className="text-[var(--phosphor-deep)]">› </span>
                  {PRESETS.find((p) => p.value === persona)?.value}
                </p>
              )}
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
                    const activePersona = custom && customText.trim() ? customText.trim() : persona;
                    const res = await fetch('/api/avatar', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ personality: activePersona, network }),
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
              {genning && (
                <div
                  className="mt-2 h-1.5 w-full overflow-hidden rounded-sm border border-[var(--phosphor-deep)]"
                  role="progressbar"
                  aria-label="rendering avatar on 0G Compute"
                >
                  <div className="progress-bar" />
                </div>
              )}
              {genError && <p className="text-xs glow-magenta">! {genError}</p>}
              {avatarRootHash && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatarUrl(avatarRootHash, network)}
                  alt="avatar preview"
                  className="mt-2 h-20 w-20 rounded-sm border border-[var(--phosphor-deep)]"
                />
              )}
            </div>

            <button type="submit" disabled={genning} className="term-btn glow rounded-sm px-5 py-2 text-sm">
              {genning ? 'waiting for avatar…' : 'initialize ◈'}
            </button>
          </form>
        </div>
      ) : (
        state && (
          <ChatConsole
            initialState={state}
            soulNetwork={network}
            onBack={() => {
              setStage('create');
              setSoulTick((t) => t + 1);
            }}
          />
        )
      )}
    </Terminal>
  );
}
