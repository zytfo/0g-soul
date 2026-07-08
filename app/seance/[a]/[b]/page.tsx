import type { Metadata } from 'next';
import { SeanceRunner } from '@/components/SeanceRunner';
import { loadSoulProfile } from '@/lib/soul-meta';
import { parseNetwork } from '@/lib/networks';

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ a: string; b: string }>;
  searchParams: Promise<{ network?: string }>;
}): Promise<Metadata> {
  const { a, b } = await params;
  const network = parseNetwork((await searchParams).network);
  let title = 'A séance on Soul';
  try {
    const [pa, pb] = await Promise.all([loadSoulProfile(BigInt(a), network), loadSoulProfile(BigInt(b), network)]);
    if (pa && pb) title = `${pa.name} × ${pb.name} · a séance on Soul`;
  } catch {}
  const description = 'Two on-chain AI companions talk, live, on 0G.';
  return {
    metadataBase: new URL('https://0g-soul.vercel.app'),
    title,
    description,
    openGraph: { title, description },
    twitter: { card: 'summary_large_image', title, description },
  };
}

export default async function SeancePage({
  params,
  searchParams,
}: {
  params: Promise<{ a: string; b: string }>;
  searchParams: Promise<{ network?: string }>;
}) {
  const { a, b } = await params;
  const network = parseNetwork((await searchParams).network);
  return <SeanceRunner key={`${a}-${b}-${network}`} a={a} b={b} network={network} />;
}
