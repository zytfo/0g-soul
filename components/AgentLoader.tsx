'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Terminal } from '@/components/Terminal';
import { ChatConsole } from '@/components/ChatConsole';
import { usePublicURIOf } from '@/lib/contract';
import { fetchSoulProfile } from '@/lib/soul-client';
import { mergeProfile } from '@/lib/agent-core';
import type { AgentState } from '@/lib/agent-core';

export function AgentLoader({ tokenId }: { tokenId: string }) {
  let tid: bigint | undefined;
  try {
    tid = BigInt(tokenId);
  } catch {
    tid = undefined;
  }

  const { data: publicURI, isLoading, error } = usePublicURIOf(tid);
  const [state, setState] = useState<AgentState | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);

  useEffect(() => {
    if (tid === undefined) return;
    let cancelled = false;
    // Load public profile via server route (which calls loadSoulProfile → publicURIOf → downloadBytes)
    fetchSoulProfile(tokenId)
      .then((profile) => {
        if (cancelled) return;
        if (!profile) { setLoadErr('soul not found'); return; }
        setState(mergeProfile(
          { version: 1, name: profile.name, personality: profile.personality, avatarRootHash: profile.avatarRootHash },
          null,
        ));
      })
      .catch((e) => !cancelled && setLoadErr(e instanceof Error ? e.message : 'load failed'));
    return () => { cancelled = true; };
  }, [tokenId, tid]);

  return (
    <Terminal path={`~/soul/${tokenId}`}>
      {tid === undefined ? (
        <Sys text={`! invalid token id "${tokenId}"`} tone="magenta" />
      ) : state ? (
        <ChatConsole initialState={state} initialTokenId={tid} />
      ) : (
        <div className="space-y-2">
          <Sys text={`resolving Soul #${tokenId} on 0G Chain …`} />
          {isLoading && <Sys text="reading public profile (publicURIOf) …" />}
          {error && <Sys text="! could not read contract — is your wallet on Galileo?" tone="magenta" />}
          {typeof publicURI === 'string' && publicURI === '' && (
            <Sys text={`! no public profile found for Soul #${tokenId}`} tone="magenta" />
          )}
          {typeof publicURI === 'string' && publicURI !== '' && !loadErr && (
            <Sys text={`fetching public profile from 0G Storage … root ${publicURI.slice(0, 10)}…`} />
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
