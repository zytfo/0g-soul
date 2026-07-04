import type { Metadata } from 'next';
import { AgentLoader } from '@/components/AgentLoader';
import { loadSoulMeta } from '@/lib/soul-meta';

export async function generateMetadata({ params }: { params: Promise<{ tokenId: string }> }): Promise<Metadata> {
  const { tokenId } = await params;
  let name = `Soul #${tokenId}`;
  let description = 'An AI companion you own on 0G — its memory lives on-chain.';
  try {
    const meta = await loadSoulMeta(BigInt(tokenId));
    name = meta.name;
    if (meta.personality) description = meta.personality.slice(0, 155);
  } catch {}
  return {
    metadataBase: new URL('https://0g-soul.vercel.app'), // canonical absolute URL for the auto-wired OG image
    title: name,
    description,
    openGraph: { title: name, description },
    twitter: { card: 'summary_large_image', title: name, description },
  };
}

export default async function AgentPage({
  params,
}: {
  params: Promise<{ tokenId: string }>;
}) {
  const { tokenId } = await params; // Next 16: params is a Promise
  return <AgentLoader tokenId={tokenId} />;
}
