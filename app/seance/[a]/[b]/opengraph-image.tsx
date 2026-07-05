import { ImageResponse } from 'next/og';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { loadSoulProfile } from '@/lib/soul-meta';
import { downloadBytes } from '@/lib/og-storage';

export const runtime = 'nodejs';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = 'A séance on Soul';

const LOGO = 'https://0g-soul.vercel.app/logo.png';

async function avatar(rootHash?: string): Promise<string> {
  if (!rootHash) return LOGO;
  try {
    const bytes = await downloadBytes(rootHash);
    return `data:image/png;base64,${Buffer.from(bytes).toString('base64')}`;
  } catch {
    return LOGO;
  }
}

export default async function Image({ params }: { params: Promise<{ a: string; b: string }> }) {
  const { a, b } = await params;
  let nameA = `Soul #${a}`, nameB = `Soul #${b}`, avA = LOGO, avB = LOGO;
  // allSettled so one unreachable Soul doesn't blank the other; avatars downloaded in parallel
  const [ra, rb] = await Promise.allSettled([
    (async () => { try { return await loadSoulProfile(BigInt(a)); } catch { return null; } })(),
    (async () => { try { return await loadSoulProfile(BigInt(b)); } catch { return null; } })(),
  ]);
  const pa = ra.status === 'fulfilled' ? ra.value : null;
  const pb = rb.status === 'fulfilled' ? rb.value : null;
  const [avA2, avB2] = await Promise.all([
    pa ? avatar(pa.avatarRootHash) : Promise.resolve(LOGO),
    pb ? avatar(pb.avatarRootHash) : Promise.resolve(LOGO),
  ]);
  if (pa) { nameA = pa.name; avA = avA2; }
  if (pb) { nameB = pb.name; avB = avB2; }
  let fonts: { name: string; data: ArrayBuffer; weight: 400; style: 'normal' }[] | undefined;
  try {
    const buf = await readFile(path.join(process.cwd(), 'public', 'fonts', 'mono.ttf'));
    fonts = [{ name: 'JetBrains Mono', data: buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer, weight: 400, style: 'normal' }];
  } catch { fonts = undefined; }
  const fontFamily = fonts ? 'JetBrains Mono' : 'monospace';
  return new ImageResponse(
    (
      <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', background: '#050806', color: '#34ff9c', fontFamily, alignItems: 'center', justifyContent: 'center', gap: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '40px' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={avA} width={240} height={240} alt="" style={{ borderRadius: '12px' }} />
          <div style={{ display: 'flex', fontSize: 72, color: '#ffcf4a' }}>×</div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={avB} width={240} height={240} alt="" style={{ borderRadius: '12px' }} />
        </div>
        <div style={{ display: 'flex', fontSize: 46 }}>{nameA} × {nameB}</div>
        <div style={{ display: 'flex', fontSize: 26, color: '#1aa86a' }}>a séance on 0G · two on-chain AIs talk</div>
      </div>
    ),
    { ...size, ...(fonts ? { fonts } : {}) },
  );
}
