import { Indexer, MemData } from '@0gfoundation/0g-storage-ts-sdk';
import { ethers } from 'ethers';
import { readFile, unlink } from 'node:fs/promises';

const RPC = 'https://evmrpc-testnet.0g.ai';
const INDEXER = 'https://indexer-storage-testnet-turbo.0g.ai';

const provider = new ethers.JsonRpcProvider(RPC);
const signer = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
console.log('server wallet:', await signer.getAddress());
console.log('balance:', ethers.formatEther(await provider.getBalance(signer.address)), '0G');

const indexer = new Indexer(INDEXER);
const payload = { version: 1, name: 'Nova', memorySummary: 'likes jazz', t: 'soul-smoke' };

// --- upload ---
const blob = new MemData(new TextEncoder().encode(JSON.stringify(payload)));
const [tree, treeErr] = await blob.merkleTree();
if (treeErr) throw new Error('merkleTree: ' + treeErr);
const rootHash = tree.rootHash();
console.log('rootHash (from tree):', rootHash);

const [tx, upErr] = await indexer.upload(blob, RPC, signer);
if (upErr) throw new Error('upload: ' + upErr);
console.log('upload tx shape:', JSON.stringify(tx));

// --- download to /tmp ---
const out = `/tmp/${rootHash.replace(/[^a-z0-9]/gi, '')}.json`;
const dlErr = await indexer.download(rootHash, out, true);
if (dlErr) throw new Error('download: ' + dlErr);
const back = JSON.parse(await readFile(out, 'utf8'));
await unlink(out).catch(() => {});
console.log('round-trip ok:', back.t === 'soul-smoke' && back.name === 'Nova');
console.log('OK');
