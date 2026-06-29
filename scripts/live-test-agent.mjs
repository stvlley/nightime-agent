// One-off live UAT harness for the Phase 2 agent runtime against the LOCAL stack.
// Seeds a provider (auth user + profile + preferences + FAQ + agent_channel),
// then drives the telegram-webhook + send-draft Edge Functions with simulated
// Telegram updates and asserts the DB state at each step.
//
// Usage:
//   eval "$(supabase status -o env)"
//   node scripts/live-test-agent.mjs
import { randomBytes } from 'node:crypto';

const API = process.env.API_URL || process.env.SUPABASE_URL || 'http://127.0.0.1:54321';
const SERVICE = process.env.SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANON = process.env.ANON_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const FN = `${API}/functions/v1`;
const openRouterConfigured = !!process.env.OPENROUTER_API_KEY && process.env.AGENT_LLM_DISABLED !== 'true';

if (!SERVICE || !ANON) {
  console.error('Set local Supabase env first: eval "$(supabase status -o env)"');
  process.exit(1);
}

const EMAIL = 'agent-uat@nightime.local';
const PASSWORD = 'AgentUat123!';
const WEBHOOK_SECRET = randomBytes(16).toString('hex');
const CHAT_ID = 99001122; // simulated Telegram chat/user id
const SLUG = 'luna-uat'; // public web-chat slug
const WEB_SESSION = `uat-${randomBytes(8).toString('hex')}`; // visitor session id

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

async function latestLlmEvent(userId) {
  const rows = await rest(
    `agent_events?user_id=eq.${userId}&kind=eq.llm_called&order=created_at.desc&select=model,input_tokens,output_tokens,estimated_cost_cents,detail&limit=1`
  );
  return rows[0] || null;
}

