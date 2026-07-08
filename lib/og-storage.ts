import { Indexer, MemData } from '@0gfoundation/0g-storage-ts-sdk';
import { ethers } from 'ethers';
import { readFile, unlink } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { NETWORKS, type NetworkId } from './networks';

function signer(network: NetworkId = 'testnet') {
  if (!process.env.PRIVATE_KEY) throw new Error('PRIVATE_KEY not set (server wallet for Storage)');
  const { rpc } = NETWORKS[network];
  return new ethers.Wallet(process.env.PRIVATE_KEY, new ethers.JsonRpcProvider(rpc));
}

/** Upload raw bytes to 0G Storage; returns root hash. */
export async function uploadBytes(bytes: Uint8Array, network: NetworkId = 'testnet'): Promise<{ rootHash: string }> {
  const { rpc, indexer: indexerUrl } = NETWORKS[network];
  const indexer = new Indexer(indexerUrl);
  const blob = new MemData(bytes);
  const [tree, treeErr] = await blob.merkleTree();
  if (treeErr || !tree) throw new Error(`merkleTree: ${treeErr ?? 'null tree'}`);
  const rootHash = tree.rootHash();
  if (!rootHash) throw new Error('merkleTree: null root hash');
  const [, uploadErr] = await indexer.upload(blob, rpc, signer(network));
  if (uploadErr) throw new Error(`upload: ${uploadErr}`);
  return { rootHash };
}

/** Download raw bytes from 0G Storage by root hash (serverless: via /tmp). */
export async function downloadBytes(rootHash: string, network: NetworkId = 'testnet'): Promise<Uint8Array> {
  const indexer = new Indexer(NETWORKS[network].indexer);
  const out = `/tmp/${rootHash.replace(/[^a-z0-9]/gi, '')}-${randomUUID()}.bin`;
  const err = await indexer.download(rootHash, out, true);
  if (err) throw new Error(`download: ${err}`);
  try {
    return new Uint8Array(await readFile(out));
  } finally {
    await unlink(out).catch(() => {});
  }
}
