import { Indexer, MemData } from '@0gfoundation/0g-storage-ts-sdk';
import { ethers } from 'ethers';
import { readFile, unlink } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import type { AgentState } from './agent-core';

const RPC = 'https://evmrpc-testnet.0g.ai';
const INDEXER = 'https://indexer-storage-testnet-turbo.0g.ai';

function signer() {
  if (!process.env.PRIVATE_KEY) throw new Error('PRIVATE_KEY not set (server wallet for Storage)');
  return new ethers.Wallet(process.env.PRIVATE_KEY, new ethers.JsonRpcProvider(RPC));
}

/** Upload the agent state to 0G Storage; returns its root hash. */
export async function uploadMemory(state: AgentState): Promise<{ rootHash: string }> {
  const indexer = new Indexer(INDEXER);
  const blob = new MemData(new TextEncoder().encode(JSON.stringify(state)));
  const [tree, treeErr] = await blob.merkleTree(); // REQUIRED before upload
  if (treeErr || !tree) throw new Error(`merkleTree: ${treeErr ?? 'null tree'}`);
  const rootHash = tree.rootHash();
  if (!rootHash) throw new Error('merkleTree: null root hash');
  const [, uploadErr] = await indexer.upload(blob, RPC, signer());
  if (uploadErr) throw new Error(`upload: ${uploadErr}`);
  return { rootHash };
}

/** Download an agent state from 0G Storage by root hash (serverless: via /tmp). */
export async function downloadMemory(rootHash: string): Promise<AgentState> {
  const indexer = new Indexer(INDEXER);
  // unique per-call temp path so concurrent downloads of the same hash don't race
  const out = `/tmp/${rootHash.replace(/[^a-z0-9]/gi, '')}-${randomUUID()}.json`;
  const err = await indexer.download(rootHash, out, true); // (rootHash, outputPath, withProof)
  if (err) throw new Error(`download: ${err}`);
  try {
    return JSON.parse(await readFile(out, 'utf8')) as AgentState;
  } finally {
    await unlink(out).catch(() => {});
  }
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
