// Enable the zero-setup web-chat channel for a provider (server-side).
//
// Usage:
//   node scripts/enable-webchat.mjs [providerEmail] [slug]
//
//   - Reads EXPO_PUBLIC_SUPABASE_URL + service-role key from .env.
//   - Resolves the provider by email (default: test@nightime.local).
//   - Ensures the provider has a public `slug` (uses the given slug, else keeps
//     the existing one, else derives one from the email).
//   - Upserts an `agent_channels` row (channel='webchat', active=true). Web chat
//     needs no bot token; `webhook_secret` is a throwaway (unused for this
//     channel) only because the column is NOT NULL.
//   - Prints the public widget link + an embed snippet.
//
// Unlike Telegram, there is nothing for the provider to register — this is the
// no-setup channel.
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
const EMAIL = process.argv[2] || 'test@nightime.local';
const SLUG_ARG = (process.argv[3] || '').trim().toLowerCase();

if (!URL || !KEY) {
  console.error('Missing EXPO_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const FUNCTIONS_BASE = env.FUNCTIONS_BASE_URL || URL.replace('.supabase.co', '.functions.supabase.co');
// Where the static widget is hosted (defaults to the app origin /chat.html).
const WIDGET_BASE = env.WEBCHAT_WIDGET_BASE || 'https://nightime-agent.vercel.app/chat.html';

const headers = { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' };

async function rest(path, init = {}) {
  const res = await fetch(`${URL}/rest/v1/${path}`, { ...init, headers: { ...headers, ...(init.headers || {}) } });
  if (!res.ok) throw new Error(`${init.method || 'GET'} ${path} -> ${res.status} ${await res.text()}`);
  const ct = res.headers.get('content-type') || '';
  return ct.includes('application/json') ? res.json() : null;
}

async function findUser(email) {
  const res = await fetch(`${URL}/auth/v1/admin/users`, { headers });
  if (!res.ok) throw new Error(`admin/users -> ${res.status}`);
  const { users } = await res.json();
  const user = users.find((u) => u.email === email);
  if (!user) throw new Error(`No auth user with email ${email}`);
  return user.id;
}

function slugify(s) {
  return s.split('@')[0].toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'provider';
}

async function main() {
  console.log(`Enabling web chat for ${EMAIL} on ${URL}`);
  const userId = await findUser(EMAIL);

  const [profile] = await rest(`profiles?id=eq.${userId}&select=slug`);
  let slug = SLUG_ARG || profile?.slug || slugify(EMAIL);
  if (slug !== profile?.slug) {
    await rest(`profiles?id=eq.${userId}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ slug }) });
  }
  console.log(`  slug: ${slug}`);

  await rest('agent_channels?on_conflict=user_id,channel', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates' },
    body: JSON.stringify({
      user_id: userId,
      channel: 'webchat',
      external_account_id: slug,
      webhook_secret: randomBytes(16).toString('hex'), // unused for webchat; column is NOT NULL
      active: true,
    }),
  });
  console.log('  saved agent_channels row (channel=webchat, active=true)');

  const link = `${WIDGET_BASE}?slug=${encodeURIComponent(slug)}`;
  console.log('\nShare this chat link with clients:');
  console.log(`  ${link}`);
  console.log('\nOr embed on a site:');
  console.log(`  <iframe src="${link}" style="width:380px;height:560px;border:0"></iframe>`);
  console.log('\nFunctions base (widget calls these):', FUNCTIONS_BASE);
  console.log('Done. No bot, no tokens — clients can message right away.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
