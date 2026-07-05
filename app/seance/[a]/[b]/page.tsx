import type { Metadata } from 'next';
import { SeanceRunner } from '@/components/SeanceRunner';
import { loadSoulProfile } from '@/lib/soul-meta';

export async function generateMetadata({ params }: { params: Promise<{ a: string; b: string }> }): Promise<Metadata> {
  const { a, b } = await params;
  let title = 'A séance on Soul';
  try {
    const [pa, pb] = await Promise.all([loadSoulProfile(BigInt(a)), loadSoulProfile(BigInt(b))]);
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

export default async function SeancePage({ params }: { params: Promise<{ a: string; b: string }> }) {
  const { a, b } = await params; // Next 16: params is a Promise
  return <SeanceRunner a={a} b={b} />;
}
