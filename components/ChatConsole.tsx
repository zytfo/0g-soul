'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { useAccount, usePublicClient, useSwitchChain, useSignMessage } from 'wagmi';
import { hexToBytes, toHex } from 'viem';
import { appendTurn, boundHistory, type AgentState, toPublicProfile, toPrivateMemory } from '@/lib/agent-core';
import { sendChatStream, distill, rememberSoul, forgetSoul, avatarUrl, uploadBlob, downloadBlob, agentPath } from '@/lib/soul-client';
import {
  useMint,
  useSetMemory,
  useSetPublicProfile,
  useOwnerOf,
  useEncryptedURIOf,
  useSealedKeyOf,
  tokenIdFromReceipt,
  useTransfer,
  keccak256,
} from '@/lib/contract';
import { aristotle, galileo, contractAddress, chainIdForNetwork, explorerTx, networkShortLabel } from '@/lib/networks';
import { useGalleryNetwork } from '@/components/NetworkSwitcher';
import { MemoryPanel } from '@/components/MemoryPanel';
import { ShareButton } from '@/components/ShareButton';
import { TransferModal } from '@/components/TransferModal';
import { sttSupported, ttsSupported, startDictation, speak, cancelSpeak } from '@/lib/voice';
import { randomKey, sealKey, wrapKeyFromSignature, encryptJSON, unsealKey, decryptJSON } from '@/lib/crypto';
import type { ChatMessage } from '@/lib/agent-core';
import type { NetworkId } from '@/lib/networks';

type Entry = {
  id: number;
  role: 'sys' | 'user' | 'ai';
  text: string;
  tone?: 'amber' | 'magenta';
  glitch?: boolean;
};

const ADDR_RE = /^0x[a-fA-F0-9]{40}$/;
let _id = 0;
const eid = () => ++_id;

/** Encrypt and upload the private memory; return the args for mint/setMemory. */
async function sealAndUpload(
  state: AgentState,
  signature: string,
  network: NetworkId,
): Promise<{ publicURI: string; encryptedURI: string; metadataHash: `0x${string}`; sealedKey: `0x${string}` }> {
  const pub = toPublicProfile(state);
  const priv = toPrivateMemory(state);
  const publicURI = await uploadBlob(new TextEncoder().encode(JSON.stringify(pub)), network);
  const K = await randomKey();
  const cipher = await encryptJSON(priv, K);
  const encryptedURI = await uploadBlob(cipher, network);
  const metadataHash = keccak256(new TextEncoder().encode(JSON.stringify(priv)));
  const wrap = await wrapKeyFromSignature(signature);
  const sealedKeyBytes = toHex(await sealKey(K, wrap));
  return { publicURI, encryptedURI, metadataHash, sealedKey: sealedKeyBytes };
}

