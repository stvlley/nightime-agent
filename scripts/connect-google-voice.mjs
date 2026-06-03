// Connect a provider's Google Voice mailbox through Gmail Pub/Sub.
//
// Usage:
//   node scripts/connect-google-voice.mjs <gmailAddress> <gmailRefreshToken> [providerEmail]
//
// Requires .env:
//   EXPO_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
//   GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET, GOOGLE_PUBSUB_TOPIC
//
// This stores the Gmail refresh token server-side in agent_channels.bot_token,
// registers/renews Gmail watch(), and records the returned history id as the
// baseline so old mail is not imported.
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
const CLIENT_ID = env.GOOGLE_OAUTH_CLIENT_ID;
const CLIENT_SECRET = env.GOOGLE_OAUTH_CLIENT_SECRET;
const TOPIC = env.GOOGLE_PUBSUB_TOPIC;
const GMAIL = (process.argv[2] || '').trim().toLowerCase();
const REFRESH_TOKEN = process.argv[3];
const EMAIL = process.argv[4] || 'test@nightime.local';

if (!URL || !KEY) {
  console.error('Missing EXPO_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}
if (!CLIENT_ID || !CLIENT_SECRET || !TOPIC) {
  console.error('Missing GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET, or GOOGLE_PUBSUB_TOPIC in .env');
  process.exit(1);
}
if (!GMAIL || !REFRESH_TOKEN) {
  console.error('Usage: node scripts/connect-google-voice.mjs <gmailAddress> <gmailRefreshToken> [providerEmail]');
  process.exit(1);
}

const headers = { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' };

async function rest(path, init = {}) {
  const res = await fetch(`${URL}/rest/v1/${path}`, { ...init, headers: { ...headers, ...(init.headers || {}) } });
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

async function getAccessToken() {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      refresh_token: REFRESH_TOKEN,
      grant_type: 'refresh_token',
    }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body.access_token) throw new Error(`Google OAuth failed: ${res.status} ${JSON.stringify(body)}`);
  return body.access_token;
}

async function watchMailbox(accessToken) {
  const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/watch', {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      topicName: TOPIC,
      labelIds: ['INBOX'],
      labelFilterBehavior: 'INCLUDE',
    }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body.historyId) throw new Error(`Gmail watch failed: ${res.status} ${JSON.stringify(body)}`);
  return body;
}

async function main() {
  console.log(`Connecting Google Voice/Gmail for ${EMAIL} on ${URL}`);
  const userId = await findUserId(EMAIL);
  const accessToken = await getAccessToken();
  const watch = await watchMailbox(accessToken);
  console.log(`  Gmail watch active for ${GMAIL}; historyId=${watch.historyId}`);

  await rest('agent_channels?on_conflict=user_id,channel', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates' },
    body: JSON.stringify({
      user_id: userId,
      channel: 'gv',
      external_account_id: GMAIL,
      bot_token: REFRESH_TOKEN,
      webhook_secret: randomBytes(16).toString('hex'), // unused for Gmail Pub/Sub
      metadata: {
        lastHistoryId: String(watch.historyId),
        watchExpiration: watch.expiration ? String(watch.expiration) : null,
        pubsubTopic: TOPIC,
      },
      active: true,
    }),
  });

  console.log('  saved agent_channels row (channel=gv, active=true)');
  console.log('Done. Renew Gmail watch at least daily; Gmail stops watches after 7 days.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
