#!/usr/bin/env node
// Configure a provider's WhatsApp Cloud API channel.
//
// Usage:
//   node scripts/connect-whatsapp.mjs <phoneNumberId> <accessToken> [providerEmail]
//
// Required env:
//   SUPABASE_URL or EXPO_PUBLIC_SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY
//
// Optional env:
//   WHATSAPP_VERIFY_TOKEN (the token you enter in Meta's webhook config)

import { randomBytes } from 'node:crypto';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PHONE_NUMBER_ID = (process.argv[2] || '').trim();
const ACCESS_TOKEN = process.argv[3];
const EMAIL = process.argv[4] || 'test@nightime.local';

if (!SUPABASE_URL || !SERVICE_ROLE) {
  console.error('Missing SUPABASE_URL/EXPO_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}
if (!PHONE_NUMBER_ID || !ACCESS_TOKEN) {
  console.error('Usage: node scripts/connect-whatsapp.mjs <phoneNumberId> <accessToken> [providerEmail]');
  process.exit(1);
}

const REST = `${SUPABASE_URL}/rest/v1`;
const headers = {
  apikey: SERVICE_ROLE,
  Authorization: `Bearer ${SERVICE_ROLE}`,
  'Content-Type': 'application/json',
};

async function rest(path, init = {}) {
  const res = await fetch(`${REST}/${path}`, { ...init, headers: { ...headers, ...(init.headers || {}) } });
  const text = await res.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  if (!res.ok) throw new Error(`${init.method || 'GET'} ${path} -> ${res.status}: ${text}`);
  return body;
}

async function main() {
  const profileRes = await rest(`profiles?email=eq.${encodeURIComponent(EMAIL)}&select=id,email`);
  const profile = profileRes?.[0];
  if (!profile) throw new Error(`No profile found for ${EMAIL}`);

  const verifyRes = await fetch(`https://graph.facebook.com/v21.0/${PHONE_NUMBER_ID}?fields=id,display_phone_number,verified_name&access_token=${encodeURIComponent(ACCESS_TOKEN)}`);
  const verifyText = await verifyRes.text();
  if (!verifyRes.ok) throw new Error(`WhatsApp phone number validation failed: ${verifyRes.status} ${verifyText}`);
  const phone = JSON.parse(verifyText);

  await rest('agent_channels?on_conflict=user_id,channel', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify({
      user_id: profile.id,
      channel: 'whatsapp',
      external_account_id: PHONE_NUMBER_ID,
      bot_token: ACCESS_TOKEN,
      webhook_secret: randomBytes(24).toString('hex'),
      metadata: {
        displayPhoneNumber: phone.display_phone_number ?? null,
        verifiedName: phone.verified_name ?? null,
      },
      active: true,
    }),
  });

  const ref = new URL(SUPABASE_URL).hostname.split('.')[0];
  console.log('WhatsApp channel enabled');
  console.log(`  provider: ${EMAIL}`);
  console.log(`  phone_number_id: ${PHONE_NUMBER_ID}`);
  console.log(`  webhook callback URL: https://${ref}.functions.supabase.co/whatsapp-webhook`);
  console.log(`  verify token: ${process.env.WHATSAPP_VERIFY_TOKEN || '(set WHATSAPP_VERIFY_TOKEN in Supabase secrets and Meta)'}`);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
