import { NextRequest, NextResponse } from 'next/server';
import { createPublicClient, http } from 'viem';
import { galileo, CONTRACT_ADDRESS, SOUL_ABI } from '@/lib/chain';
import { downloadMemory } from '@/lib/og-storage';

export const runtime = 'nodejs';
const ORIGIN = 'https://0g-soul.vercel.app';

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params; // Next 16: params is a Promise
    const tokenId = BigInt(id);
    const client = createPublicClient({ chain: galileo, transport: http() });
    const rootHash = (await client.readContract({
      address: CONTRACT_ADDRESS,
      abi: SOUL_ABI,
      functionName: 'memoryOf',
      args: [tokenId],
    })) as string;

    let name = `Soul #${id}`;
    let personality = '';
    let image = `${ORIGIN}/logo.png`;

    if (rootHash) {
      // Wrap only the memory download in its own try/catch so that an
      // old/invalid/unreachable root hash degrades gracefully instead of 500-ing.
      try {
        const state = await downloadMemory(rootHash);
        name = `Soul · ${state.name}`;
        personality = state.personality;
        if (state.avatarRootHash) image = `${ORIGIN}/api/avatar?rootHash=${state.avatarRootHash}`;
      } catch {
        // Fallback: root hash exists but the blob can't be fetched — return defaults.
        name = `Soul #${id}`;
        personality = '';
        image = `${ORIGIN}/logo.png`;
      }
    }

    return NextResponse.json({
      name,
      description:
        'An AI companion whose memory lives on 0G Storage and whose identity is owned on the 0G chain.',
      image,
      attributes: [{ trait_type: 'personality', value: personality || 'unknown' }],
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'metadata failed' },
      { status: 500 },
    );
  }
}
