# Google OAuth Setup

Nitime uses Supabase Auth for Google sign-in. The Expo app starts a Supabase
OAuth flow with PKCE, opens Google in `expo-web-browser`, and exchanges the
returned code explicitly. `detectSessionInUrl` remains disabled in
`lib/supabase.ts`.

## Current State

- Google OAuth is enabled in `supabase/config.toml`.
- The redirect allow-list includes `https://nitime.app` and
  `nightime-agent://auth/callback`.
- Provider login and provider signup show **Continue with Google** as the
  primary action.
- Email/password remains available under **or use email** for existing accounts,
  local development, and demo fallback behavior.
- Client early-access capture is unchanged and does not use OAuth.

## Credential Rotation

If you rotate the Supabase Google OAuth client, update these env vars before
running `supabase config push`:

```text
SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID
SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET
```

## Google Cloud

The Google Cloud Console client used for Supabase Auth must keep this callback
URI authorized:

```text
https://<your-project-ref>.supabase.co/auth/v1/callback
```

For local `supabase start`, use:

```text
http://127.0.0.1:54321/auth/v1/callback
```

This Google OAuth client is separate from the Gmail/Google Voice credentials
used by channel setup scripts.

## Validation notes

Google OAuth cannot be fully validated with dummy Supabase env vars. Manual
validation needs:

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- Google provider enabled in Supabase with valid Google credentials
- matching redirect URLs in Supabase Auth URL configuration

After that, test web and native:

- Web: open the landing page, click **Continue with Google**, finish consent,
  and confirm the app receives a Supabase session.
- Native: run through Expo, confirm the browser opens, the
  `nightime-agent://auth/callback` redirect returns to the app, and the session
  persists after reload.
- New users should land in onboarding with a profile row created. Existing users
  should route through the normal onboarding/pricing/dashboard decision.
