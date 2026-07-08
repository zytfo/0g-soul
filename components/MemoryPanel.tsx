'use client';
import { useChainId } from 'wagmi';
import type { AgentState } from '@/lib/agent-core';
import { contractAddressForChain, NETWORKS, networkFromChainId } from '@/lib/networks';

export function MemoryPanel({
  state,
  tokenId,
  memoryRootHash,
  isOwner,
  unlocked,
  onUnlock,
  unlockDisabled,
}: {
  state: AgentState;
  tokenId?: bigint;
  memoryRootHash?: string;
  isOwner?: boolean;
  unlocked?: boolean;
  onUnlock?: () => void;
  unlockDisabled?: boolean;
}) {
  const chainId = useChainId();
  const network = networkFromChainId(chainId);
  const contract = contractAddressForChain(chainId);
  const explorer = NETWORKS[network].explorer;
  return (
    <aside className="terminal rounded-sm p-3 text-xs space-y-2 md:max-h-full md:overflow-y-auto">
      <p className="text-[var(--phosphor-dim)]">{'// memory.state'}</p>
      <Row k="name" v={state.name} />
      <Row k="token" v={tokenId !== undefined ? `#${tokenId}` : 'unminted'} />
      {/* summary and facts are private — gated by owner unlock */}
      {unlocked ? (
        !state.memorySummary && state.keyFacts.length === 0 ? (
          <p className="text-[var(--phosphor-dim)]">🔓 unlocked — no private memory yet (fresh or transferred Soul)</p>
        ) : (
          <>
            <Row k="summary" v={state.memorySummary || '(forming…)'} />
            <div>
              <span className="text-[var(--phosphor-deep)]">facts:</span>
              <ul className="mt-1 space-y-0.5">
                {state.keyFacts.length ? state.keyFacts.map((f, i) => <li key={i} className="glow">• {f}</li>)
                  : <li className="text-[var(--phosphor-deep)]">none yet</li>}
              </ul>
            </div>
          </>
        )
      ) : tokenId !== undefined ? (
        isOwner ? (
          <div className="space-y-1">
            <p className="text-[var(--phosphor-dim)]">🔒 private — unlock to view</p>
            <button
              onClick={onUnlock}
              disabled={unlockDisabled}
              className="term-btn rounded-sm px-2 py-1 text-xs disabled:opacity-40"
            >
              unlock memory
            </button>
          </div>
        ) : (
          <p className="text-[var(--phosphor-dim)]">🔒 private</p>
        )
      ) : (
        <>
          <Row k="summary" v={state.memorySummary || '(forming…)'} />
          <div>
            <span className="text-[var(--phosphor-deep)]">facts:</span>
            <ul className="mt-1 space-y-0.5">
              {state.keyFacts.length ? state.keyFacts.map((f, i) => <li key={i} className="glow">• {f}</li>)
                : <li className="text-[var(--phosphor-deep)]">none yet</li>}
            </ul>
          </div>
        </>
      )}
      {memoryRootHash && (
        <p className="break-all" title={memoryRootHash}>
          <span className="text-[var(--phosphor-deep)]">0G Storage root:</span>{' '}
          <span className="glow">{memoryRootHash.slice(0, 10)}…{memoryRootHash.slice(-6)}</span>
        </p>
      )}
      {tokenId !== undefined && (
        <p>
          <span className="text-[var(--phosphor-deep)]">contract:</span>{' '}
          <a className="underline decoration-dotted" href={`${explorer}/address/${contract}`} target="_blank" rel="noopener noreferrer">on 0G Chain ›</a>
        </p>
      )}
    </aside>
  );
}
function Row({ k, v }: { k: string; v: string }) {
  return <p><span className="text-[var(--phosphor-deep)]">{k}:</span> <span className="glow">{v}</span></p>;
}
