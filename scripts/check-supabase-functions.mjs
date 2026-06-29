#!/usr/bin/env node
import { spawnSync } from 'node:child_process';

const entrypoints = [
  'supabase/functions/connect-calendar/index.ts',
  'supabase/functions/connect-channel/index.ts',
  'supabase/functions/google-voice-webhook/index.ts',
  'supabase/functions/issue-sms-number/index.ts',
  'supabase/functions/send-draft/index.ts',
  'supabase/functions/sim-inbound/index.ts',
  'supabase/functions/telegram-webhook/index.ts',
  'supabase/functions/webchat-inbound/index.ts',
  'supabase/functions/webchat-poll/index.ts',
  'supabase/functions/whatsapp-webhook/index.ts',
];

const deno = spawnSync('deno', ['--version'], { encoding: 'utf8' });
const command = deno.error?.code === 'ENOENT' ? 'npx' : 'deno';
const baseArgs = command === 'npx' ? ['--yes', 'deno'] : [];

if (deno.error && deno.error.code !== 'ENOENT') throw deno.error;
if (command === 'deno' && deno.status !== 0) {
  process.stderr.write(deno.stderr || deno.stdout || 'Unable to run deno --version.\n');
  process.exit(deno.status ?? 1);
}

const check = spawnSync(command, [...baseArgs, 'check', ...entrypoints], { stdio: 'inherit' });
if (check.error) throw check.error;
process.exit(check.status ?? 0);
