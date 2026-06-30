'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useAccount, usePublicClient, useSwitchChain } from 'wagmi';
import { appendTurn, boundHistory, type AgentState } from '@/lib/agent-core';
import { sendChatStream, saveMemory, rememberSoul, avatarUrl } from '@/lib/soul-client';
import { useMintAgent, useSetMemory, useOwnerOf, tokenIdFromReceipt, useTransfer } from '@/lib/contract';
import { galileo } from '@/lib/chain';
import { MemoryPanel } from '@/components/MemoryPanel';

type Entry = {
  id: number;
  role: 'sys' | 'user' | 'ai';
  text: string;
  tone?: 'amber' | 'magenta';
  glitch?: boolean;
};

const EXPLORER = 'https://chainscan-galileo.0g.ai';
let _id = 0;
const eid = () => ++_id;

export function ChatConsole({
  initialState,
  initialTokenId,
  onBack,
}: {
  initialState: AgentState;
  initialTokenId?: bigint;
  onBack?: () => void;
}) {
  const [state, setState] = useState<AgentState>(initialState);
  const [tokenId, setTokenId] = useState<bigint | undefined>(initialTokenId);
  const [feed, setFeed] = useState<Entry[]>(() =>
    initialState.history.map((m) => ({
      id: eid(),
      role: m.role === 'assistant' ? ('ai' as const) : ('user' as const),
      text: m.content,
    })),
  );
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [offline, setOffline] = useState(false);
  const [working, setWorking] = useState<string | null>(null);
  const [memoryRootHash, setMemoryRootHash] = useState<string>();

  const { address, isConnected, chainId } = useAccount();
  const publicClient = usePublicClient();
  const { switchChainAsync } = useSwitchChain();
  const { mint } = useMintAgent();
  const { setMemory } = useSetMemory();
  const { transfer } = useTransfer();
  const { data: owner } = useOwnerOf(tokenId);
  const ownerStr = typeof owner === 'string' ? owner : undefined;
  const isOwner = !!address && !!ownerStr && address.toLowerCase() === ownerStr.toLowerCase();

  const scroller = useRef<HTMLDivElement>(null);
  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: 'smooth' });
  }, [feed, working]);

  // compute the id OUTSIDE the updater — calling eid() inside setFeed makes it
  // run twice under React Strict Mode and produced duplicate keys.
  const push = (e: Omit<Entry, 'id'>) => {
    const id = eid();
    setFeed((f) => [...f, { ...e, id }]);
  };

  async function onSend(e: React.FormEvent) {
    e.preventDefault();
    const msg = input.trim();
    if (!msg || busy) return;
    setInput('');
    push({ role: 'user', text: msg });
    setBusy(true);
    setWorking('thinking');
    const aiId = eid();
    setFeed((f) => [...f, { id: aiId, role: 'ai', text: '' }]);
    const onToken = (delta: string) => {
      setWorking(null);
      setFeed((f) => f.map((m) => (m.id === aiId ? { ...m, text: m.text + delta } : m)));
    };
    const { text, fallback } = await sendChatStream(state, msg, onToken);
    // reconcile the displayed entry to the authoritative final text (replaces any
    // partial stream or fallback so display always matches committed state)
    setFeed((f) => f.map((m) => (m.id === aiId ? { ...m, text } : m)));
    setOffline(fallback);
    setState((s) => boundHistory(appendTurn(s, msg, text)).state);
    setWorking(null);
    setBusy(false);
  }

  async function ensureGalileo() {
    if (chainId !== galileo.id) {
      await switchChainAsync({ chainId: galileo.id });
    }
  }

  async function onMint() {
    if (busy) return;
    setBusy(true);
    try {
      await ensureGalileo();
      setWorking('writing memory → 0G Storage');
      const rootHash = await saveMemory(state);
      setMemoryRootHash(rootHash);
      push({ role: 'sys', text: `memory → 0G Storage ✓  root ${short(rootHash)}` });
      setWorking('minting INFT on 0G Chain — confirm in wallet');
      const hash = await mint(rootHash);
      push({ role: 'sys', text: `mint tx ${short(hash)} → ${EXPLORER}/tx/${hash}` });
      setWorking('waiting for confirmation on 0G Chain (may take ~30s)');
      const receipt = await pollReceipt(publicClient, hash);
      const tid = tokenIdFromReceipt(receipt);
      if (tid === undefined) throw new Error('could not read tokenId from receipt');
      setTokenId(tid);
      if (address) rememberSoul(address, { tokenId: tid.toString(), name: state.name });
      push({
        role: 'sys',
        tone: 'amber',
        glitch: true,
        text: `✦ minted Soul #${tid.toString()} — it is yours. share: ${origin()}/agent/${tid}`,
      });
    } catch (err) {
      push({ role: 'sys', tone: 'magenta', text: `! ${errMsg(err)}` });
    } finally {
      setWorking(null);
      setBusy(false);
    }
  }

  async function onUpdate() {
    if (busy || tokenId === undefined) return;
    setBusy(true);
    try {
      await ensureGalileo();
      setWorking('saving new memory → 0G Storage');
      const rootHash = await saveMemory(state);
      setMemoryRootHash(rootHash);
      push({ role: 'sys', text: `memory → 0G Storage ✓  root ${short(rootHash)}` });
      setWorking('updating on-chain pointer — confirm in wallet');
      const hash = await setMemory(tokenId, rootHash);
      push({ role: 'sys', text: `update tx ${short(hash)} → ${EXPLORER}/tx/${hash}` });
      setWorking('waiting for confirmation on 0G Chain (may take ~30s)');
      await pollReceipt(publicClient, hash);
      push({ role: 'sys', tone: 'amber', text: `✦ memory updated on-chain` });
    } catch (err) {
      push({ role: 'sys', tone: 'magenta', text: `! ${errMsg(err)}` });
    } finally {
      setWorking(null);
      setBusy(false);
    }
  }

  return (
    <div className="flex h-[60vh] flex-col">
      {/* header line */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-[var(--phosphor-deep)] pb-2 text-sm">
        <span className="flex items-center gap-3">
          {onBack ? (
            <button onClick={onBack} className="term-btn rounded-sm px-2 py-0.5 text-xs">
              ‹ back
            </button>
          ) : (
            <Link href="/" className="term-btn rounded-sm px-2 py-0.5 text-xs">
              ‹ back
            </Link>
          )}
          <span className="flex items-center gap-2 glow">
            {state.avatarRootHash && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarUrl(state.avatarRootHash)}
                alt=""
                className="h-7 w-7 rounded-sm"
              />
            )}
            ◈ {state.name}{' '}
            <span className="text-[var(--phosphor-dim)]">
              {tokenId !== undefined ? `· Soul #${tokenId.toString()}` : '· unminted'}
            </span>
          </span>
        </span>
        <span className="flex items-center gap-3 text-xs">
          {tokenId !== undefined && ownerStr && (
            <span className="text-[var(--phosphor-dim)]">
              owner {short(ownerStr)}
              {isOwner && <span className="glow-amber"> (you)</span>}
            </span>
          )}
          {offline && <span className="glow-magenta">offline demo</span>}
        </span>
      </div>

      {/* feed + memory panel */}
      <div className="flex-1 grid grid-rows-[1fr_auto] md:grid-rows-[1fr] md:grid-cols-[1fr_220px] gap-4 min-h-0">
        {/* feed */}
        <div ref={scroller} className="space-y-2 overflow-y-auto pr-1 min-h-0">
          {feed.map((m) => (
            <Line key={m.id} entry={m} agentName={state.name} />
          ))}
          {working && (
            <p className="text-[var(--phosphor-dim)] text-sm">
              <span className="text-[var(--phosphor-deep)]">sys:</span> {working}
              <span className="cursor" />
            </p>
          )}
        </div>
        {/* memory panel */}
        <MemoryPanel state={state} tokenId={tokenId} memoryRootHash={memoryRootHash} />
      </div>

      {/* input */}
      <form onSubmit={onSend} className="mt-3 flex items-center gap-2 border-t border-[var(--phosphor-deep)] pt-3">
        <span className="glow shrink-0">{'>'}</span>
        <input
          className="term-input flex-1"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={busy ? '…' : `talk to ${state.name}`}
          aria-label={`talk to ${state.name}`}
          disabled={busy}
          autoFocus
        />
      </form>

      {/* actions */}
      <div className="mt-3 flex flex-wrap items-center gap-3">
        {tokenId === undefined ? (
          <button onClick={onMint} disabled={busy || !isConnected} className="term-btn rounded-sm px-4 py-2 text-sm">
            {isConnected ? 'save & mint ◈' : 'connect wallet to mint'}
          </button>
        ) : isOwner ? (
          <>
            <button onClick={onUpdate} disabled={busy} className="term-btn rounded-sm px-4 py-2 text-sm">
              update memory on-chain
            </button>
            <button
              onClick={async () => {
                const to = prompt('transfer to address (0x…):')?.trim();
                if (!to || !/^0x[a-fA-F0-9]{40}$/.test(to)) {
                  push({ role: 'sys', tone: 'magenta', text: '! invalid address' });
                  return;
                }
                setBusy(true);
                try {
                  await ensureGalileo();
                  setWorking('transferring on 0G Chain — confirm in wallet');
                  const hash = await transfer(address as `0x${string}`, to as `0x${string}`, tokenId);
                  push({ role: 'sys', text: `transfer tx ${short(hash)} → ${EXPLORER}/tx/${hash}` });
                  setWorking('waiting for confirmation on 0G Chain (may take ~30s)');
                  await pollReceipt(publicClient, hash);
                  push({ role: 'sys', tone: 'amber', glitch: true, text: `✦ transferred Soul #${tokenId} to ${short(to)} — they now own it and its memory rights` });
                } catch (e) {
                  push({ role: 'sys', tone: 'magenta', text: `! ${errMsg(e)}` });
                } finally {
                  setWorking(null);
                  setBusy(false);
                }
              }}
              disabled={busy}
              className="term-btn rounded-sm px-4 py-2 text-sm"
            >
              transfer ◈
            </button>
          </>
        ) : (
          <>
            <button disabled className="term-btn rounded-sm px-4 py-2 text-sm">
              update memory on-chain
            </button>
            <span className="text-xs text-[var(--phosphor-dim)]">
              {isConnected
                ? 'view only — only the owner can save new memories'
                : 'connect the owner wallet to teach it new memories'}
            </span>
          </>
        )}
      </div>
    </div>
  );
}

