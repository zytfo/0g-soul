import type { Metadata } from 'next';
import { AgentLoader } from '@/components/AgentLoader';
import { loadSoulMeta } from '@/lib/soul-meta';
import { parseNetwork } from '@/lib/networks';

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ tokenId: string }>;
  searchParams: Promise<{ network?: string }>;
}): Promise<Metadata> {
  const { tokenId } = await params;
  const network = parseNetwork((await searchParams).network);
  let name = `Soul #${tokenId}`;
  let description = 'An AI companion you own on 0G — its memory lives on-chain.';
  try {
    const meta = await loadSoulMeta(BigInt(tokenId), network);
    name = meta.name;
    if (meta.personality) description = meta.personality.slice(0, 155);
  } catch {}
  return {
    metadataBase: new URL('https://0g-soul.vercel.app'),
    title: name,
    description,
    openGraph: { title: name, description },
    twitter: { card: 'summary_large_image', title: name, description },
  };
}

export default async function AgentPage({
  params,
  searchParams,
}: {
  params: Promise<{ tokenId: string }>;
  searchParams: Promise<{ network?: string }>;
}) {
  const { tokenId } = await params;
  const network = parseNetwork((await searchParams).network);
  return <AgentLoader tokenId={tokenId} network={network} />;
}
