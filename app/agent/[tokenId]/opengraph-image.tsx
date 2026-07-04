import { ImageResponse } from 'next/og';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { loadSoulMeta } from '@/lib/soul-meta';
import { downloadBytes } from '@/lib/og-storage';

export const runtime = 'nodejs';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = 'Soul';

export default async function Image({ params }: { params: Promise<{ tokenId: string }> }) {
  const { tokenId } = await params;
  let name = `Soul #${tokenId}`;
  let personality = 'an AI you own on 0G';
  let avatarSrc = 'https://0g-soul.vercel.app/logo.png';
  try {
    const meta = await loadSoulMeta(BigInt(tokenId));
    name = meta.name;
    if (meta.personality) personality = meta.personality;
    if (meta.avatarRootHash) {
      const bytes = await downloadBytes(meta.avatarRootHash);
      avatarSrc = `data:image/png;base64,${Buffer.from(bytes).toString('base64')}`;
    }
  } catch {}

  // Satori needs the font bytes explicitly — 'monospace' alone falls back to sans.
  let fonts: { name: string; data: ArrayBuffer; weight: 400; style: 'normal' }[] | undefined;
  try {
    const fontBuf = await readFile(path.join(process.cwd(), 'public', 'fonts', 'mono.ttf'));
    fonts = [{ name: 'JetBrains Mono', data: fontBuf.buffer.slice(fontBuf.byteOffset, fontBuf.byteOffset + fontBuf.byteLength) as ArrayBuffer, weight: 400, style: 'normal' }];
  } catch {
    fonts = undefined; // fall back to Satori default if the font is missing
  }
  const fontFamily = fonts ? 'JetBrains Mono' : 'monospace';

  return new ImageResponse(
    (
      <div style={{ display: 'flex', width: '100%', height: '100%', background: '#050806', color: '#34ff9c',
        fontFamily, alignItems: 'center', padding: '64px', gap: '56px' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={avatarSrc} width={360} height={360} alt="" style={{ borderRadius: '12px' }} />
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
          <div style={{ fontSize: 84, fontWeight: 700 }}>{name}</div>
          <div style={{ fontSize: 34, color: '#1aa86a', marginTop: 12, maxWidth: 620 }}>{personality.slice(0, 120)}</div>
          <div style={{ fontSize: 28, color: '#0c5c3a', marginTop: 28 }}>SOUL · an AI you own on 0G</div>
        </div>
      </div>
    ),
    { ...size, ...(fonts ? { fonts } : {}) },
  );
}
