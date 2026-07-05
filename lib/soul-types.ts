export type SoulProfile = {
  tokenId: string;
  name: string;
  personality: string;
  memorySummary: string;
  keyFacts: string[];
  avatarRootHash?: string;
};

export type SeanceLine = { speaker: string; text: string };
