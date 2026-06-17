# Google & Facebook sign-in (Supabase OAuth, via the CLI)

Nitime AI uses **Supabase Auth** for Google/Facebook login — free on every tier,
and it keeps the existing `auth.uid()` RLS model unchanged (no Clerk, no
third-party-auth migration). The client code is already wired:

- `hooks/useAuth.tsx` → `signInWithOAuth('google' | 'facebook')`
- `lib/supabase.ts` → `flowType: 'pkce'`, `detectSessionInUrl` on web
- The landing auth sheet shows **Continue with Google / Facebook** whenever
  Supabase is configured.

The providers are managed **as code** in `supabase/config.toml` and pushed with
`supabase config push` — no dashboard clicking. The blocks are already in place:

```toml
[auth.external.google]
enabled = true
client_id = "env(SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID)"
secret    = "env(SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET)"
skip_nonce_check = true

[auth.external.facebook]
enabled = true
client_id = "env(SUPABASE_AUTH_EXTERNAL_FACEBOOK_CLIENT_ID)"
secret    = "env(SUPABASE_AUTH_EXTERNAL_FACEBOOK_SECRET)"
```

`additional_redirect_urls` already allow-lists the web origins and the native
`nitime://auth-callback` scheme.

You still need to create the OAuth apps (the CLI can't mint those) and supply the
four credentials as env vars.

## 1. Create the OAuth apps

**Provider callback URL** (the one redirect URI both apps must allow):

```
https://hwcpztsltgpjzclrmyez.supabase.co/auth/v1/callback
```

(For local `supabase start`, the callback is `http://127.0.0.1:54321/auth/v1/callback`.)

**Google** — Google Cloud Console → APIs & Services → Credentials → *Create OAuth
client ID* → **Web application**. Add the callback URL above as an Authorized
redirect URI. Copy the Client ID + secret.
(This is a *separate* client from the Gmail/Google-Voice `GOOGLE_OAUTH_*` one.)

**Facebook** — developers.facebook.com → Create App (**Consumer**) → add
**Facebook Login** → Settings → Valid OAuth Redirect URIs → the callback URL
above. Copy the App ID + secret. Switch the app to **Live** before production.

## 2. Export the credentials

```bash
export SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID="…apps.googleusercontent.com"
export SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET="…"
export SUPABASE_AUTH_EXTERNAL_FACEBOOK_CLIENT_ID="…"
export SUPABASE_AUTH_EXTERNAL_FACEBOOK_SECRET="…"
```

Slots are listed in `.env.example`. `supabase config push` reads them from the
environment via the `env(...)` references — keep the real values out of git.
(Both providers are `enabled = true`; if you only want to launch one first, flip
the other's `enabled` to `false` so you are not pushing an empty secret.)

## 3. Push to the hosted project

```bash
supabase login                                   # or: export SUPABASE_ACCESS_TOKEN=…
supabase link --project-ref hwcpztsltgpjzclrmyez
supabase config push                             # add --project-ref to skip linking
```

> ⚠️ `config push` pushes the **entire** `[auth]` section of `config.toml` to the
> hosted project (site URL, redirect URLs, email/SMTP, rate limits, MFA, …) and
> overwrites whatever is set in the dashboard. Review `git diff supabase/config.toml`
> first. `site_url` is set to the production URL for exactly this reason.

For **local** testing instead: `supabase start` (Docker) applies the same
`config.toml` to the local stack — providers enabled with the exported creds.

## 4. Verify

- Web: open the landing page → **Continue with Google** → consent → you land in
  `/(tabs)/dashboard` with a session.
- A new social user automatically gets a minimal `profiles` row (name from the
  Google/Facebook metadata); the provider can refine it later from Profile,
  Channels, and Agent Settings.
- Native (when built): an in-app browser opens, returns to
  `nitime://auth-callback`, and the code is exchanged for a session.

## Notes

- Supabase does **not** ship shared dev OAuth credentials — the apps in step 1
  must exist for the buttons to work. Free, and required for production anyway.
- Keep client secrets in env / the Supabase project only. Never `EXPO_PUBLIC_*`.
