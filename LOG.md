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

## 2026-05-29

- Initialized git in the repo (first recovery-point commit). Discovered a global
  `~/.gitignore_global` rule was silently excluding `lib/`, so `lib/supabase.ts`
  had never been committed; overrode it in the project `.gitignore`.
- Authored `PLAN.md` as the living implementation plan (provider app + customer
  portal + agent runtime, $0 until launch).
- **Phase 0** (d6981db): removed dead duplicate interfaces from `app/_layout.tsx`;
  renamed app identity to `nightime-agent` in `package.json` and `app.json`.
- **Phase 1** (103f041, c4c64db): wired provider UI to live Supabase — inbox,
  dashboard stats, and calendar now read real data via a new `lib/data.ts`
  (threadService/bookingService/faqService/statsService), with demo-mode
  fallbacks. FAQ editor in `ai-settings` persists to the `faq` table
  (create/delete, RLS-verified). Retired dead `types/index.ts`. Added
  `scripts/seed.mjs` (idempotent demo-data seeder, service-role, server-side).
- **Phase 1.5** (23784ad, d9bd5d4, 59e5546): portal + tenancy schema, migrations
  `20260529020000_portal_and_tenancy.sql` and `20260529030000_fix_public_read_policies.sql`.
  Added provider public fields to `profiles` (slug, display_name, headline, bio,
  avatar_url, location_label, published, age_gate_required); relational `services`
  and `availability` tables; payment-ready nullable columns on `bookings`; and a
  `public_provider_profiles` view as the column-safe public boundary (anon granted
  the view, never base `profiles`). Public-read RLS on services/availability tests
  the view (not `profiles`, which is owner-only). Seed now publishes the demo
  provider `nightime-demo` with 3 services + 5 availability windows.
- Verified RLS end-to-end as anon: CAN read the public view, services, and
  availability of the published provider; CANNOT read base `profiles`, `email`,
  `bookings`, `messages`, or `threads`. Typecheck passes throughout.
- **Migration gotcha:** the Supabase CLI fails against the transaction pooler
  (`:6543` in `DATABASE_URL`) with "prepared statement already exists"; apply
  migrations via the session pooler (`:5432`). One-time `migration repair` was
  needed to mark the pre-existing manually-applied migrations as applied.
