import { NextRequest, NextResponse } from 'next/server';
import { createPublicClient, http } from 'viem';
import { galileo, CONTRACT_ADDRESS, SOUL_ABI } from '@/lib/chain';
import { loadSoulMeta } from '@/lib/soul-meta';

export const runtime = 'nodejs';

const PAGE = 12;

export async function GET(req: NextRequest) {
  try {
    const client = createPublicClient({ chain: galileo, transport: http() });
    const next = (await client.readContract({
      address: CONTRACT_ADDRESS, abi: SOUL_ABI, functionName: 'nextId',
    })) as bigint;
    // cursor = highest tokenId to start from (descending); defaults to the newest
    const cursorParam = req.nextUrl.searchParams.get('cursor');
    const start = cursorParam ? BigInt(cursorParam) : next;
    const ids: bigint[] = [];
    for (let i = start; i > 0n && ids.length < PAGE; i--) ids.push(i);
    const souls = (
      await Promise.all(
        ids.map(async (id) => {
          try {
            const [m, owner] = await Promise.all([
              loadSoulMeta(id),
              client
                .readContract({ address: CONTRACT_ADDRESS, abi: SOUL_ABI, functionName: 'ownerOf', args: [id] })
                .then((o) => String(o))
                .catch(() => null),
            ]);
            return { tokenId: id.toString(), name: m.name, avatarRootHash: m.avatarRootHash ?? null, owner };
          } catch {
            return null;
          }
        }),
      )
    ).filter(Boolean);
    const lowest = ids.length ? ids[ids.length - 1] : 0n;
    const nextCursor = lowest > 1n ? (lowest - 1n).toString() : null; // null → no older pages
    return NextResponse.json({ souls, nextCursor });
  } catch {
    return NextResponse.json({ souls: [], nextCursor: null });
  }
}
