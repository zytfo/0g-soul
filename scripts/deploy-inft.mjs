import { ethers } from 'ethers';
import { readFile } from 'node:fs/promises';

const RPC = 'https://evmrpc-testnet.0g.ai';
const B = '/tmp/inft-build';
const provider = new ethers.JsonRpcProvider(RPC);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
console.log('deployer:', await wallet.getAddress());

async function deploy(name, args = []) {
  const abi = JSON.parse(await readFile(`${B}/contracts_${name}_sol_${name}.abi`, 'utf8'));
  const bin = '0x' + (await readFile(`${B}/contracts_${name}_sol_${name}.bin`, 'utf8')).trim();
  const f = new ethers.ContractFactory(abi, bin, wallet);
  const c = await f.deploy(...args);
  await c.waitForDeployment();
  return { addr: await c.getAddress(), abi };
}

const oracle = await deploy('MockOracle');
console.log('MockOracle:', oracle.addr);
const inft = await deploy('SoulINFT', [oracle.addr]);
console.log('SoulINFT DEPLOYED_ADDRESS=' + inft.addr);
const c = new ethers.Contract(inft.addr, inft.abi, wallet);
console.log('name/symbol:', await c.name(), await c.symbol(), 'nextId:', (await c.nextId()).toString());
