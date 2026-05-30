// Idempotent auth/profile seed for the main local/remote Supabase project.
//
// Usage: node scripts/seed-users.mjs
//
// Reads EXPO_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY from .env.
// Service-role key is used here ONLY in this server-side script.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnv() {
  const text = readFileSync(join(__dirname, '..', '.env'), 'utf8');
  const env = {};
  for (const line of text.split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) env[m[1]] = m[2].trim();
  }
  return env;
}

const env = loadEnv();
const URL = env.EXPO_PUBLIC_SUPABASE_URL;
const KEY = env.SUPABASE_SERVICE_ROLE_KEY;

if (!URL || !KEY) {
  console.error('Missing EXPO_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const headers = {
  apikey: KEY,
  Authorization: `Bearer ${KEY}`,
  'Content-Type': 'application/json',
};

const seedUsers = [
  {
    role: 'provider',
    email: 'provider@nightime.local',
    password: 'provider1',
    businessName: 'Provider Demo',
    profile: {
      slug: 'provider-demo',
      display_name: 'Provider Demo',
      headline: 'Massage & bodywork by appointment',
      bio: 'Relaxation and deep tissue sessions with simple online booking.',
      location_label: 'Downtown',
      published: true,
      age_gate_required: true,
    },
  },
  {
    role: 'client',
    email: 'client@nightime.local',
    password: 'client1',
    businessName: 'Client Demo',
    profile: {
      slug: null,
      display_name: 'Client Demo',
      headline: null,
      bio: null,
      location_label: null,
      published: false,
      age_gate_required: true,
    },
  },
  {
    role: 'admin',
    email: 'admin@nightime.local',
    password: 'admin1',
    businessName: 'Admin Demo',
    profile: {
      slug: null,
      display_name: 'Admin Demo',
      headline: null,
      bio: null,
      location_label: null,
      published: false,
      age_gate_required: true,
    },
  },
];

async function request(path, init = {}) {
  const res = await fetch(`${URL}${path}`, {
    ...init,
    headers: { ...headers, ...(init.headers || {}) },
  });

  if (!res.ok) {
    throw new Error(`${init.method || 'GET'} ${path} -> ${res.status} ${await res.text()}`);
  }

  const ct = res.headers.get('content-type') || '';
  return ct.includes('application/json') ? res.json() : null;
}

async function rest(path, init = {}) {
  return request(`/rest/v1/${path}`, init);
}

async function listUsers() {
  const { users } = await request('/auth/v1/admin/users');
  return users;
}

async function upsertAuthUser(seed, existingUsers) {
  const existing = existingUsers.find((user) => user.email === seed.email);
  const body = {
    email: seed.email,
    password: seed.password,
    email_confirm: true,
    user_metadata: {
      role: seed.role,
      name: seed.businessName,
    },
    app_metadata: {
      role: seed.role,
    },
  };

  if (existing) {
    const user = await request(`/auth/v1/admin/users/${existing.id}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
    return user;
  }

  const user = await request('/auth/v1/admin/users', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return user;
}

async function clearProviderData(providerId) {
  await rest(`bookings?user_id=eq.${providerId}`, { method: 'DELETE' });
  await rest(`messages?user_id=eq.${providerId}`, { method: 'DELETE' });
  await rest(`threads?user_id=eq.${providerId}`, { method: 'DELETE' });
  await rest(`faq?user_id=eq.${providerId}`, { method: 'DELETE' });
  await rest(`services?provider_id=eq.${providerId}`, { method: 'DELETE' });
  await rest(`availability?provider_id=eq.${providerId}`, { method: 'DELETE' });
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

async function seedProviderData(providerId) {
  await clearProviderData(providerId);

  await rest('services', {
    method: 'POST',
    body: JSON.stringify([
      { provider_id: providerId, name: 'Swedish Massage (60 min)', description: 'A calming full-body session.', duration_minutes: 60, price_cents: 8000, sort_order: 1 },
      { provider_id: providerId, name: 'Deep Tissue (90 min)', description: 'Focused pressure for tension relief.', duration_minutes: 90, price_cents: 12000, sort_order: 2 },
      { provider_id: providerId, name: 'Hot Stone (75 min)', description: 'Heated stone therapy for relaxation.', duration_minutes: 75, price_cents: 11000, sort_order: 3 },
    ]),
  });

  await rest('availability', {
    method: 'POST',
    body: JSON.stringify([2, 3, 4, 5, 6].map((day_of_week) => ({
      provider_id: providerId,
      day_of_week,
      start_time: '09:00',
      end_time: '17:00',
      timezone: 'America/New_York',
    }))),
  });

  await rest('faq', {
    method: 'POST',
    body: JSON.stringify([
      { user_id: providerId, trigger: 'What are your rates?', reply_text: '60 minutes is $80, 90 minutes is $120. Want me to find you a time?', enabled: true },
      { user_id: providerId, trigger: 'What services do you offer?', reply_text: 'Swedish, Deep Tissue, and Hot Stone sessions are available.', enabled: true },
      { user_id: providerId, trigger: 'Where are you located?', reply_text: "I'll share the address after your booking is confirmed.", enabled: true },
    ]),
  });

  const threads = await rest('threads', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify([
      { user_id: providerId, channel: 'whatsapp', external_thread_id: 'wa-provider-1001', client_handle: 'Alex Client', state: 'confirmed', last_activity_at: isoOffset({ minutes: -4 }) },
      { user_id: providerId, channel: 'telegram', external_thread_id: 'tg-provider-2002', client_handle: 'Mia Client', state: 'awaiting_client', last_activity_at: isoOffset({ minutes: -22 }) },
      { user_id: providerId, channel: 'email', external_thread_id: 'em-provider-3003', client_handle: 'sam@example.com', state: 'open', last_activity_at: isoOffset({ hours: -2 }) },
    ]),
  });

  const [confirmedThread, pendingThread, openThread] = threads;

  await rest('messages', {
    method: 'POST',
    body: JSON.stringify([
      { user_id: providerId, thread_id: confirmedThread.id, text: 'Thanks, that time works for me.', sender: 'client', direction: 'in', ai_generated: false, ai_confidence: null, created_at: isoOffset({ minutes: -6 }) },
      { user_id: providerId, thread_id: confirmedThread.id, text: 'You are booked for 10 AM. I will send the details now.', sender: 'ai', direction: 'out', ai_generated: true, ai_confidence: 0.93, created_at: isoOffset({ minutes: -4 }) },
      { user_id: providerId, thread_id: pendingThread.id, text: 'Do you have anything tomorrow afternoon?', sender: 'client', direction: 'in', ai_generated: false, ai_confidence: null, created_at: isoOffset({ minutes: -23 }) },
      { user_id: providerId, thread_id: pendingThread.id, text: 'Tomorrow at 3 PM is open. Should I hold it for you?', sender: 'ai', direction: 'out', ai_generated: true, ai_confidence: 0.88, created_at: isoOffset({ minutes: -22 }) },
      { user_id: providerId, thread_id: openThread.id, text: 'Hi, are you accepting new clients?', sender: 'client', direction: 'in', ai_generated: false, ai_confidence: null, created_at: isoOffset({ hours: -2 }) },
    ]),
  });

  await rest('bookings', {
    method: 'POST',
    body: JSON.stringify([
      { user_id: providerId, thread_id: confirmedThread.id, start: atTimeToday(10, 0), end: atTimeToday(11, 0), status: 'confirmed', client_name: 'Alex Client', client_contact: 'alex@example.com', source: 'ai', amount_cents: 8000, deposit_cents: 0, currency: 'USD', payment_status: 'none' },
      { user_id: providerId, thread_id: pendingThread.id, start: atTimeToday(15, 0, 1), end: atTimeToday(16, 30, 1), status: 'tentative', client_name: 'Mia Client', client_contact: '@mia', source: 'ai', amount_cents: 12000, deposit_cents: 0, currency: 'USD', payment_status: 'none' },
    ]),
  });
}

async function main() {
  console.log(`Seeding users on ${URL}`);
  const existingUsers = await listUsers();
  const created = [];

  for (const seed of seedUsers) {
    const authUser = await upsertAuthUser(seed, existingUsers);
    created.push({ ...seed, id: authUser.id });

    await rest('profiles', {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates' },
      body: JSON.stringify({
        id: authUser.id,
        email: seed.email,
        business_name: seed.businessName,
        timezone: 'America/New_York',
        plan: seed.role === 'provider' ? 'pro' : 'starter',
        usage_month_count: 0,
        usage_limit: seed.role === 'provider' ? 1000 : 100,
        fcm_token: null,
        ...seed.profile,
      }),
    });

    console.log(`  ${seed.role}: ${seed.email}`);
  }

  const provider = created.find((user) => user.role === 'provider');
  await seedProviderData(provider.id);
  console.log('  provider demo data seeded');

  console.log('\nCredentials:');
  for (const user of created) {
    console.log(`  ${user.role}: ${user.email} / ${user.password}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
