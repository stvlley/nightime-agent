// One-off live UAT harness for the Phase 2 agent runtime against the LOCAL stack.
// Seeds a provider (auth user + profile + preferences + FAQ + agent_channel),
// then drives the telegram-webhook + send-draft Edge Functions with simulated
// Telegram updates and asserts the DB state at each step.
//
// Usage: node scripts/live-test-agent.mjs
import { randomBytes } from 'node:crypto';

const API = 'http://127.0.0.1:54321';
const SERVICE = process.env.SERVICE_ROLE_KEY;
const ANON = process.env.ANON_KEY;
const FN = `${API}/functions/v1`;

if (!SERVICE || !ANON) {
  console.error('Set SERVICE_ROLE_KEY and ANON_KEY env vars');
  process.exit(1);
}

const EMAIL = 'agent-uat@nightime.local';
const PASSWORD = 'AgentUat123!';
const WEBHOOK_SECRET = randomBytes(16).toString('hex');
const CHAT_ID = 99001122; // simulated Telegram chat/user id

const svcHeaders = { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, 'Content-Type': 'application/json' };

async function rest(path, init = {}) {
  const res = await fetch(`${API}/rest/v1/${path}`, { ...init, headers: { ...svcHeaders, ...(init.headers || {}) } });
  const ct = res.headers.get('content-type') || '';
  const body = ct.includes('application/json') ? await res.json() : await res.text();
  if (!res.ok) throw new Error(`${init.method || 'GET'} ${path} -> ${res.status} ${JSON.stringify(body)}`);
  return body;
}

async function getOrCreateUser() {
  // Look for existing user first.
  const list = await fetch(`${API}/auth/v1/admin/users`, { headers: svcHeaders }).then((r) => r.json());
  const found = (list.users || []).find((u) => u.email === EMAIL);
  if (found) return found.id;
  const res = await fetch(`${API}/auth/v1/admin/users`, {
    method: 'POST',
    headers: svcHeaders,
    body: JSON.stringify({ email: EMAIL, password: PASSWORD, email_confirm: true }),
  });
  const u = await res.json();
  if (!u.id) throw new Error(`create user failed: ${JSON.stringify(u)}`);
  return u.id;
}

async function signIn() {
  const res = await fetch(`${API}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: ANON, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  const j = await res.json();
  if (!j.access_token) throw new Error(`sign-in failed: ${JSON.stringify(j)}`);
  return j.access_token;
}

function telegramUpdate(text) {
  return {
    update_id: Math.floor(Math.random() * 1e9),
    message: {
      message_id: Math.floor(Math.random() * 1e9),
      from: { id: CHAT_ID, is_bot: false, first_name: 'Uat', username: 'uat_client' },
      chat: { id: CHAT_ID, type: 'private' },
      date: 1748620000,
      text,
    },
  };
}

async function sendInbound(text, secret = WEBHOOK_SECRET) {
  const res = await fetch(`${FN}/telegram-webhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Telegram-Bot-Api-Secret-Token': secret },
    body: JSON.stringify(telegramUpdate(text)),
  });
  return { status: res.status, body: await res.text() };
}

const log = (...a) => console.log(...a);
let pass = 0, fail = 0;
function check(name, cond, extra = '') {
  if (cond) { pass++; log(`  ✅ ${name}`); }
  else { fail++; log(`  ❌ ${name} ${extra}`); }
}

