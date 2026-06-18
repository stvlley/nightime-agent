// Idempotent demo-data seeder for the linked Supabase project.
//
// Usage: node scripts/seed.mjs [email]
//   - Reads SUPABASE_URL + service-role key from .env
//   - Looks up the target user by email (default: test@nightime.local)
//   - Clears that user's threads/messages/bookings/faq, then inserts fresh demo data
//
// Service-role key is used here ONLY in this server-side script — never in the app.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

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

if (!URL || !KEY) {
  console.error('Missing EXPO_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

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
  if (!res.ok) {
    throw new Error(`${init.method || 'GET'} ${path} -> ${res.status} ${await res.text()}`);
  }
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

function isoOffset({ days = 0, hours = 0, minutes = 0 } = {}) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(d.getHours() + hours, d.getMinutes() + minutes, 0, 0);
  return d.toISOString();
}

function atTimeToday(hour, minute = 0, dayOffset = 0) {
  const d = new Date();
  d.setDate(d.getDate() + dayOffset);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

async function main() {
  console.log(`Seeding demo data for ${EMAIL} on ${URL}`);
  const userId = await findUserId(EMAIL);
  console.log(`  user id: ${userId}`);

  // Clear existing rows for this user (idempotent re-seed).
  // Order respects FKs: bookings + messages reference threads; services/availability
  // are keyed by provider_id.
  await rest(`bookings?user_id=eq.${userId}`, { method: 'DELETE' });
  await rest(`messages?user_id=eq.${userId}`, { method: 'DELETE' });
  await rest(`threads?user_id=eq.${userId}`, { method: 'DELETE' });
  await rest(`faq?user_id=eq.${userId}`, { method: 'DELETE' });
  await rest(`services?provider_id=eq.${userId}`, { method: 'DELETE' });
  await rest(`availability?provider_id=eq.${userId}`, { method: 'DELETE' });
  console.log('  cleared existing demo rows');

  // Publish the provider's public profile (the portal surface).
  await rest(`profiles?id=eq.${userId}`, {
    method: 'PATCH',
    body: JSON.stringify({
      slug: 'nightime-demo',
      display_name: 'Nitime Demo',
      headline: 'Massage & bodywork',
      bio: 'Relaxation and deep tissue by appointment. Discreet, professional, by-appointment only.',
      location_label: 'Downtown',
      published: true,
    }),
  });
  console.log('  published provider profile (slug: nightime-demo)');

  // Services
  await rest('services', {
    method: 'POST',
    body: JSON.stringify([
      { provider_id: userId, name: 'Swedish Massage (60 min)', duration_minutes: 60, price_cents: 8000, sort_order: 1 },
      { provider_id: userId, name: 'Deep Tissue (90 min)', duration_minutes: 90, price_cents: 12000, sort_order: 2 },
      { provider_id: userId, name: 'Hot Stone (75 min)', duration_minutes: 75, price_cents: 11000, sort_order: 3 },
    ]),
  });
  console.log('  inserted 3 services');

  // Availability (Tue–Sat, 9–5, ET)
  await rest('availability', {
    method: 'POST',
    body: JSON.stringify([2, 3, 4, 5, 6].map((day_of_week) => ({
      provider_id: userId,
      day_of_week,
      start_time: '09:00',
      end_time: '17:00',
      timezone: 'America/New_York',
    }))),
  });
  console.log('  inserted 5 availability windows');

  // FAQ
  await rest('faq', {
    method: 'POST',
    body: JSON.stringify([
      { user_id: userId, trigger: 'What are your rates?', reply_text: '60 min is $80, 90 min is $120. Want me to find you a time?', enabled: true },
      { user_id: userId, trigger: 'What services do you offer?', reply_text: 'Swedish, Deep Tissue, Sports, and Hot Stone. Each session is tailored to you.', enabled: true },
      { user_id: userId, trigger: 'Where are you located?', reply_text: "I'll share the address once your booking is confirmed.", enabled: false },
    ]),
  });
  console.log('  inserted 3 faq rows');

  // Threads (returning=representation to get generated ids back)
  const threads = await rest('threads', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify([
      { user_id: userId, channel: 'whatsapp', external_thread_id: 'wa-1001', client_handle: 'John Smith', state: 'confirmed', last_activity_at: isoOffset({ minutes: -2 }) },
      { user_id: userId, channel: 'telegram', external_thread_id: 'tg-2002', client_handle: 'Sarah Wilson', state: 'awaiting_client', last_activity_at: isoOffset({ minutes: -15 }) },
      { user_id: userId, channel: 'email', external_thread_id: 'em-3003', client_handle: 'mike@example.com', state: 'open', last_activity_at: isoOffset({ hours: -2 }) },
    ]),
  });
  const [t1, t2, t3] = threads;
  console.log(`  inserted ${threads.length} threads`);

  // Messages. PostgREST bulk insert requires every object to have the SAME keys,
  // so each row includes ai_confidence (null for inbound/non-AI rows).
  await rest('messages', {
    method: 'POST',
    body: JSON.stringify([
      { user_id: userId, thread_id: t1.id, text: 'Thank you for the session today, feeling much better!', sender: 'client', direction: 'in', ai_generated: false, ai_confidence: null, created_at: isoOffset({ minutes: -2 }) },
      { user_id: userId, thread_id: t1.id, text: 'So glad to hear it! See you next time.', sender: 'ai', direction: 'out', ai_generated: true, ai_confidence: 0.92, created_at: isoOffset({ minutes: -1 }) },
      { user_id: userId, thread_id: t2.id, text: 'Do you have anything tomorrow afternoon?', sender: 'client', direction: 'in', ai_generated: false, ai_confidence: null, created_at: isoOffset({ minutes: -16 }) },
      { user_id: userId, thread_id: t2.id, text: 'Our next available slot is tomorrow at 3 PM. Want me to book it?', sender: 'ai', direction: 'out', ai_generated: true, ai_confidence: 0.88, created_at: isoOffset({ minutes: -15 }) },
      { user_id: userId, thread_id: t3.id, text: 'Hi, I found you online — are you taking new clients?', sender: 'client', direction: 'in', ai_generated: false, ai_confidence: null, created_at: isoOffset({ hours: -2 }) },
    ]),
  });
  console.log('  inserted 5 messages');

  // Bookings (today + this week)
  await rest('bookings', {
    method: 'POST',
    body: JSON.stringify([
      { user_id: userId, thread_id: t1.id, start: atTimeToday(10, 0), end: atTimeToday(11, 30), status: 'confirmed' },
      { user_id: userId, thread_id: t2.id, start: atTimeToday(15, 0, 1), end: atTimeToday(16, 0, 1), status: 'tentative' },
      { user_id: userId, thread_id: t1.id, start: atTimeToday(16, 30), end: atTimeToday(17, 45), status: 'confirmed' },
    ]),
  });
  console.log('  inserted 3 bookings');

  console.log('Done.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