function Line({ entry, agentName }: { entry: Entry; agentName: string }) {
  const label =
    entry.role === 'user' ? 'you' : entry.role === 'ai' ? agentName.toLowerCase() : 'sys';
  const cls =
    entry.role === 'sys'
      ? entry.tone === 'amber'
        ? 'glow-amber'
        : entry.tone === 'magenta'
          ? 'glow-magenta'
          : 'text-[var(--phosphor-dim)]'
      : entry.role === 'ai'
        ? 'glow'
        : 'text-[var(--phosphor)]';
  return (
    <p className={`type-line reveal text-sm ${cls} ${entry.glitch ? 'glitch' : ''}`}>
      <span className="text-[var(--phosphor-deep)] select-none">{label}: </span>
      {linkify(entry.text)}
    </p>
  );
}

/** Render any http(s) URLs in the text as clickable links. */
function linkify(text: string) {
  return text.split(/(https?:\/\/[^\s]+)/g).map((part, i) =>
    /^https?:\/\//.test(part) ? (
      <a
        key={i}
        href={part}
        target="_blank"
        rel="noopener noreferrer"
        className="underline decoration-dotted underline-offset-2 break-all hover:opacity-75"
      >
        {part}
      </a>
    ) : (
      <span key={i}>{part}</span>
    ),
  );
}

type PClient = ReturnType<typeof usePublicClient>;

/** Robustly wait for a tx receipt by polling — survives testnet propagation lag. */
async function pollReceipt(client: PClient, hash: `0x${string}`, timeoutMs = 120_000, intervalMs = 3_000) {
  if (!client) throw new Error('no RPC client available');
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const r = await client.getTransactionReceipt({ hash });
      if (r) return r;
    } catch {
      // receipt not propagated yet — keep polling
    }
    await new Promise((res) => setTimeout(res, intervalMs));
  }
  throw new Error('not confirmed in 120s — check the explorer link above; the tx likely succeeded');
}

const short = (s: string) => (s.length > 14 ? `${s.slice(0, 8)}…${s.slice(-4)}` : s);
const origin = () => (typeof window !== 'undefined' ? window.location.origin : '');
const errMsg = (e: unknown) => {
  const m = e instanceof Error ? e.message : 'something went wrong';
  return m.length > 120 ? m.slice(0, 120) + '…' : m;
};
