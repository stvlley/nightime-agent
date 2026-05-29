# Project Log

## 2026-05-28

- Switched hosting target from Railway to Vercel.
- Added `vercel.json` for static Expo web deployment with `npm run build:web` and `dist` output.
- Removed `railway.json` and updated `DEPLOYMENT.md` for Vercel setup.
- Deployed production app to `https://nightime-agent.vercel.app`.
- Verified `npm run typecheck`, `npm run lint`, `npm run build:web`, and HTTP 200 from the production URL.
- Current production mode: app boots without env vars using local demo auth; persistent auth requires Supabase env vars and migrations.
- Created new Supabase project `nightime-agent` in org `gay-copper-nm3ssps` with project ref `hwcpztsltgpjzclrmyez`.
- Linked the local Supabase CLI workspace to `hwcpztsltgpjzclrmyez` and updated local `.env` Supabase values.
- Added and applied `supabase/migrations/20260528235000_current_app_schema.sql` for the app's current `profiles`, `threads`, `messages`, `bookings`, and `faq` schema.
- Verified the remote Supabase tables and RLS policies, and re-ran `npm run lint`.
- Created confirmed test login `test@nightime.local` with password `TestPassword123!`.
