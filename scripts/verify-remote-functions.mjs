#!/usr/bin/env node
import { spawnSync } from 'node:child_process';

const required = process.argv.slice(2);
const MAX_ATTEMPTS = 3;

if (required.length === 0) {
  console.error('Usage: node scripts/verify-remote-functions.mjs <function-name> [...]');
  process.exit(1);
}

let result = null;
for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
  result = spawnSync('supabase', ['functions', 'list', '--output', 'json'], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  if (result.status === 0) break;
  if (attempt < MAX_ATTEMPTS) {
    await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
  }
}

if (!result || result.status !== 0) {
  process.stderr.write(result?.stderr || result?.stdout || 'Failed to list remote functions.\n');
  process.exit(result?.status ?? 1);
}

const stdout = result.stdout || '';
const start = stdout.indexOf('[');
const end = stdout.lastIndexOf(']');

if (start === -1 || end === -1 || end < start) {
  console.error('Could not parse `supabase functions list --output json` output.');
  process.exit(1);
}

let functions;
try {
  functions = JSON.parse(stdout.slice(start, end + 1));
} catch (error) {
  console.error('Failed to parse remote functions JSON.');
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}

const activeSlugs = new Set(
  functions
    .filter((fn) => fn && fn.status === 'ACTIVE' && typeof fn.slug === 'string')
    .map((fn) => fn.slug)
);

const missing = required.filter((name) => !activeSlugs.has(name));

if (missing.length > 0) {
  console.error(`Missing remote functions: ${missing.join(', ')}`);
  console.error(`Active functions: ${Array.from(activeSlugs).sort().join(', ') || '(none)'}`);
  process.exit(1);
}

console.log(`Verified remote functions: ${required.join(', ')}`);
