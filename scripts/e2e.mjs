#!/usr/bin/env node
import { spawnSync } from 'node:child_process';

const FLOW_GROUPS = {
  smoke: ['channels', 'inbox', 'thread'],
  'settings-surfaces': [
    'billing',
    'payments',
    'upload',
    'public-profile',
    'public-profile-unpublished',
    'public-profile-age-gate',
    'public-profile-no-age-gate',
  ],
  'agent-contract': ['faq-hit', 'faq-miss'],
};

const FLOWS = {
  'faq-hit': {
    script: 'playwright-faq-hit-flow.mjs',
    verify: ['webchat-inbound', 'webchat-poll'],
  },
  'faq-miss': {
    script: 'playwright-faq-miss-flow.mjs',
    verify: ['webchat-inbound', 'webchat-poll'],
  },
  'dashboard-card': {
    script: 'playwright-dashboard-approval-card-flow.mjs',
    verify: ['webchat-inbound', 'webchat-poll'],
  },
  calendar: { script: 'playwright-calendar-flow.mjs' },
  payments: { script: 'playwright-payments-flow.mjs' },
  billing: { script: 'playwright-billing-flow.mjs' },
  upload: { script: 'playwright-upload-flow.mjs' },
  'manual-reply': {
    script: 'playwright-manual-reply-flow.mjs',
    verify: ['webchat-inbound', 'webchat-poll', 'send-draft'],
  },
  'profile-slug': {
    script: 'playwright-profile-slug-flow.mjs',
    verify: ['webchat-inbound', 'webchat-poll'],
  },
  'public-profile': { script: 'playwright-public-profile-flow.mjs' },
  'public-profile-unpublished': { script: 'playwright-public-profile-unpublished-flow.mjs' },
  'public-profile-age-gate': { script: 'playwright-public-profile-age-gate-flow.mjs' },
  'public-profile-no-age-gate': { script: 'playwright-public-profile-no-age-gate-flow.mjs' },
  paywall: { script: 'playwright-paywall-flow.mjs' },
  'ai-settings-faq-toggle': {
    script: 'playwright-ai-settings-faq-toggle-flow.mjs',
    verify: ['webchat-inbound', 'webchat-poll'],
  },
  channels: { script: 'playwright-channels-readiness-flow.mjs' },
  inbox: {
    script: 'playwright-inbox-approval-flow.mjs',
    verify: ['webchat-inbound', 'webchat-poll', 'send-draft'],
  },
  thread: {
    script: 'playwright-thread-detail-flow.mjs',
    verify: ['webchat-inbound', 'webchat-poll', 'send-draft'],
  },
  webchat: {
    script: 'playwright-webchat-workspace-flow.mjs',
    verify: ['webchat-inbound', 'webchat-poll'],
  },
};

function usage() {
  const flows = [...Object.keys(FLOWS), ...Object.keys(FLOW_GROUPS)].sort().join(', ');
  console.error(`Usage: node scripts/e2e.mjs <flow> [--headless] [--slow] [--keep-open]\n\nFlows: ${flows}`);
}

function run(command, args, env = process.env) {
  const result = spawnSync(command, args, {
    env,
    stdio: 'inherit',
    shell: false,
  });

  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

function envForFlags(flags) {
  const env = { ...process.env };

  if (flags.has('--headless')) env.E2E_HEADLESS = 'true';
  if (flags.has('--headed')) env.E2E_HEADLESS = 'false';
  if (flags.has('--slow')) env.E2E_SLOWMO_MS = env.E2E_SLOWMO_MS ?? '1200';
  if (flags.has('--keep-open')) env.E2E_KEEP_OPEN = 'true';

  return env;
}

function runFlow(name, flags) {
  const group = FLOW_GROUPS[name];
  if (group) {
    for (const flowName of group) runFlow(flowName, flags);
    return;
  }

  const flow = FLOWS[name];
  if (!flow) {
    usage();
    process.exit(1);
  }

  const env = envForFlags(flags);
  if (flow.verify?.length) {
    run('node', ['scripts/verify-remote-functions.mjs', ...flow.verify], env);
  }

  run(
    'node',
    ['scripts/.env.load', 'EXPO_PUBLIC_BYPASS_PAYWALL', '--', 'node', `scripts/${flow.script}`],
    env
  );
}

const [flowName, ...rawFlags] = process.argv.slice(2);
if (!flowName) {
  usage();
  process.exit(1);
}

if (flowName === 'verify:webchat') {
  run('node', ['scripts/verify-remote-functions.mjs', 'webchat-inbound', 'webchat-poll']);
} else {
  runFlow(flowName, new Set(rawFlags));
}