async function main() {
  log('\n=== SEED ===');
  const userId = await getOrCreateUser();
  log('provider user:', userId);

  await rest('profiles?on_conflict=id', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates' },
    body: JSON.stringify({ id: userId, email: EMAIL, business_name: 'Luna Wellness', slug: SLUG, published: false, age_gate_required: false }),
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
      llm_enabled: true,
      agent_mode: 'keep_up',
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

  // Availability (all week, wide window so there is always a future slot) + one
  // service, so the deterministic booking flow has concrete times to offer.
  await rest(`availability?provider_id=eq.${userId}`, { method: 'DELETE', headers: { Prefer: 'return=minimal' } });
  await rest('availability', {
    method: 'POST',
    body: JSON.stringify(
      [0, 1, 2, 3, 4, 5, 6].map((d) => ({
        provider_id: userId,
        day_of_week: d,
        start_time: '00:00',
        end_time: '23:30',
        timezone: 'UTC',
        active: true,
      })),
    ),
  });
  await rest(`services?provider_id=eq.${userId}`, { method: 'DELETE', headers: { Prefer: 'return=minimal' } });
  await rest('services', {
    method: 'POST',
    body: JSON.stringify({ provider_id: userId, name: 'Standard session', duration_minutes: 60, price_cents: 8000, currency: 'USD', active: true }),
  });

  // Connect a (simulated) calendar so confirmed bookings sync to it.
  await rest('calendar_connections?on_conflict=user_id', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates' },
    body: JSON.stringify({ user_id: userId, provider: 'simulated', external_calendar_id: 'primary', status: 'connected' }),
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
  await rest('agent_channels?on_conflict=user_id,channel', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates' },
    body: JSON.stringify({
      user_id: userId,
      channel: 'webchat',
      external_account_id: SLUG,
      webhook_secret: randomBytes(12).toString('hex'), // unused for webchat
      active: true,
    }),
  });
  log('seeded profile, preferences, 2 FAQ, telegram + webchat channels');

  // Clean threads/messages/events/bookings from prior runs for this user.
  // Bookings reference threads, so delete them before threads.
  await rest(`messages?user_id=eq.${userId}`, { method: 'DELETE', headers: { Prefer: 'return=minimal' } });
  await rest(`agent_events?user_id=eq.${userId}`, { method: 'DELETE', headers: { Prefer: 'return=minimal' } });
  await rest(`bookings?user_id=eq.${userId}`, { method: 'DELETE', headers: { Prefer: 'return=minimal' } });
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
  await new Promise((r) => setTimeout(r, 1200));
  const pending = await rest(`messages?user_id=eq.${userId}&approval_status=eq.pending&direction=eq.out&select=id,text,response_source,approval_status&order=created_at.desc`);
  check('a pending draft exists (awaiting human)', pending.length >= 1, `found ${pending.length}`);
  const pendingDraft = pending[0];
  const llmEvent = await latestLlmEvent(userId);
  const llmDetail = llmEvent?.detail ? JSON.stringify(llmEvent.detail) : '';
  check('llm_called event logged', !!llmEvent, llmDetail);
  if (openRouterConfigured) {
    check('source is llm when OpenRouter is configured', pendingDraft?.response_source === 'llm', `${pendingDraft?.response_source || 'none'} ${llmDetail}`);
    check('llm event has model', !!llmEvent?.model, JSON.stringify(llmEvent));
  } else {
    check('source is llm or fallback (OpenRouter not enabled in this process)', ['llm', 'fallback'].includes(pendingDraft?.response_source), pendingDraft?.response_source);
    if (pendingDraft?.response_source === 'fallback') log('   fallback detail:', llmDetail || 'no detail');
  }
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

  // ---- Web-chat channel (zero-setup) ------------------------------------
  const webPost = (fn, payload) =>
    fetch(`${FN}/${fn}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      .then(async (r) => ({ status: r.status, body: await r.json().catch(() => ({})) }));

  log('\n=== TEST 6: web chat FAQ hit → answered immediately (no human) ===');
  const w1 = await webPost('webchat-inbound', { slug: SLUG, sessionId: WEB_SESSION, text: 'hello, what are your hours?' });
  check('inbound returns 200', w1.status === 200, JSON.stringify(w1.body));
  check('status=answered', w1.body.status === 'answered', JSON.stringify(w1.body));
  check('reply is the FAQ text', (w1.body.reply || '').includes('Tuesday to Saturday'), w1.body.reply);
  check('does not mark public receipt as AI-generated', w1.body.aiGenerated === false);
  const wpoll1 = await webPost('webchat-poll', { slug: SLUG, sessionId: WEB_SESSION });
  check('poll returns visitor + agent message', wpoll1.body.messages?.length >= 2, JSON.stringify(wpoll1.body.messages?.map((m) => m.role)));

  log('\n=== TEST 7: web chat FAQ miss → receipt only, draft held (not leaked) ===');
  const w2 = await webPost('webchat-inbound', { slug: SLUG, sessionId: WEB_SESSION, text: 'can you do a custom 3-hour package next month?' });
  check('status=received (not answered)', w2.body.status === 'received', JSON.stringify(w2.body));
  check('reply is a neutral receipt, NOT a draft', w2.body.reply?.includes('received') && w2.body.aiGenerated === false, w2.body.reply);
  const heldPoll = await webPost('webchat-poll', { slug: SLUG, sessionId: WEB_SESSION });
  const agentMsgs = (heldPoll.body.messages || []).filter((m) => m.role === 'agent');
  check('held draft is NOT visible via poll', !agentMsgs.some((m) => m.text.includes('custom') || m.text.includes('package')), JSON.stringify(agentMsgs.map((m) => m.text)));
  // The pending draft exists server-side, awaiting approval.
  const webThread = await rest(`threads?user_id=eq.${userId}&channel=eq.webchat&external_thread_id=eq.${WEB_SESSION}&select=id`);
  const webPending = await rest(`messages?thread_id=eq.${webThread[0].id}&approval_status=eq.pending&direction=eq.out&select=id,text&order=created_at.desc`);
  check('a pending web draft exists in DB', webPending.length >= 1, `found ${webPending.length}`);

  log('\n=== TEST 8: provider approves the web draft → visitor can now see it ===');
  const webJwt = await signIn();
  const webApprove = await fetch(`${FN}/send-draft`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: ANON, Authorization: `Bearer ${webJwt}` },
    body: JSON.stringify({ messageId: webPending[0].id }),
  });
  const webApproveBody = await webApprove.json().catch(() => ({}));
  check('send-draft returns 200 (webchat: no external send)', webApprove.status === 200, JSON.stringify(webApproveBody));
  await new Promise((r) => setTimeout(r, 200));
  const afterPoll = await webPost('webchat-poll', { slug: SLUG, sessionId: WEB_SESSION });
  const nowVisible = (afterPoll.body.messages || []).some((m) => m.role === 'agent' && m.id === webPending[0].id);
  check('approved draft now visible to visitor', nowVisible, JSON.stringify(afterPoll.body.messages?.map((m) => m.role)));

  log('\n=== TEST 9: unknown slug + disabled channel are rejected ===');
  const badSlug = await webPost('webchat-inbound', { slug: 'no-such-provider', sessionId: 'x', text: 'hi' });
  check('unknown provider → 404', badSlug.status === 404, JSON.stringify(badSlug.body));
  await rest(`agent_channels?user_id=eq.${userId}&channel=eq.webchat`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ active: false }) });
  const disabled = await webPost('webchat-inbound', { slug: SLUG, sessionId: 'y', text: 'hi' });
  check('disabled channel → 403', disabled.status === 403, JSON.stringify(disabled.body));
  await rest(`agent_channels?user_id=eq.${userId}&channel=eq.webchat`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ active: true }) });

  // ---- Appointment booking flow (web chat) -----------------------------------
  const BOOK_SESSION = `uat-book-${randomBytes(8).toString('hex')}`;

  log('\n=== TEST 10: booking intent → agent qualifies (collects the customer name) ===');
  const b1 = await webPost('webchat-inbound', { slug: SLUG, sessionId: BOOK_SESSION, text: 'Hi, can I book an appointment?' });
  check('qualify returns 200', b1.status === 200, JSON.stringify(b1.body));
  // One seeded service → no service question; the agent asks for a name.
  check('agent asks for the customer name', b1.body.status === 'answered' && /name/i.test(b1.body.reply || ''), JSON.stringify(b1.body));
  let bookThread = await rest(`threads?user_id=eq.${userId}&channel=eq.webchat&external_thread_id=eq.${BOOK_SESSION}&select=id,state,booking_context`);
  check('thread moved to qualifying', bookThread[0]?.state === 'qualifying', JSON.stringify(bookThread[0]?.state));

  log('\n=== TEST 11: customer gives name → agent offers concrete times ===');
  const b2 = await webPost('webchat-inbound', { slug: SLUG, sessionId: BOOK_SESSION, text: 'my name is Uma' });
  check('offer returns 200', b2.status === 200, JSON.stringify(b2.body));
  check('agent offers times', b2.body.status === 'answered' && /opening|works best/i.test(b2.body.reply || ''), JSON.stringify(b2.body));
  bookThread = await rest(`threads?user_id=eq.${userId}&channel=eq.webchat&external_thread_id=eq.${BOOK_SESSION}&select=id,state,booking_context`);
  check('thread moved to offering', bookThread[0]?.state === 'offering', JSON.stringify(bookThread[0]?.state));
  check('captured the customer name on the lead', bookThread[0]?.booking_context?.lead?.name === 'Uma', JSON.stringify(bookThread[0]?.booking_context?.lead));
  const offered = bookThread[0]?.booking_context?.offered || [];
  check('offered slots stored on thread', offered.length >= 1, `offered ${offered.length}`);
  const offerMsg = await rest(`messages?thread_id=eq.${bookThread[0].id}&direction=eq.out&order=created_at.desc&select=response_source&limit=1`);
  check('offer draft tagged response_source=booking', offerMsg[0]?.response_source === 'booking', offerMsg[0]?.response_source);

  log('\n=== TEST 12: client picks a time → tentative booking created + confirmed ===');
  const b3 = await webPost('webchat-inbound', { slug: SLUG, sessionId: BOOK_SESSION, text: 'the first one please' });
  check('confirm returns 200', b3.status === 200, JSON.stringify(b3.body));
  check('agent confirms the booking', b3.body.status === 'answered' && /all set|see you/i.test(b3.body.reply || ''), JSON.stringify(b3.body));
  await new Promise((r) => setTimeout(r, 200));
  const bookings = await rest(`bookings?user_id=eq.${userId}&thread_id=eq.${bookThread[0].id}&select=id,start,status,source,client_name,calendar_event_id&order=created_at.desc`);
  check('a booking row was created', bookings.length >= 1, `found ${bookings.length}`);
  check('booking is tentative + ai-sourced', bookings[0]?.status === 'tentative' && bookings[0]?.source === 'ai', JSON.stringify(bookings[0]));
  check('booking carries the qualified customer name', bookings[0]?.client_name === 'Uma', bookings[0]?.client_name);
  check(
    'booking start matches the first offered slot',
    !!bookings[0]?.start && !!offered[0]?.startIso && new Date(bookings[0].start).toISOString() === new Date(offered[0].startIso).toISOString(),
    `${bookings[0]?.start} vs ${offered[0]?.startIso}`,
  );
  const afterBook = await rest(`threads?id=eq.${bookThread[0].id}&select=state`);
  check('thread state advanced to tentative', afterBook[0]?.state === 'tentative', afterBook[0]?.state);

  log('\n=== TEST 13: booking synced to the connected calendar ===');
  check('booking stamped with a calendar event id', !!bookings[0]?.calendar_event_id, bookings[0]?.calendar_event_id);
  const calEvents = await rest(`calendar_events?user_id=eq.${userId}&select=external_event_id,booking_id,title,start`);
  const calEvent = calEvents.find((e) => e.booking_id === bookings[0]?.id);
  check('appointment appears on the connected calendar', !!calEvent, JSON.stringify(calEvents));
  check('calendar event id matches the booking', calEvent?.external_event_id === bookings[0]?.calendar_event_id, `${calEvent?.external_event_id} vs ${bookings[0]?.calendar_event_id}`);

  log(`\n=== RESULT: ${pass} passed, ${fail} failed ===`);
  process.exit(fail > 0 ? 1 : 0);
}

main().catch((e) => { console.error('FATAL', e); process.exit(2); });
