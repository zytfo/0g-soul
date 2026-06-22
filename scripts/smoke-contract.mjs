import { ethers } from 'ethers';
import { readFile } from 'node:fs/promises';

const RPC = 'https://evmrpc-testnet.0g.ai';
const ADDR = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || '0xc2cC37d16Bb04E6004E3f19CBb079aC21094121A';
const abi = JSON.parse(await readFile('/tmp/soul-build/contracts_SoulAgent_sol_SoulAgent.abi', 'utf8'));

const w = new ethers.Wallet(process.env.PRIVATE_KEY, new ethers.JsonRpcProvider(RPC));
const c = new ethers.Contract(ADDR, abi, w);

const rc = await (await c.mint('0xroothash_one')).wait();
let tokenId;
for (const log of rc.logs) {
  try {
    const p = c.interface.parseLog(log);
    if (p && p.name === 'AgentMinted') {
      tokenId = p.args.tokenId;
      console.log('AgentMinted -> tokenId', tokenId.toString(), 'owner', p.args.owner, 'rootHash', p.args.rootHash);
    }
  } catch {}
}
console.log('memoryOf:', await c.memoryOf(tokenId));
await (await c.setMemory(tokenId, '0xroothash_two')).wait();
console.log('memoryOf after setMemory:', await c.memoryOf(tokenId));
console.log('ownerOf:', await c.ownerOf(tokenId));
console.log('OK');
