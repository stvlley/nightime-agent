// Issue a dedicated business SMS number (Phase 2).
//
// Called by the provider app when they want an SMS channel but don't already
// have their own number. Idempotent: if an SMS channel with a number already
// exists it is returned unchanged. Otherwise we provision one (simulated today,
// carrier API later — see smsNumber.ts) and create/activate the provider's SMS
// channel so inbound SMS routes through the same unified-inbox agent loop.
//
// JWT-verified (provider session); configure with verify_jwt = true.

import { createClient } from 'npm:@supabase/supabase-js@2.55.0';
import { json, corsHeaders } from '../_shared/http.ts';
import { isE164, provisionSmsNumber } from '../_shared/smsNumber.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

function randomSecret(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  const authHeader = req.headers.get('Authorization') ?? '';
  if (!authHeader) return json({ error: 'unauthorized' }, 401);

  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });
  const { data: userData } = await userClient.auth.getUser();
  const user = userData?.user;
  if (!user) return json({ error: 'unauthorized' }, 401);

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });

  // Idempotent: if they already have an SMS number, return it.
  const { data: existing } = await admin
    .from('agent_channels')
    .select('external_account_id, active')
    .eq('user_id', user.id)
    .eq('channel', 'sms')
    .maybeSingle();
  if (existing?.external_account_id && isE164(existing.external_account_id as string)) {
    return json({ ok: true, number: existing.external_account_id, alreadyHad: true, active: existing.active });
  }

  // Provision a fresh number, avoiding collisions with already-issued numbers.
  let provisioned;
  try {
    provisioned = await provisionSmsNumber(async (candidate) => {
      const { data } = await admin
        .from('agent_channels')
        .select('id')
        .eq('channel', 'sms')
        .eq('external_account_id', candidate)
        .maybeSingle();
      return !!data;
    });
  } catch (e) {
    return json({ error: 'provision_failed', detail: String(e) }, 502);
  }

  const { error } = await admin
    .from('agent_channels')
    .upsert(
      {
        user_id: user.id,
        channel: 'sms',
        external_account_id: provisioned.number,
        webhook_secret: randomSecret(),
        active: true,
        metadata: { provider: provisioned.provider, issued_at: new Date().toISOString() },
      },
      { onConflict: 'user_id,channel' },
    );
  if (error) return json({ error: 'persist_failed', detail: error.message }, 500);

  await admin.from('agent_events').insert({
    user_id: user.id,
    kind: 'sms_number_issued',
    source: 'sms',
    channel: 'sms',
    detail: { number: provisioned.number, provider: provisioned.provider },
  });

  return json({ ok: true, number: provisioned.number, alreadyHad: false, active: true });
});
