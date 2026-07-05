import { Indexer, MemData } from '@0gfoundation/0g-storage-ts-sdk';
import { ethers } from 'ethers';
import { readFile, unlink } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';

const RPC = 'https://evmrpc-testnet.0g.ai';
const INDEXER = 'https://indexer-storage-testnet-turbo.0g.ai';

function signer() {
  if (!process.env.PRIVATE_KEY) throw new Error('PRIVATE_KEY not set (server wallet for Storage)');
  return new ethers.Wallet(process.env.PRIVATE_KEY, new ethers.JsonRpcProvider(RPC));
}

/** Upload raw bytes to 0G Storage; returns root hash. */
export async function uploadBytes(bytes: Uint8Array): Promise<{ rootHash: string }> {
  const indexer = new Indexer(INDEXER);
  const blob = new MemData(bytes);
  const [tree, treeErr] = await blob.merkleTree();
  if (treeErr || !tree) throw new Error(`merkleTree: ${treeErr ?? 'null tree'}`);
  const rootHash = tree.rootHash();
  if (!rootHash) throw new Error('merkleTree: null root hash');
  const [, uploadErr] = await indexer.upload(blob, RPC, signer());
  if (uploadErr) throw new Error(`upload: ${uploadErr}`);
  return { rootHash };
}

/** Download raw bytes from 0G Storage by root hash (serverless: via /tmp). */
export async function downloadBytes(rootHash: string): Promise<Uint8Array> {
  const indexer = new Indexer(INDEXER);
  const out = `/tmp/${rootHash.replace(/[^a-z0-9]/gi, '')}-${randomUUID()}.bin`;
  const err = await indexer.download(rootHash, out, true);
  if (err) throw new Error(`download: ${err}`);
  try {
    return new Uint8Array(await readFile(out));
  } finally {
    await unlink(out).catch(() => {});
  }
}
