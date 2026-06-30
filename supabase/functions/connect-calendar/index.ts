// Connect a calendar (Phase 2).
//
// Two modes, chosen by the request body's `provider`:
//   - 'google'    → returns a Google consent URL the app opens; the actual
//                   connection is created by calendar-callback after consent.
//   - 'simulated' → (default) establishes a local 'simulated' connection so the
//                   booking→calendar flow is testable without external OAuth.
//
// JWT-verified (provider session); configure with verify_jwt = true.

import { createClient } from 'npm:@supabase/supabase-js@2.55.0';
import { json, corsHeaders } from '../_shared/http.ts';
import { buildGoogleAuthUrl } from '../_shared/googleCalendar.ts';
import { signState } from '../_shared/oauthState.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_OAUTH_CLIENT_ID') ?? '';

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

  const body = await req.json().catch(() => ({}));
  const provider = body?.provider === 'google' ? 'google' : 'simulated';

  // --- Google: hand back a consent URL; calendar-callback finishes the connect.
  if (provider === 'google') {
    if (!GOOGLE_CLIENT_ID) return json({ error: 'google_oauth_not_configured' }, 500);
    const redirectUri = `${SUPABASE_URL}/functions/v1/calendar-callback`;
    const state = await signState(SERVICE_ROLE, user.id);
    const authUrl = buildGoogleAuthUrl({ clientId: GOOGLE_CLIENT_ID, redirectUri, state });
    return json({ ok: true, provider: 'google', authUrl });
  }

  // --- Simulated: connect immediately (testable end-to-end, no OAuth).
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });
  const { data, error } = await admin
    .from('calendar_connections')
    .upsert(
      {
        user_id: user.id,
        provider: 'simulated',
        external_calendar_id: 'primary',
        status: 'connected',
        access_token: null,
        refresh_token: null,
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
