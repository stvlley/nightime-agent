# Vercel Deployment

## Vercel

This app deploys as a static Expo web export. Vercel uses `vercel.json`:

- Install: `npm install`
- Build: `npm run build:web`
- Output directory: `dist`

The rewrite rule sends app routes back to `index.html` while leaving Expo assets and public files untouched.

The app boots with no environment variables. In that state, signed-out `/` shows
the public marketing landing page, auth uses local demo storage, client early
access intent is local-only, and data is not persistent across devices.

To verify a production-like static export locally:

```bash
npm run build:web
npm run start
```

The local static server serves `dist` on `http://localhost:3000` by default.

Current production deployment:

- Vercel project: `nightime-agent`
- Current working production alias: `https://nightime-agent.vercel.app`
- `nitime.app` and `www.nitime.app` are attached to the Vercel project but
  still require the Cloudflare DNS owner steps in
  `store/user-only-launch-checklist.md`.
- Legal/support routes are deployed:
  - `/privacy`
  - `/terms`
  - `/support`

## Native Store Builds

The app is configured for EAS native builds with stable identifiers:

- iOS bundle ID: `com.nightime.agent`
- Android package: `com.nightime.agent`

Run the release audit before building. It fails on known App Store blockers such
as enabled paywall bypass, demo entitlement, missing production Supabase config,
missing StoreKit product ids, and missing native metadata:

```bash
npm run release:audit
```

To audit a production env file instead of local `.env`:

```bash
RELEASE_ENV_FILE=.env.production npm run release:audit
```

Build production binaries with:

```bash
EAS_BUILD_NO_EXPO_GO_WARNING=true npx eas-cli build --profile production --platform ios
npx eas-cli build --profile production --platform android
```

Current iOS build blocker: EAS requires Apple credential validation. Complete
interactive Apple login/2FA or configure an App Store Connect API key before
rerunning the production iOS build. Prior failed or aborted attempts incremented
the remote iOS build number; last observed drift was around `9`. Keep remote
versioning enabled and only run `npx eas-cli build:version:set` if App Store
Connect rejects a duplicate build number.

Submit after the store listings, privacy forms, screenshots, and review/demo
credentials are ready:

```bash
npx eas-cli submit --profile production --platform ios --latest
npx eas-cli submit --profile production --platform android --latest
```

Before submitting, make sure hosted Supabase services and Edge Functions are
deployed and reachable. Apple explicitly expects account-based apps to provide a
demo account or full demo mode, and backend services must be live during review.
Google Play currently requires new apps and updates to target Android 15 / API
35 or higher; Expo SDK 54 should be validated through the generated Android
manifest before upload.

## Production Environment

Set these Vercel environment variables for the Expo web app:

```bash
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
```

Only `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` are required for persistent Supabase auth.

## Google OAuth

Google login uses Supabase Auth with the Expo scheme
`nightime-agent://auth/callback` for native and the production origin
`https://nitime.app` for web. Google provider config lives in
`supabase/config.toml`; the checked-in config already includes the redirect
allow-list:

```text
https://nitime.app
nightime-agent://auth/callback
http://localhost:8081
http://localhost:8082
http://127.0.0.1:8081
http://127.0.0.1:8082
```

Google OAuth cannot be fully tested with dummy Supabase env vars. See
`docs/auth-oauth-setup.md` for the current-state notes and manual validation
steps.

## Supabase

Run the SQL files in `supabase/migrations/` against the target Supabase project
before enabling production auth. Current migrations cover provider-owned app
tables, portal/tenancy fields, public profile view, services, availability, and
booking payment placeholders, agent runtime tables, webchat channel support, and
Google Voice channel metadata.

Current production status: remote migrations are applied through
`20260615020000_web_trial_entitlements.sql`.

Apply migrations through the session pooler when using `DATABASE_URL`:

```bash
supabase db push --db-url "$(echo "$DATABASE_URL" | sed 's/:6543/:5432/')"
```

Deploy the agent runtime functions after migrations:

```bash
supabase functions deploy connect-channel
supabase functions deploy telegram-webhook
supabase functions deploy whatsapp-webhook
supabase functions deploy send-draft
supabase functions deploy webchat-inbound
supabase functions deploy webchat-poll
supabase functions deploy google-voice-webhook
```

Current production status: all functions above are active.

Set server-side Supabase function secrets for runtime-only credentials:

```bash
supabase secrets set AGENT_LLM_DISABLED=true AGENT_LLM_MAX_TOKENS=180 # cost-first TestFlight default
supabase secrets set OPENROUTER_API_KEY=... AGENT_MODEL=openrouter/free # optional LLM fallback
supabase secrets set GOOGLE_OAUTH_CLIENT_ID=... GOOGLE_OAUTH_CLIENT_SECRET=... # Google Voice-over-Gmail
supabase secrets set WHATSAPP_VERIFY_TOKEN=... WHATSAPP_APP_SECRET=... # WhatsApp Cloud API webhook verification
```

Web chat and Telegram are self-serve in the provider app (Settings ->
Channels). Operator scripts remain for assisted/credential-heavy channels and
support cases:

```bash
node scripts/enable-webchat.mjs [providerEmail]
node scripts/connect-telegram.mjs <botToken> [providerEmail]
node scripts/connect-whatsapp.mjs <phoneNumberId> <accessToken> [providerEmail]
node scripts/connect-google-voice.mjs <gmailAddress> <refreshToken> [providerEmail]
```

Do not expose service-role keys in Expo or Vercel public variables. The browser build can only safely use the Supabase anon key with RLS policies enabled.
