// Prompt-quality eval harness for the LLM draft path (LOCAL stack).
//
// Drives a curated set of FAQ-miss / open-ended visitor messages through the
// webchat-inbound Edge Function so the *real* system prompt and per-mode model
// selection are exercised, then reads the generated draft back from `messages`
// and prints it for human review alongside lightweight automated checks.
//
// Why webchat-inbound: it routes through the same runAgentTurn → generateReply
// path as Telegram but needs no external credentials, so we get faithful LLM
// output with zero transport setup.
//
// Usage (real OpenRouter required — drafts are 'fallback' without a key):
//   eval "$(supabase status -o env)"
//   OPENROUTER_API_KEY=... AGENT_MODEL=openrouter/free node scripts/eval-agent-replies.mjs
// or simply: npm run agent:eval:local
import { randomBytes } from 'node:crypto';

const API = process.env.API_URL || process.env.SUPABASE_URL || 'http://127.0.0.1:54321';
const SERVICE = process.env.SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const FN = `${API}/functions/v1`;

if (!SERVICE) {
  console.error('Set local Supabase env first: eval "$(supabase status -o env)"');
  process.exit(1);
}

const EMAIL = 'agent-eval@nightime.local';
const SLUG = 'luna-eval';
const svcHeaders = { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, 'Content-Type': 'application/json' };

// FAQ-miss / open-ended prompts the model should answer warmly WITHOUT promising
// a specific time, price, or booking. Each runs in its own web-chat session.
const PROMPTS = [
  'tell me more about how this works',
  'what should I expect for a first visit?',
  'do you have parking nearby?',
  'I have never done this before, any tips?',
  'what makes your service different?',
];

// Source of truth: llmReplyPassesAutoSendSafety in
// supabase/functions/_shared/agentLogic.ts. Re-implemented here because a .mjs
// script cannot import the .ts module. Keep in sync if that regex changes.
const SENSITIVE = ['under 18', 'underage', 'minor', 'safety', 'unsafe', 'illegal', 'cash only', 'discreet only', 'no protection', 'bareback'];
const COMMITMENT = ['book it', 'book me', 'confirm', 'confirmed', 'reserve', 'hold it', 'that works for me', 'go ahead', 'cancel', 'cancellation', 'refund', 'chargeback', 'deposit', 'send payment', 'send the address'];
function overPromises(text) {
  const t = (text || '').toLowerCase();
  if ([...SENSITIVE, ...COMMITMENT].some((p) => t.includes(p))) return true;
  return /\b(booked|confirmed|cancelled|refunded|available at|open at|costs?\s+\$?\d+)/i.test(t);
}
function sentenceCount(text) {
  return (text.match(/[.!?]+(\s|$)/g) || []).length || 1;
}

async function rest(path, init = {}) {
  const res = await fetch(`${API}/rest/v1/${path}`, { ...init, headers: { ...svcHeaders, ...(init.headers || {}) } });
  const ct = res.headers.get('content-type') || '';
  const body = ct.includes('application/json') ? await res.json() : await res.text();
  if (!res.ok) throw new Error(`${init.method || 'GET'} ${path} -> ${res.status} ${JSON.stringify(body)}`);
  return body;
}

async function getOrCreateUser() {
  const list = await fetch(`${API}/auth/v1/admin/users`, { headers: svcHeaders }).then((r) => r.json());
  const found = (list.users || []).find((u) => u.email === EMAIL);
  if (found) return found.id;
  const u = await fetch(`${API}/auth/v1/admin/users`, {
    method: 'POST',
    headers: svcHeaders,
    body: JSON.stringify({ email: EMAIL, password: 'AgentEval123!', email_confirm: true }),
  }).then((r) => r.json());
  if (!u.id) throw new Error(`create user failed: ${JSON.stringify(u)}`);
  return u.id;
}

