/**
 * Verify SoulINFT + MockOracle on 0G Mainnet (chainscan.0g.ai).
 *
 * Usage:
 *   node scripts/verify-inft-mainnet.mjs
 */
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

const API = 'https://chainscan.0g.ai/open/api';
const COMPILER = 'v0.8.35+commit.47b9dedd';
const RUNS = 200;
const ROOT = new URL('..', import.meta.url).pathname;

const SOUL_INFT = (process.env.SOUL_INFT_ADDRESS || '0x9BDe8f9a9Aa62BDBc10Cf35abA25B444Ce09761C').toLowerCase();
const MOCK_ORACLE = (process.env.MOCK_ORACLE_ADDRESS || '0x2bc3f0afb556152c11ecae21549ded65a5ff3703').toLowerCase();

const IMPORT_RE = /import\s+(?:[\w\s{},*]*\s+from\s+)?["']([^"']+)["']/g;

function resolveImport(fromFile, imp) {
  if (imp.startsWith('@openzeppelin/')) {
    return path.join(ROOT, 'node_modules', imp);
  }
  if (imp.startsWith('./') || imp.startsWith('../')) {
    return path.resolve(path.dirname(fromFile), imp);
  }
  return path.join(ROOT, imp);
}

function collectSources(entryRel) {
  const sources = {};
  const queue = [path.join(ROOT, entryRel)];
  const seen = new Set();
  while (queue.length) {
    const abs = queue.pop();
    if (seen.has(abs)) continue;
    seen.add(abs);
    if (!existsSync(abs)) throw new Error(`missing source: ${abs}`);
    const content = readFileSync(abs, 'utf8');
    let rel;
    if (abs.includes(`${path.sep}node_modules${path.sep}`)) {
      rel = abs.split(`${path.sep}node_modules${path.sep}`)[1].replace(/\\/g, '/');
    } else {
      rel = path.relative(ROOT, abs).replace(/\\/g, '/');
    }
    sources[rel] = { content };
    for (const m of content.matchAll(IMPORT_RE)) {
      queue.push(resolveImport(abs, m[1]));
    }
  }
  return sources;
}

function buildStandardJson(entryRel) {
  return {
    language: 'Solidity',
    sources: collectSources(entryRel),
    settings: {
      evmVersion: 'cancun',
      optimizer: { enabled: true, runs: RUNS },
      outputSelection: { '*': { '*': ['abi'] } },
    },
  };
}

async function verify({ address, contractName, entryRel, constructorArgs = '' }) {
  const standardJson = buildStandardJson(entryRel);
  const sourceKeys = Object.keys(standardJson.sources);
  console.log(`\n${contractName} — ${sourceKeys.length} source files`);
  const body = new URLSearchParams({
    module: 'contract',
    action: 'verifysourcecode',
    contractaddress: address,
    sourceCode: JSON.stringify(standardJson),
    codeformat: 'solidity-standard-json-input',
    contractname: contractName,
    compilerversion: COMPILER,
    optimizationUsed: '1',
    runs: String(RUNS),
    constructorArguements: constructorArgs,
    apikey: 'placeholder',
  });
  const res = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body });
  const text = await res.text();
  if (!text.startsWith('{')) throw new Error(`verify HTTP ${res.status}: ${text.slice(0, 200)}`);
  const json = JSON.parse(text);
  console.log('submit:', JSON.stringify(json));
  if (json.status !== '1') throw new Error(json.result || json.message || 'verify submit failed');
  const guid = json.result;
  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 3000));
    const check = new URLSearchParams({ module: 'contract', action: 'checkverifystatus', guid, apikey: 'placeholder' });
    const st = await (await fetch(`${API}?${check}`)).json();
    console.log('  poll:', st.result);
    if (st.result === 'Pass - Verified') {
      console.log(`  ✓ https://chainscan.0g.ai/address/${address}#code`);
      return;
    }
    if (typeof st.result === 'string' && st.result.startsWith('Fail')) throw new Error(st.result);
  }
  throw new Error('verification timed out');
}

console.log('Verifying on 0G Mainnet (chain 16661)…');
if (process.env.VERIFY_ONLY !== 'soulinft') {
  await verify({
    address: MOCK_ORACLE,
    contractName: 'contracts/MockOracle.sol:MockOracle',
    entryRel: 'contracts/MockOracle.sol',
  });
}
await verify({
  address: SOUL_INFT,
  contractName: 'contracts/SoulINFT.sol:SoulINFT',
  entryRel: 'contracts/SoulINFT.sol',
  constructorArgs: '0000000000000000000000002bc3f0afb556152c11ecae21549ded65a5ff3703',
});
console.log('\nDone.');
