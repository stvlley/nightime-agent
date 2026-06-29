// Connect a calendar (Phase 2).
//
// Called by the provider app to connect a calendar so confirmed bookings sync to
// it. Today it establishes a 'simulated' connection (no external OAuth) so the
// end-to-end booking→calendar flow is testable; the real Google OAuth callback
// would upsert a 'google' connection with tokens here. Idempotent.
//
// JWT-verified (provider session); configure with verify_jwt = true.

import { createClient } from 'npm:@supabase/supabase-js@2.55.0';
import { json, corsHeaders } from '../_shared/http.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

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

  const { data, error } = await admin
    .from('calendar_connections')
    .upsert(
      {
        user_id: user.id,
        provider: 'simulated',
        external_calendar_id: 'primary',
        status: 'connected',
        metadata: { connected_at: new Date().toISOString() },
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' },
    )
    .select('provider, status, external_calendar_id')
    .single();
  if (error) return json({ error: 'persist_failed', detail: error.message }, 500);

  return json({ ok: true, connection: data });
});
