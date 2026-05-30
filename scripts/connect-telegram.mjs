// Connect a provider's Telegram bot to the agent runtime (server-side).
//
// Usage:
//   node scripts/connect-telegram.mjs <botToken> [providerEmail]
//
//   - Reads SUPABASE_URL + service-role key from .env (never used in the app).
//   - Resolves the provider by email (default: test@nightime.local).
//   - Generates a webhook secret, upserts the agent_channels row, and points the
//     Telegram bot's webhook at the deployed `telegram-webhook` Edge Function.
//
// Requires the function to be deployed (FUNCTIONS_BASE_URL or derived from
// SUPABASE_URL): https://<ref>.functions.supabase.co/telegram-webhook
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { randomBytes } from 'node:crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnv() {
  const text = readFileSync(join(__dirname, '..', '.env'), 'utf8');
  const env = {};
  for (const line of text.split('\n')) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m) env[m[1]] = m[2].trim();
  }
  return env;
}

const env = loadEnv();
const URL = env.EXPO_PUBLIC_SUPABASE_URL;
const KEY = env.SUPABASE_SERVICE_ROLE_KEY;
const BOT_TOKEN = process.argv[2];
const EMAIL = process.argv[3] || 'test@nightime.local';

if (!URL || !KEY) {
  console.error('Missing EXPO_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}
if (!BOT_TOKEN) {
  console.error('Usage: node scripts/connect-telegram.mjs <botToken> [providerEmail]');
  process.exit(1);
}

// https://<ref>.supabase.co -> https://<ref>.functions.supabase.co
const FUNCTIONS_BASE =
  env.FUNCTIONS_BASE_URL || URL.replace('.supabase.co', '.functions.supabase.co');
const WEBHOOK_URL = `${FUNCTIONS_BASE}/telegram-webhook`;

const headers = {
  apikey: KEY,
  Authorization: `Bearer ${KEY}`,
  'Content-Type': 'application/json',
};

async function rest(path, init = {}) {
  const res = await fetch(`${URL}/rest/v1/${path}`, {
    ...init,
    headers: { ...headers, ...(init.headers || {}) },
  });
  if (!res.ok) throw new Error(`${init.method || 'GET'} ${path} -> ${res.status} ${await res.text()}`);
  const ct = res.headers.get('content-type') || '';
  return ct.includes('application/json') ? res.json() : null;
}

async function findUserId(email) {
  const res = await fetch(`${URL}/auth/v1/admin/users`, { headers });
  if (!res.ok) throw new Error(`admin/users -> ${res.status}`);
  const { users } = await res.json();
  const user = users.find((u) => u.email === email);
  if (!user) throw new Error(`No auth user with email ${email}`);
  return user.id;
}

async function main() {
  console.log(`Connecting Telegram bot for ${EMAIL} on ${URL}`);
  const userId = await findUserId(EMAIL);
  const webhookSecret = randomBytes(24).toString('hex');

  // Identify the bot (and validate the token) before persisting anything.
  const meRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getMe`);
  const me = await meRes.json();
  if (!me.ok) throw new Error(`Invalid bot token: ${JSON.stringify(me)}`);
  const username = me.result.username;
  console.log(`  bot: @${username}`);

  // Upsert the channel row (unique on user_id + channel).
  await rest('agent_channels?on_conflict=user_id,channel', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates' },
    body: JSON.stringify({
      user_id: userId,
      channel: 'telegram',
      external_account_id: username,
      bot_token: BOT_TOKEN,
      webhook_secret: webhookSecret,
      active: true,
    }),
  });
  console.log('  saved agent_channels row');

  // Point Telegram at the deployed Edge Function, echoing our secret header.
  const setRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/setWebhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url: WEBHOOK_URL,
      secret_token: webhookSecret,
      allowed_updates: ['message', 'edited_message'],
    }),
  });
  const setJson = await setRes.json();
  if (!setJson.ok) throw new Error(`setWebhook failed: ${JSON.stringify(setJson)}`);
  console.log(`  webhook set -> ${WEBHOOK_URL}`);
  console.log('Done. Message the bot to test the loop.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