async function seed() {
  const userId = await getOrCreateUser();

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
      message_channels: ['webchat'],
      response_boundaries: 'No explicit content. Never promise a specific time, price, or booking.',
      llm_enabled: true,
      agent_mode: 'talk_for_me', // route open-ended misses to the model
    }),
  });

  await rest(`faq?user_id=eq.${userId}`, { method: 'DELETE', headers: { Prefer: 'return=minimal' } });
  await rest('faq', {
    method: 'POST',
    body: JSON.stringify([
      { user_id: userId, trigger: 'what are your hours', reply_text: 'I am available Tuesday to Saturday, 10am to 8pm.', enabled: true },
      { user_id: userId, trigger: 'where are you located', reply_text: 'Downtown studio; exact address shared on booking.', enabled: true },
    ]),
  });

  await rest('agent_channels?on_conflict=user_id,channel', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates' },
    body: JSON.stringify({ user_id: userId, channel: 'webchat', external_account_id: SLUG, webhook_secret: randomBytes(12).toString('hex'), active: true }),
  });

  // Clean prior threads/messages/events for a deterministic run.
  await rest(`messages?user_id=eq.${userId}`, { method: 'DELETE', headers: { Prefer: 'return=minimal' } });
  await rest(`agent_events?user_id=eq.${userId}`, { method: 'DELETE', headers: { Prefer: 'return=minimal' } });
  await rest(`threads?user_id=eq.${userId}`, { method: 'DELETE', headers: { Prefer: 'return=minimal' } });
  return userId;
}

async function draftFor(userId, sessionId, text) {
  await fetch(`${FN}/webchat-inbound`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ slug: SLUG, sessionId, text }),
  });
  await new Promise((r) => setTimeout(r, 1500)); // allow the LLM round-trip
  const thread = await rest(`threads?user_id=eq.${userId}&channel=eq.webchat&external_thread_id=eq.${sessionId}&select=id`);
  if (!thread.length) return null;
  const out = await rest(`messages?thread_id=eq.${thread[0].id}&direction=eq.out&order=created_at.desc&select=text,response_source,ai_confidence&limit=1`);
  return out[0] || null;
}

async function main() {
  console.log('\n=== SEED ===');
  const userId = await seed();
  console.log('provider:', userId, '| mode: talk_for_me | slug:', SLUG);

  console.log('\n=== DRAFTS ===');
  const results = [];
  for (const prompt of PROMPTS) {
    const sessionId = `eval-${randomBytes(8).toString('hex')}`;
    const draft = await draftFor(userId, sessionId, prompt);
    results.push({ prompt, draft });
  }

  const llmDrafts = results.filter((r) => r.draft?.response_source === 'llm');
  if (llmDrafts.length === 0) {
    console.error('\n❌ No LLM drafts were produced — every reply was fallback/FAQ.');
    console.error('   The served functions need OPENROUTER_API_KEY set and AGENT_LLM_DISABLED=false.');
    console.error('   Set them in .env, then: npm run agent:functions:local (serves with --env-file .env).');
    process.exit(1);
  }

  let pass = 0, fail = 0;
  for (const { prompt, draft } of results) {
    console.log(`\n— "${prompt}"`);
    if (!draft) { console.log('   (no draft row found)'); fail++; continue; }
    console.log(`   source: ${draft.response_source} | reply: ${JSON.stringify(draft.text)}`);
    if (draft.response_source !== 'llm') { console.log('   ⚠️  not an LLM draft — skipped from quality checks'); continue; }

    const reply = draft.text || '';
    const checks = [
      ['non-empty', reply.trim().length > 0],
      ['<= 3 sentences', sentenceCount(reply) <= 3],
      ['no over-promising', !overPromises(reply)],
    ];
    for (const [name, ok] of checks) {
      if (ok) { pass++; console.log(`   ✅ ${name}`); }
      else { fail++; console.log(`   ❌ ${name}`); }
    }
  }

  console.log(`\n=== RESULT: ${pass} passed, ${fail} failed (${llmDrafts.length}/${PROMPTS.length} reached the LLM) ===`);
  process.exit(fail > 0 ? 1 : 0);
}

main().catch((e) => { console.error('FATAL', e); process.exit(2); });
