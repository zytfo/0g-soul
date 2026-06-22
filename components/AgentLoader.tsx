'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Terminal } from '@/components/Terminal';
import { ChatConsole } from '@/components/ChatConsole';
import { useMemoryOf } from '@/lib/contract';
import { loadMemory } from '@/lib/soul-client';
import type { AgentState } from '@/lib/agent-core';

export function AgentLoader({ tokenId }: { tokenId: string }) {
  let tid: bigint | undefined;
  try {
    tid = BigInt(tokenId);
  } catch {
    tid = undefined;
  }

  const { data: rootHash, isLoading, error } = useMemoryOf(tid);
  const [state, setState] = useState<AgentState | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);

  useEffect(() => {
    if (typeof rootHash !== 'string' || rootHash === '') return;
    let cancelled = false;
    loadMemory(rootHash)
      .then((s) => !cancelled && setState(s))
      .catch((e) => !cancelled && setLoadErr(e instanceof Error ? e.message : 'load failed'));
    return () => {
      cancelled = true;
    };
  }, [rootHash]);

  return (
    <Terminal path={`~/soul/${tokenId}`}>
      {tid === undefined ? (
        <Sys text={`! invalid token id "${tokenId}"`} tone="magenta" />
      ) : state ? (
        <ChatConsole initialState={state} initialTokenId={tid} />
      ) : (
        <div className="space-y-2">
          <Sys text={`resolving Soul #${tokenId} on 0G Chain …`} />
          {isLoading && <Sys text="reading memory pointer (memoryOf) …" />}
          {error && <Sys text="! could not read contract — is your wallet on Galileo?" tone="magenta" />}
          {typeof rootHash === 'string' && rootHash === '' && (
            <Sys text={`! no memory found for Soul #${tokenId}`} tone="magenta" />
          )}
          {typeof rootHash === 'string' && rootHash !== '' && !loadErr && (
            <Sys text={`fetching memory from 0G Storage … root ${rootHash.slice(0, 10)}…`} />
          )}
          {loadErr && <Sys text={`! ${loadErr}`} tone="magenta" />}
          <p className="pt-4 text-sm">
            <Link href="/" className="term-btn rounded-sm px-3 py-1">
              ‹ create your own
            </Link>
          </p>
        </div>
      )}
    </Terminal>
  );
}

function Sys({ text, tone }: { text: string; tone?: 'magenta' }) {
  return (
    <p className={`reveal text-sm ${tone === 'magenta' ? 'glow-magenta' : 'text-[var(--phosphor-dim)]'}`}>
      <span className="text-[var(--phosphor-deep)]">sys:</span> {text}
      {!tone && <span className="cursor" />}
    </p>
  );
}
