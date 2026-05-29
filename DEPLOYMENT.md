# Vercel Deployment

## Vercel

This app deploys as a static Expo web export. Vercel uses `vercel.json`:

- Install: `npm install`
- Build: `npm run build:web`
- Output directory: `dist`

The rewrite rule sends app routes back to `index.html` while leaving Expo assets and public files untouched.

The app boots with no environment variables. In that state, auth uses local demo storage and data is not persistent across devices.

## Production Environment

Set these Vercel environment variables when backing services are ready:

```bash
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
EXPO_PUBLIC_API_BASE_URL=
EXPO_PUBLIC_WEBHOOK_URL=
EXPO_PUBLIC_TRAINING_WEBHOOK_URL=
EXPO_PUBLIC_MESSAGE_WEBHOOK_URL=
EXPO_PUBLIC_WHATSAPP_PHONE_NUMBER_ID=
```

Only `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` are required for persistent Supabase auth.

## Supabase

Run the SQL files in `supabase/migrations/` against the target Supabase project before enabling production auth. The latest migration creates the `profiles`, `bookings`, and `faq` tables expected by the app client.

Do not expose service-role keys in Expo or Vercel public variables. The browser build can only safely use the Supabase anon key with RLS policies enabled.
