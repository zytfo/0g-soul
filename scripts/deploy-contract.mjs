import { ethers } from 'ethers';
import { readFile } from 'node:fs/promises';

const RPC = 'https://evmrpc-testnet.0g.ai';
const BIN = '/tmp/soul-build/contracts_SoulAgent_sol_SoulAgent.bin';
const ABI = '/tmp/soul-build/contracts_SoulAgent_sol_SoulAgent.abi';

const provider = new ethers.JsonRpcProvider(RPC);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
console.log('deployer:', await wallet.getAddress());
console.log('balance :', ethers.formatEther(await provider.getBalance(wallet.address)), '0G');

const bytecode = '0x' + (await readFile(BIN, 'utf8')).trim();
const abi = JSON.parse(await readFile(ABI, 'utf8'));

const factory = new ethers.ContractFactory(abi, bytecode, wallet);
console.log('deploying SoulAgent…');
const contract = await factory.deploy();
await contract.waitForDeployment();
const addr = await contract.getAddress();
console.log('DEPLOYED_ADDRESS=' + addr);

// sanity read
const nextId = await contract.nextId();
console.log('nextId (expect 0):', nextId.toString());
console.log('name  :', await contract.name());
console.log('symbol:', await contract.symbol());
console.log('OK');