export function ChatConsole({
  initialState,
  initialTokenId,
  onBack,
  soulNetwork,
}: {
  initialState: AgentState;
  initialTokenId?: bigint;
  onBack?: () => void;
  /** When set (agent page), all reads/writes stay on this network. */
  soulNetwork?: NetworkId;
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
  const [voiceOn, setVoiceOn] = useState(false);
  const [listening, setListening] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const stopRef = useRef<() => void>(() => {});
  const inputRef = useRef<HTMLInputElement>(null);
  const canStt = useSyncExternalStore(() => () => {}, sttSupported, () => false);
  const canTts = useSyncExternalStore(() => () => {}, ttsSupported, () => false);

  const { address, isConnected, chainId } = useAccount();
  const browseNetwork = useGalleryNetwork();
  const network = soulNetwork ?? browseNetwork;
  const publicClient = usePublicClient({ chainId: chainIdForNetwork(network) });
  const { switchChainAsync } = useSwitchChain();
  const { signMessageAsync } = useSignMessage();
  const { mint } = useMint(network);
  const { setMemory } = useSetMemory(network);
  const { setPublicProfile } = useSetPublicProfile(network);
  const { transfer } = useTransfer(network);
  const { data: owner } = useOwnerOf(tokenId, network);
  const { data: sealedKeyData } = useSealedKeyOf(tokenId, network);
  const { data: encryptedURIData } = useEncryptedURIOf(tokenId, network);
  const ownerStr = typeof owner === 'string' ? owner : undefined;
  const isOwner = !!address && !!ownerStr && address.toLowerCase() === ownerStr.toLowerCase();

  const scroller = useRef<HTMLDivElement>(null);
  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: 'smooth' });
  }, [feed, working]);

  // Cancel any in-progress speech + dictation on unmount
  useEffect(() => () => { cancelSpeak(); stopRef.current(); }, []);

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
    const { text, fallback } = await sendChatStream(state, msg, onToken, network);
    // reconcile the displayed entry to the authoritative final text
    setFeed((f) => f.map((m) => (m.id === aiId ? { ...m, text } : m)));
    setOffline(fallback);
    if (voiceOn && !fallback) speak(text);
    setState((s) => boundHistory(appendTurn(s, msg, text)).state);
    setWorking(null);
    setBusy(false);
    inputRef.current?.focus();
  }

  async function ensureChain() {
    const target = network === 'mainnet' ? aristotle.id : galileo.id;
    if (chainId !== target) await switchChainAsync({ chainId: target });
  }

  async function onMint() {
    if (busy || !address) return;
    setBusy(true);
    try {
      await ensureChain();
      setWorking('distilling memory (0G Compute)…');
      const toSave = await withDistilledMemory(state, network);
      if (toSave !== state) setState(toSave);
      setWorking('sign to encrypt your private memory');
      const signature = await signMessageAsync({ message: 'SOUL:unlock:v1' });
      setWorking('encrypting + writing to 0G Storage');
      const { publicURI, encryptedURI, metadataHash, sealedKey } = await sealAndUpload(toSave, signature, network);
      setMemoryRootHash(encryptedURI);
      push({ role: 'sys', text: `memory encrypted → 0G Storage ✓  root ${short(encryptedURI)}` });
      setWorking('minting INFT on 0G Chain — confirm in wallet');
      const hash = await mint(address, publicURI, encryptedURI, metadataHash, sealedKey);
      push({ role: 'sys', text: `mint tx ${short(hash)} → ${explorerTx(network, hash)}` });
      setWorking('waiting for confirmation on 0G Chain (may take ~30s)');
      const receipt = await pollReceipt(publicClient, hash);
      const contract = contractAddress(network);
      const tid = tokenIdFromReceipt(receipt, contract);
      if (tid === undefined) throw new Error('could not read tokenId from receipt');
      setTokenId(tid);
      rememberSoul(address, { tokenId: tid.toString(), name: state.name, network });
      setUnlocked(true);
      push({
        role: 'sys',
        tone: 'amber',
        glitch: true,
        text: `✦ minted Soul #${tid} on ${networkShortLabel(network)} — memory encrypted, only you can read it. share: ${origin()}${agentPath(tid, network)}`,
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
      await ensureChain();
      setWorking('distilling memory (0G Compute)…');
      const toSave = await withDistilledMemory(state, network);
      if (toSave !== state) setState(toSave);
      setWorking('sign to encrypt your private memory');
      const signature = await signMessageAsync({ message: 'SOUL:unlock:v1' });
      setWorking('encrypting + writing to 0G Storage');
      const { encryptedURI, metadataHash, sealedKey } = await sealAndUpload(toSave, signature, network);
      setMemoryRootHash(encryptedURI);
      push({ role: 'sys', text: `memory encrypted → 0G Storage ✓  root ${short(encryptedURI)}` });
      setWorking('updating on-chain pointer — confirm in wallet');
      const hash = await setMemory(tokenId, encryptedURI, metadataHash, sealedKey);
      push({ role: 'sys', text: `update tx ${short(hash)} → ${explorerTx(network, hash)}` });
      setWorking('waiting for confirmation on 0G Chain (may take ~30s)');
      await pollReceipt(publicClient, hash);
      setUnlocked(true);
      push({ role: 'sys', tone: 'amber', text: `✦ memory updated (encrypted) on-chain` });
    } catch (err) {
      push({ role: 'sys', tone: 'magenta', text: `! ${errMsg(err)}` });
    } finally {
      setWorking(null);
      setBusy(false);
    }
  }

  async function onEvolvePortrait() {
    if (busy || tokenId === undefined || !isOwner) return;
    setBusy(true);
    const prevHash = state.avatarRootHash;
    try {
      await ensureChain();
      setWorking('distilling memory for portrait (0G Compute)…');
      const enriched = await withDistilledMemory(state, network);
      if (enriched !== state) setState(enriched);
      setWorking('evolving portrait on 0G image model (~30s)…');
      const res = await fetch('/api/avatar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          personality: enriched.personality,
          memorySummary: enriched.memorySummary,
          keyFacts: enriched.keyFacts,
          evolve: true,
          network,
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j.rootHash) throw new Error(j.error || 'portrait evolution failed');
      const nextState = { ...enriched, avatarRootHash: j.rootHash as string };
      setState(nextState);
      setWorking('writing evolved profile to 0G Storage');
      const publicURI = await uploadBlob(new TextEncoder().encode(JSON.stringify(toPublicProfile(nextState))), network);
      setWorking('updating on-chain portrait — confirm in wallet');
      const hash = await setPublicProfile(tokenId, publicURI);
      push({
        role: 'sys',
        tone: 'amber',
        glitch: true,
        text: `✦ portrait evolved on-chain ${prevHash ? `(was ${short(prevHash)})` : ''} → tx ${short(hash)}`,
      });
    } catch (err) {
      push({ role: 'sys', tone: 'magenta', text: `! ${errMsg(err)}` });
    } finally {
      setWorking(null);
      setBusy(false);
    }
  }

  async function onTransfer(to: string) {
    if (!ADDR_RE.test(to)) {
      push({ role: 'sys', tone: 'magenta', text: '! invalid address' });
      return;
    }
    if (tokenId === undefined || !address) return;
    setBusy(true);
    try {
      await ensureChain();
      setWorking('transferring on 0G Chain — confirm in wallet');
      const hash = await transfer(address as `0x${string}`, to as `0x${string}`, tokenId, '0x', '0x01');
      push({ role: 'sys', text: `transfer tx ${short(hash)} → ${explorerTx(network, hash)}` });
      setWorking('waiting for confirmation on 0G Chain (may take ~30s)');
      await pollReceipt(publicClient, hash);
      forgetSoul(address, tokenId.toString(), network);
      setTransferOpen(false);
      push({
        role: 'sys',
        tone: 'amber',
        glitch: true,
        text: `✦ transferred Soul #${tokenId} to ${short(to)} — they inherit the character; your private memory stays encrypted to you`,
      });
    } catch (e) {
      push({ role: 'sys', tone: 'magenta', text: `! ${errMsg(e)}` });
    } finally {
      setWorking(null);
      setBusy(false);
    }
  }

  async function unlock() {
    if (tokenId === undefined) return;
    try {
      setWorking('sign to unlock your private memory');
      const signature = await signMessageAsync({ message: 'SOUL:unlock:v1' });
      const wrap = await wrapKeyFromSignature(signature);
      const sealedHex = sealedKeyData as `0x${string}`;
      const encURI = encryptedURIData as string;
      if (!sealedHex || sealedHex === '0x' || !encURI) { setUnlocked(true); return; }
      const K = await unsealKey(new Uint8Array(hexToBytes(sealedHex)), wrap);
      const cipher = await downloadBlob(encURI, network);
      const priv = await decryptJSON<{ memorySummary: string; keyFacts: string[]; history: ChatMessage[] }>(new Uint8Array(cipher) as Uint8Array<ArrayBuffer>, K);
      const past = Array.isArray(priv.history) ? priv.history : [];
      // restore the full private memory: summary + facts into the panel, and the saved
      // transcript back into the conversation (prepended before any turns from this session).
      setState((s) => ({ ...s, memorySummary: priv.memorySummary, keyFacts: priv.keyFacts, history: [...past, ...s.history] }));
      if (past.length) {
        const restored: Entry[] = past.map((m) => ({
          id: eid(),
          role: m.role === 'assistant' ? ('ai' as const) : ('user' as const),
          text: m.content,
        }));
        setFeed((f) => [...restored, ...f]);
        push({ role: 'sys', tone: 'amber', text: `✦ memory unlocked — restored ${past.length} past message${past.length === 1 ? '' : 's'}` });
      }
      setUnlocked(true);
    } catch (e) {
      push({ role: 'sys', tone: 'magenta', text: `! could not unlock (${errMsg(e)})` });
    } finally {
      setWorking(null);
    }
  }

  const unlockDisabled = sealedKeyData === undefined || encryptedURIData === undefined;

  return (
    <div className="flex h-[78vh] flex-col md:h-[60vh]">
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
                src={avatarUrl(state.avatarRootHash, network)}
                alt=""
                className="h-7 w-7 rounded-sm"
              />
            )}
            ◈ {state.name}{' '}
            <span className="text-[var(--phosphor-dim)]">
              {tokenId !== undefined ? `· Soul #${tokenId.toString()}` : '· unminted'}
              {' · '}
              {networkShortLabel(network)}
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
        {/* memory panel — hidden on mobile so the chat gets full height */}
        <div className="hidden md:block md:min-h-0">
          <MemoryPanel
            state={state}
            tokenId={tokenId}
            memoryRootHash={memoryRootHash}
            isOwner={isOwner}
            unlocked={unlocked}
            onUnlock={unlock}
            unlockDisabled={unlockDisabled}
            network={network}
          />
        </div>
      </div>

      {/* input */}
      <form onSubmit={onSend} className="mt-3 flex items-center gap-2 border-t border-[var(--phosphor-deep)] pt-3">
        <span className="glow shrink-0">{'>'}</span>
        {canStt && (
          <button type="button" onClick={() => {
            if (listening) { stopRef.current(); setListening(false); return; }
            setListening(true);
            stopRef.current = startDictation(
              (t) => setInput((v) => (v ? v + ' ' : '') + t),
              () => setListening(false),
            );
          }} className={`term-btn rounded-sm px-2 py-1 text-xs ${listening ? 'is-active' : ''}`} aria-label="dictate">
            {listening ? '● rec' : '🎙'}
          </button>
        )}
        <input
          ref={inputRef}
          className="term-input flex-1"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={busy ? '…' : `talk to ${state.name}`}
          aria-label={`talk to ${state.name}`}
          disabled={busy}
          autoFocus
        />
        <button
          type="submit"
          disabled={busy || !input.trim()}
          className="term-btn shrink-0 rounded-sm px-3 py-1 text-xs"
          aria-label="send message"
        >
          send ↵
        </button>
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
            <button onClick={onEvolvePortrait} disabled={busy} className="term-btn rounded-sm px-4 py-2 text-sm">
              evolve portrait ◈
            </button>
            <button
              onClick={() => setTransferOpen(true)}
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
        {tokenId !== undefined && <ShareButton tokenId={tokenId} name={state.name} network={network} />}
        {canTts && (
          <button type="button" onClick={() => { setVoiceOn((v) => { if (v) cancelSpeak(); return !v; }); }}
            className={`term-btn rounded-sm px-2 py-1 text-xs ${voiceOn ? 'is-active' : ''}`}>
            🔊 {voiceOn ? 'on' : 'off'}
          </button>
        )}
      </div>
      <TransferModal
        open={transferOpen}
        busy={busy}
        onClose={() => setTransferOpen(false)}
        onConfirm={(to) => onTransfer(to)}
      />
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

/** Enrich state with distilled memory (summary + facts) before saving; on failure, save as-is. */
async function withDistilledMemory(state: AgentState, network: NetworkId): Promise<AgentState> {
  const d = await distill(state, network);
  return d && (d.memorySummary || d.keyFacts.length)
    ? { ...state, memorySummary: d.memorySummary, keyFacts: d.keyFacts }
    : state;
}

const short = (s: string) => (s.length > 14 ? `${s.slice(0, 8)}…${s.slice(-4)}` : s);
const origin = () => (typeof window !== 'undefined' ? window.location.origin : '');
const errMsg = (e: unknown) => {
  const m = e instanceof Error ? e.message : 'something went wrong';
  return m.length > 120 ? m.slice(0, 120) + '…' : m;
};
