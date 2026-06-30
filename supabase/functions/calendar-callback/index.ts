// Google Calendar OAuth redirect target (Phase 2).
//
// Google sends the provider's browser here after they grant calendar access.
// We verify the signed `state` (proves which provider started the flow),
// exchange the `code` for access + refresh tokens, and upsert a 'google'
// calendar_connections row. Returns a small HTML page to close the window.
//
// Public (verify_jwt = false) — the browser arrives straight from Google with
// no Supabase JWT; authenticity comes from the signed state.

import { createClient } from 'npm:@supabase/supabase-js@2.55.0';
import { GOOGLE_TOKEN_ENDPOINT, expiryIsoFromExpiresIn } from '../_shared/googleCalendar.ts';
import { verifyState } from '../_shared/oauthState.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_OAUTH_CLIENT_ID') ?? '';
const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_OAUTH_CLIENT_SECRET') ?? '';

function page(title: string, message: string, ok: boolean): Response {
  const html = `<!doctype html><html><head><meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${title}</title>
<style>body{font:16px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;
background:#0d0a26;color:#f3f0ff;display:grid;place-items:center;height:100vh;margin:0;text-align:center}
.card{max-width:360px;padding:28px}.badge{font-size:40px}h1{font-size:20px;margin:14px 0 6px}
p{color:#aaa3d7;margin:0}</style></head>
<body><div class="card"><div class="badge">${ok ? '✅' : '⚠️'}</div>
<h1>${title}</h1><p>${message}</p></div></body></html>`;
  return new Response(html, { status: ok ? 200 : 400, headers: { 'content-type': 'text/html; charset=utf-8' } });
}

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const error = url.searchParams.get('error');
  if (error) return page('Calendar not connected', `Google reported: ${error}`, false);

  const code = url.searchParams.get('code') ?? '';
  const state = url.searchParams.get('state') ?? '';
  if (!code || !state) return page('Calendar not connected', 'Missing authorization code.', false);

  const userId = await verifyState(SERVICE_ROLE, state);
  if (!userId) return page('Calendar not connected', 'This sign-in link expired. Please try again.', false);

  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    return page('Calendar not connected', 'Google OAuth is not configured.', false);
  }

  // Exchange the authorization code for tokens.
  const redirectUri = `${SUPABASE_URL}/functions/v1/calendar-callback`;
  const tokenRes = await fetch(GOOGLE_TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  });
  const tokens = await tokenRes.json().catch(() => ({}));
  if (!tokenRes.ok || !tokens.access_token) {
    return page('Calendar not connected', 'Could not complete the Google handshake.', false);
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });
  const { error: upsertError } = await admin.from('calendar_connections').upsert(
    {
      user_id: userId,
      provider: 'google',
      external_calendar_id: 'primary',
      status: 'connected',
      access_token: tokens.access_token,
      // Google only returns a refresh_token on the first consent; keep the
      // existing one if this is a re-consent that omitted it.
      ...(tokens.refresh_token ? { refresh_token: tokens.refresh_token } : {}),
      metadata: {
        connected_at: new Date().toISOString(),
        expiry: expiryIsoFromExpiresIn(Number(tokens.expires_in), Date.now()),
        scope: tokens.scope ?? null,
      },
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' },
  );
  if (upsertError) return page('Calendar not connected', 'Could not save the connection.', false);

  return page('Calendar connected', 'You can close this window and return to the app.', true);
});