async function main() {
  log('\n=== SEED ===');
  const userId = await getOrCreateUser();
  log('provider user:', userId);

  await rest('profiles?on_conflict=id', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates' },
    body: JSON.stringify({ id: userId, email: EMAIL, business_name: 'Luna Wellness', published: false, age_gate_required: false }),
  });

  await rest('provider_preferences?on_conflict=user_id', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates' },
    body: JSON.stringify({
      user_id: userId,
      business_category: 'wellness',
      agent_tone: 'warm and professional',
      approval_mode: 'auto_eligible',
      moderation_level: 'medium',
      follow_up_enabled: false,
      notifications_enabled: true,
      notification_permission: 'granted',
      message_channels: ['telegram'],
      common_questions: ['hours', 'pricing'],
      response_boundaries: 'No explicit content. Keep it professional.',
      booking_context_enabled: false,
    }),
  });

  // Clean prior FAQ/channel/threads for a deterministic run.
  await rest(`faq?user_id=eq.${userId}`, { method: 'DELETE', headers: { Prefer: 'return=minimal' } });
  await rest('faq', {
    method: 'POST',
    body: JSON.stringify([
      { user_id: userId, trigger: 'what are your hours', reply_text: 'I am available Tuesday to Saturday, 10am to 8pm.', enabled: true },
      { user_id: userId, trigger: 'where are you located', reply_text: 'I am in the downtown studio; exact address is shared on booking.', enabled: true },
    ]),
  });

  await rest('agent_channels?on_conflict=user_id,channel', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates' },
    body: JSON.stringify({
      user_id: userId,
      channel: 'telegram',
      external_account_id: 'uat_bot',
      bot_token: 'TEST:fake-bot-token',
      webhook_secret: WEBHOOK_SECRET,
      active: true,
    }),
  });
  log('seeded profile, preferences, 2 FAQ, agent_channel (secret hidden)');

  // Clean threads/messages/events from prior runs for this user.
  await rest(`messages?user_id=eq.${userId}`, { method: 'DELETE', headers: { Prefer: 'return=minimal' } });
  await rest(`agent_events?user_id=eq.${userId}`, { method: 'DELETE', headers: { Prefer: 'return=minimal' } });
  await rest(`threads?user_id=eq.${userId}`, { method: 'DELETE', headers: { Prefer: 'return=minimal' } });

  log('\n=== TEST 1: bad secret is rejected (no rows written) ===');
  const bad = await sendInbound('what are your hours?', 'wrong-secret');
  check('returns 200 ack (Telegram contract)', bad.status === 200, `got ${bad.status}`);
  const afterBad = await rest(`messages?user_id=eq.${userId}&select=id`);
  check('no message written for bad secret', afterBad.length === 0, `found ${afterBad.length}`);

  log('\n=== TEST 2: FAQ hit → auto-send eligible (approval_mode=auto_eligible) ===');
  const t2 = await sendInbound('Hi! What are your hours?');
  check('returns 200 ack', t2.status === 200, `got ${t2.status}`);
  await new Promise((r) => setTimeout(r, 400));
  const msgs2 = await rest(`messages?user_id=eq.${userId}&order=created_at.asc&select=text,sender,direction,response_source,approval_status,ai_confidence,ai_label`);
  const inbound2 = msgs2.find((m) => m.direction === 'in');
  const draft2 = msgs2.find((m) => m.direction === 'out');
  check('inbound message persisted', !!inbound2 && inbound2.sender === 'client');
  check('draft created from FAQ', !!draft2 && draft2.response_source === 'faq', JSON.stringify(draft2));
  check('FAQ reply text correct', draft2?.text?.includes('Tuesday to Saturday'), draft2?.text);
  // Bot token is fake, so the actual Telegram send fails → status becomes 'failed' after auto_sent attempt.
  check('auto-send was attempted (auto_sent or failed)', ['auto_sent', 'failed'].includes(draft2?.approval_status), draft2?.approval_status);
  const events2 = await rest(`agent_events?user_id=eq.${userId}&order=created_at.asc&select=kind,source,intent,confidence`);
  log('   events:', events2.map((e) => e.kind).join(' → '));
  check('inbound_received logged', events2.some((e) => e.kind === 'inbound_received'));
  check('auto_sent logged', events2.some((e) => e.kind === 'auto_sent'));

  log('\n=== TEST 3: FAQ miss → LLM/fallback → pending approval queue ===');
  const t3 = await sendInbound('Do you take credit cards or only cash for the deluxe package?');
  check('returns 200 ack', t3.status === 200, `got ${t3.status}`);
  await new Promise((r) => setTimeout(r, 600));
  const pending = await rest(`messages?user_id=eq.${userId}&approval_status=eq.pending&direction=eq.out&select=id,text,response_source,approval_status&order=created_at.desc`);
  check('a pending draft exists (awaiting human)', pending.length >= 1, `found ${pending.length}`);
  const pendingDraft = pending[0];
  check('source is llm or fallback (not faq)', ['llm', 'fallback'].includes(pendingDraft?.response_source), pendingDraft?.response_source);
  log('   pending draft source:', pendingDraft?.response_source, '| text:', JSON.stringify(pendingDraft?.text));

  log('\n=== TEST 4: send-draft (JWT) approves the pending draft ===');
  const jwt = await signIn();
  const approveRes = await fetch(`${FN}/send-draft`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: ANON, Authorization: `Bearer ${jwt}` },
    body: JSON.stringify({ messageId: pendingDraft.id }),
  });
  const approveBody = await approveRes.text();
  log('   send-draft status:', approveRes.status, '| body:', approveBody);
  await new Promise((r) => setTimeout(r, 300));
  const afterApprove = await rest(`messages?id=eq.${pendingDraft.id}&select=approval_status,delivered_at`);
  // Telegram send will fail (fake token), so expect 'failed' OR (if logic marks sent before send) 'sent'.
  check('draft left pending state after approval attempt', afterApprove[0]?.approval_status !== 'pending', JSON.stringify(afterApprove[0]));
  log('   final draft status:', afterApprove[0]?.approval_status);

  log('\n=== TEST 5: moderation flag forces human review even on FAQ-ish msg ===');
  const t5 = await sendInbound('what are your hours? also are you under 18');
  await new Promise((r) => setTimeout(r, 400));
  const flagged = await rest(`messages?user_id=eq.${userId}&direction=eq.out&order=created_at.desc&select=approval_status,response_source&limit=1`);
  check('flagged message did NOT auto-send', flagged[0]?.approval_status === 'pending', JSON.stringify(flagged[0]));

  log(`\n=== RESULT: ${pass} passed, ${fail} failed ===`);
  process.exit(fail > 0 ? 1 : 0);
}

main().catch((e) => { console.error('FATAL', e); process.exit(2); });
