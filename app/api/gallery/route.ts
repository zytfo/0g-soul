import { NextRequest, NextResponse } from 'next/server';
import { createPublicClient, http } from 'viem';
import { contractAddress, NETWORKS, parseNetwork, type NetworkId } from '@/lib/networks';
import { SOUL_ABI } from '@/lib/chain';
import { downloadBytes } from '@/lib/og-storage';
import { galleryCacheGet, galleryCacheSet } from '@/lib/gallery-cache';

export const runtime = 'nodejs';

const PAGE = 12;
const CONCURRENCY = 6;

type GallerySoul = { tokenId: string; name: string; avatarRootHash: string | null; owner: string | null };
type GalleryResponse = { souls: GallerySoul[]; nextCursor: string | null };

async function profileFromUri(publicURI: string, network: NetworkId, fallbackName: string) {
  try {
    const bytes = await downloadBytes(publicURI, network);
    const p = JSON.parse(new TextDecoder().decode(bytes)) as { name?: string; avatarRootHash?: string };
    return { name: p.name || fallbackName, avatarRootHash: p.avatarRootHash ?? null };
  } catch {
    return { name: fallbackName, avatarRootHash: null };
  }
}

async function mapPool<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = [];
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      out[idx] = await fn(items[idx]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()));
  return out;
}

type TokenRow = { id: bigint; publicURI: string; owner: string | null };

/** 0G mainnet has no Multicall3 — fall back to parallel reads. */
async function readTokenRows(
  client: ReturnType<typeof createPublicClient>,
  addr: `0x${string}`,
  ids: bigint[],
): Promise<TokenRow[]> {
  try {
    const calls = ids.flatMap((id) => [
      { address: addr, abi: SOUL_ABI, functionName: 'publicURIOf' as const, args: [id] as const },
      { address: addr, abi: SOUL_ABI, functionName: 'ownerOf' as const, args: [id] as const },
    ]);
    const results = await client.multicall({ contracts: calls, allowFailure: true });
    return ids.map((id, idx) => {
      const uriRes = results[idx * 2];
      const ownerRes = results[idx * 2 + 1];
      const publicURI = uriRes.status === 'success' ? (uriRes.result as string) : '';
      const owner = ownerRes.status === 'success' ? String(ownerRes.result) : null;
      return { id, publicURI, owner };
    });
  } catch {
    return mapPool(ids, CONCURRENCY, async (id) => {
      const [uriRes, ownerRes] = await Promise.allSettled([
        client.readContract({ address: addr, abi: SOUL_ABI, functionName: 'publicURIOf', args: [id] }),
        client.readContract({ address: addr, abi: SOUL_ABI, functionName: 'ownerOf', args: [id] }),
      ]);
      const publicURI = uriRes.status === 'fulfilled' ? (uriRes.value as string) : '';
      const owner = ownerRes.status === 'fulfilled' ? String(ownerRes.value) : null;
      return { id, publicURI, owner };
    });
  }
}

export async function GET(req: NextRequest) {
  try {
    const network = parseNetwork(req.nextUrl.searchParams.get('network'));
    const cursorParam = req.nextUrl.searchParams.get('cursor');
    const cacheKey = `${network}:${cursorParam ?? 'start'}`;
    const cached = galleryCacheGet<GalleryResponse>(cacheKey);
    if (cached) return NextResponse.json(cached);

    const chain = NETWORKS[network].chain;
    const addr = contractAddress(network);
    const client = createPublicClient({ chain, transport: http() });

    const next = (await client.readContract({
      address: addr,
      abi: SOUL_ABI,
      functionName: 'nextId',
    })) as bigint;

    const start = cursorParam ? BigInt(cursorParam) : next;
    const ids: bigint[] = [];
    for (let i = start; i > 0n && ids.length < PAGE; i--) ids.push(i);
    if (!ids.length) {
      const empty = { souls: [], nextCursor: null };
      galleryCacheSet(cacheKey, empty);
      return NextResponse.json(empty);
    }

    const rows = await readTokenRows(client, addr, ids);

    const souls = await mapPool(rows, CONCURRENCY, async (row) => {
      const fallback = `Soul #${row.id}`;
      if (!row.publicURI) {
        return { tokenId: row.id.toString(), name: fallback, avatarRootHash: null, owner: row.owner };
      }
      const profile = await profileFromUri(row.publicURI, network, fallback);
      return { tokenId: row.id.toString(), name: profile.name, avatarRootHash: profile.avatarRootHash, owner: row.owner };
    });

    const lowest = ids[ids.length - 1];
    const nextCursor = lowest > 1n ? (lowest - 1n).toString() : null;
    const payload = { souls, nextCursor };
    galleryCacheSet(cacheKey, payload);
    return NextResponse.json(payload);
  } catch {
    return NextResponse.json({ souls: [], nextCursor: null });
  }
}
