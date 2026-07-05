import type { ChatMessage } from './agent-core';

export type SoulProfile = {
  tokenId: string;
  name: string;
  personality: string;
  memorySummary: string;
  keyFacts: string[];
  avatarRootHash?: string;
};

export type SeanceLine = { speaker: string; text: string };

export type PublicProfile = { version: 1; name: string; personality: string; avatarRootHash?: string };
export type PrivateMemory = { memorySummary: string; keyFacts: string[]; history: ChatMessage[] };
