#!/usr/bin/env node
/** Compile SoulINFT + MockOracle to /tmp/inft-build for deploy scripts. */
import { execSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';

const OUT = '/tmp/inft-build';
mkdirSync(OUT, { recursive: true });
const cmd =
  'npx solc --base-path . --include-path node_modules --optimize --bin --abi ' +
  'contracts/MockOracle.sol contracts/SoulINFT.sol -o ' +
  OUT;
console.log('>', cmd);
execSync(cmd, { stdio: 'inherit', cwd: new URL('..', import.meta.url).pathname });
console.log('artifacts →', OUT);
