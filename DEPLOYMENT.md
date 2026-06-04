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

## Native Store Builds

The app is configured for EAS native builds with stable identifiers:

- iOS bundle ID: `com.nightime.agent`
- Android package: `com.nightime.agent`

Build production binaries with:

```bash
npx eas build --platform ios --profile production
npx eas build --platform android --profile production
```

Submit after the store listings, privacy forms, screenshots, and review/demo
credentials are ready:

```bash
npx eas submit --platform ios --profile production
npx eas submit --platform android --profile production
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

## Supabase

Run the SQL files in `supabase/migrations/` against the target Supabase project
before enabling production auth. Current migrations cover provider-owned app
tables, portal/tenancy fields, public profile view, services, availability, and
booking payment placeholders, agent runtime tables, webchat channel support, and
Google Voice channel metadata.

Apply migrations through the session pooler when using `DATABASE_URL`:

```bash
supabase db push --db-url "$(echo "$DATABASE_URL" | sed 's/:6543/:5432/')"
```

Deploy the agent runtime functions after migrations:

```bash
supabase functions deploy telegram-webhook
supabase functions deploy whatsapp-webhook
supabase functions deploy send-draft
supabase functions deploy webchat-inbound
supabase functions deploy webchat-poll
supabase functions deploy google-voice-webhook
```

Set server-side Supabase function secrets for runtime-only credentials:

```bash
supabase secrets set ANTHROPIC_API_KEY=... # optional LLM fallback
supabase secrets set GOOGLE_OAUTH_CLIENT_ID=... GOOGLE_OAUTH_CLIENT_SECRET=... # Google Voice-over-Gmail
supabase secrets set WHATSAPP_VERIFY_TOKEN=... WHATSAPP_APP_SECRET=... # WhatsApp Cloud API webhook verification
```

Channel setup is currently script-first:

```bash
node scripts/enable-webchat.mjs [providerEmail]
node scripts/connect-telegram.mjs <botToken> [providerEmail]
node scripts/connect-whatsapp.mjs <phoneNumberId> <accessToken> [providerEmail]
node scripts/connect-google-voice.mjs <gmailAddress> <refreshToken> [providerEmail]
```

Do not expose service-role keys in Expo or Vercel public variables. The browser build can only safely use the Supabase anon key with RLS policies enabled.
