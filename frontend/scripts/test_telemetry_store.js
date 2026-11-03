#!/usr/bin/env node
/**
 * AERO-SPEC F1 // PHASE 2 ZUSTAND STORE & KINETIC ENGINE VERIFICATION HARNESS
 * 
 * Verifies all actions, state transitions, sector looping math, ML recalculations,
 * and subscribeWithSelector notifications for `frontend/src/store/useTelemetryStore.ts`.
 */

import { execSync } from 'node:child_process';
import path from 'node:path';

// ANSI Terminal Colors for Aerospace HUD Reporting
const C = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  magenta: '\x1b[35m',
};

console.log(`${C.bold}${C.cyan}================================================================================${C.reset}`);
console.log(`${C.bold}${C.cyan}  AERO-SPEC F1 // TELEMETRY STORE & KINETIC ENGINE VERIFICATION                 ${C.reset}`);
console.log(`${C.bold}${C.cyan}  Blueprint Contract: AERO-SPEC-ML-AG-CONTRACT-v5.0 Section 5.1                ${C.reset}`);
console.log(`${C.bold}${C.cyan}================================================================================${C.reset}\n`);

const testFile = path.resolve('frontend/src/store/__tests__/useTelemetryStore.test.ts');
const isWindows = process.platform === 'win32';
const npxCmd = isWindows ? 'npx.cmd' : 'npx';
const cmd = `${npxCmd} tsx --test "${testFile}"`;

try {
  console.log(`${C.yellow}Executing 27 Unit & Kinetic Verification Tests via tsx --test...${C.reset}\n`);
  const output = execSync(cmd, { encoding: 'utf8' });
  console.log(output);

  console.log(`${C.bold}${C.cyan}================================================================================${C.reset}`);
  console.log(`${C.bold}${C.green}✔ ALL 27 TELEMETRY STORE & KINETIC SUITES PASSED (100% VERIFIED)${C.reset}`);
  console.log(`${C.bold}${C.cyan}================================================================================${C.reset}\n`);
  process.exit(0);
} catch (err) {
  console.error(`${C.bold}${C.red}✖ Telemetry Store Verification Failed:${C.reset}\n`, err.stdout || err.message);
  process.exit(1);
}
