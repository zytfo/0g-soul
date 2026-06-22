import { AgentLoader } from '@/components/AgentLoader';

export default async function AgentPage({
  params,
}: {
  params: Promise<{ tokenId: string }>;
}) {
  const { tokenId } = await params; // Next 16: params is a Promise
  return <AgentLoader tokenId={tokenId} />;
}
