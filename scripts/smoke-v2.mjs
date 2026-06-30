import { ethers } from 'ethers';
import { readFile } from 'node:fs/promises';

const RPC = 'https://evmrpc-testnet.0g.ai';
const ADDR = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;
const abi = JSON.parse(await readFile('/tmp/soul-build2/contracts_SoulAgentV2_sol_SoulAgentV2.abi', 'utf8'));

const w = new ethers.Wallet(process.env.PRIVATE_KEY, new ethers.JsonRpcProvider(RPC));
const c = new ethers.Contract(ADDR, abi, w);

console.log('Contract:', ADDR);

// mint
const rc = await (await c.mint('0xsmoke_roothash_v2')).wait();
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
console.log('tokenURI:', await c.tokenURI(tokenId));
console.log('ownerOf :', await c.ownerOf(tokenId));
console.log('OK');
