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

## 2026-05-30

- Added the public marketing landing page on signed-out `/` while preserving the
  signed-in provider redirect to `/(tabs)` and existing provider login/register
  routes.
- Implemented landing content for the product promise, provider/client role
  split, how-it-works, provider workflow, client experience, trust/privacy,
  early access positioning, FAQ, and final CTA.
- Added dual role signup intent (`provider | client`): provider submission uses
  existing `useAuth().signUp`, while client submission records local early access
  intent pending the future customer portal auth flow.
- Added simple cookie consent with `Accept all` / `Reject optional`, persisted
  via AsyncStorage; no optional tracking or GEO-aware behavior was added.
- Refactored the landing implementation out of `app/index.tsx` into
  `components/landing/` plus `hooks/useCookieConsent.ts` so future public-page
  changes do not require a large route-file refactor.
- Updated `CORE_FEATURES.md` to add the marketing landing page as a distinct
  surface from the provider-specific customer portal `/p/[slug]`.
- Verified `npm run typecheck`, `npm run lint`, and `npm run build:web`. Served
  the generated Expo web export locally with `npm run start` on port 3000.

### Landing page review fixes

- Reviewed the landing implementation and shipped ten fixes:
  1. SEO meta (title, description, og:*, twitter:*, canonical) via
     `expo-router/head` from the landing component.
  2. Modal resets `form`, `errors`, `submitting`, and `signupComplete` on close
     so sensitive password input is not retained across reopen.
  3. Successful provider signup now routes to the onboarding setup flow
     (later refined to `/(onboarding)/setup`) instead of dropping users into an
     empty `/(tabs)` dashboard.
  4. Added `landing_intents` table for server-side capture of client + provider
     intent (migration `20260530000000_landing_intents.sql`; anon-insert RLS,
     no anon select). Helper `lib/landingIntents.ts` writes via supabase-js with
     an AsyncStorage queue fallback when Supabase is unconfigured. Applied via
     session pooler; RLS verified end-to-end (insert 201, select `[]`).
  5. Added "For clients" CTA to the nav alongside Log in and Start as provider.
  6. Restored normal page scroll on web while landing is mounted (overrode
     Expo's default `body { overflow: hidden }`), then cleaned up on unmount.
  7. Replaced `Alert.alert` flow with inline field errors + submit error: email
     regex, ≥8-character password for provider signups, per-field clearing on
     edit.
  8. Cookie banner gated on a new `loaded` sentinel from `useCookieConsent` so
     it no longer flashes on revisit while AsyncStorage resolves.
  9. Accessibility: `accessibilityRole`/`accessibilityLabel` on every Pressable;
     segmented control marked as tablist; `accessibilityViewIsModal` on the
     modal card; `textContentType`/`autoComplete` on form inputs.
  10. Added "Example" tag in the hero preview so the mock metrics aren't read
      as real data.

### Night-theme brand reskin

- Replaced the teal token palette outright with a deep-purple night palette in
  `components/ui` `colors` (background `#0d0a26`, primary `#9d7bff`, accent
  `#c9b5ff`, plus surfaces, semantics, `onPrimary`, `accentDim`, `starGlow`).
  All consumers that already pulled from `colors` re-themed automatically.
- Tamagui `dark` theme overridden in `tamagui.config.ts` to match the night
  tokens; `app/_layout.tsx` switched to `defaultTheme="dark"`.
- Built the owl mascot as `components/landing/OwlMascot.tsx`
  (react-native-svg, web + native): hero variant (size 280, soft glow) and
  bust variant (size 36, no glow).
- Built `components/landing/NightSky.tsx`: deterministically-seeded star field,
  soft blurred clouds, and a moon. On web with normal motion preferences,
  stars twinkle and clouds drift via CSS keyframes injected once; on native or
  `prefers-reduced-motion`, layout is static. Gating handled by new
  `hooks/useCanAnimate.ts`. Backdrop is `pointerEvents="none"` + aria-hidden.
- Rewrote `components/landing/styles.ts` to remove all 91 hard-coded hex
  literals; nav now uses the owl bust; hero swaps the example preview card for
  the hero owl on a `NightSky` backdrop; FinalCTA also gets a `NightSky`.
  Modal backdrop deepened to `rgba(13, 10, 38, 0.72)`.
- Migrated remaining lucide icon colors in `RoleSignupModal.tsx` and
  `LandingSections.tsx` from hard-coded hex to `colors.accent`, `colors.text`,
  and `colors.onPrimary`.
- Updated `DESIGN_SYSTEM.md` to the night palette: new token table, contrast
  notes, mascot section, NightSky backdrop section, migration-checklist note
  on residual hex in auth/onboarding screens. `PLAN.md` Phase 1.6 added.
  `CORE_FEATURES.md` §1.5 covers brand surface, owl, sky, SEO.
- Verified `npx tsc --noEmit` and `npx expo lint` clean after each step.

### Deferred (intentional)

- `app/(auth)/*` and `app/(onboarding)/*` still carry local hex literals.
  Those screens will look mismatched (light surfaces on night chrome) until
  migrated; deferred so it doesn't collide with in-flight onboarding work.
- `assets/images/icon.png` and `favicon.png` not yet refreshed to match the
  owl mascot.

## 2026-05-30

- Product direction narrowed for v1: start with **message providers**, not a broad business-operations or portal-first setup.
- Setup onboarding direction changed from "wizard styled like chat" to an actual deterministic chat transcript: assistant prompt bubbles, provider answer bubbles, prior answers visible, and a scripted state machine under the hood.
- Updated `PLAN.md`, `CORE_FEATURES.md`, and `test/setup-flow.md` so UAT focuses on inbound message context, common questions, tone/boundaries, approval mode, follow-up, moderation, and notifications. Availability/booking context is now optional and secondary until the message-provider loop is solid.
- Setup chat polish pass: pinned composer, scrollable transcript, assistant typing state, compact quick replies, and a final review summary before save.
- Added bounded setup suggestions in `utils/setupInference.ts`. The current implementation is deterministic and provider-approved; it suggests channels, offers, tone, and boundaries after category/common-question context, but does not save hidden AI state.

### Nav chrome, shared auth provider, and route gating

- Retheme: bottom tab bar (`app/(tabs)/_layout.tsx`) was still light chrome
  (white surface, indigo `#4f46e5`, gray inactive). Switched every value to night
  tokens — `colors.surface` bar, `colors.border` top border, `colors.primary`
  active, `colors.textMuted` inactive. No more hard-coded hex in the navigator.
- Modernized the tab icon set within lucide (the design-system-mandated set):
  `LayoutDashboard, Inbox, CalendarDays, Sparkles, CloudUpload, Wallet,
  Settings2` — notably dropping the `Chrome as Home` template leftover (the
  Chrome browser glyph that was standing in for Home). Documented both the tab
  chrome tokens and the canonical icon mapping in a new **Bottom Tab Bar**
  section of `DESIGN_SYSTEM.md`.
- Sign-out wiring fix: the Settings button now actually calls
  `useAuth().signOut()`. Root cause of "nothing happens" on web found —
  React Native Web's `Alert.alert` is a literal no-op (`static alert() {}`), so
  the confirm dialog never appeared. Confirmation is now cross-platform:
  `window.confirm` on web, native `Alert.alert` elsewhere; button shows a
  `loading` spinner while signing out.
- **Auth is now a single provider.** Refactored `hooks/useAuth.ts` →
  `hooks/useAuth.tsx`: an `<AuthProvider>` (mounted once in `app/_layout.tsx`)
  owns the session listener and the one copy of `user`, and `useAuth()` reads it
  via context. Previously every screen that called `useAuth()` spun up its own
  state + its own Supabase subscription. The public `useAuth()` return shape is
  unchanged, so all 9 consumers (including `setup.tsx`) needed zero edits. This
  also fixes demo-mode sign-out, which never had an `onAuthStateChange` to
  propagate state across instances — one shared instance makes it reactive.
- **Route gating** via new `components/AuthGate.tsx`: waits for the session to
  resolve (spinner), then `<Redirect href="/" />` for unauthenticated users.
  Applied at the `(tabs)` and `(onboarding)` group layouts. Closes the gap where
  unauthenticated deep-links rendered provider tabs (with demo fallbacks) and the
  onboarding carousel/pricing screens. Onboarding is now gated at the layout
  level rather than relying solely on `setup.tsx`'s inline redirect. Left the
  `(auth)` group and root layout untouched (no `Stack.Protected`) so the
  in-flight onboarding routing keeps its own control.
- Verified `npm run typecheck` clean, `npm test` (22 tests) green, `expo lint`
  clean.

### Current state

- Provider signup/login flow is wired through the landing modal and routes new
  providers into `/(onboarding)/setup`.
- Setup chat is now the active first-run provider onboarding flow. It saves
  profile data, provider preferences, message channels, common questions,
  services/offers, optional availability context, notification permission, and
  demo-mode payloads.
- Settings can relaunch setup for edits via the `Setup chat` row.
- Auth state is a single `<AuthProvider>` (root-mounted, `hooks/useAuth.tsx`);
  the `(tabs)` and `(onboarding)` groups are gated by `components/AuthGate.tsx`,
  so unauthenticated deep-links to either group redirect to the landing page.
  The `(auth)` group is intentionally still ungated.
- Local Supabase is configured for UAT with the active app schema and the
  message-provider preference migration applied.
- Web sign-out was fixed: `useAuth().signOut()` now uses local Supabase session
  sign-out with timeout, clears the legacy `@user_logged_in` flag, clears demo
  auth storage, and forces `user = null` / `loading = false`. Settings then
  routes back to `/`.
- Latest verification passed: `npm test` (22 tests), `npm run typecheck`,
  `npm run lint`, and `npm run build:web`.
- Known verification gap: in-app browser automation is unavailable in this
  Codex session, so visual click-through UAT still needs to be done manually in
  the running web app/device session.

### Next steps

1. Manual UAT on web at `http://localhost:8082`:
   - provider register -> setup chat -> save -> tabs
   - Settings -> Setup chat -> prefilled edit -> save
   - Settings -> Sign out -> public landing
   - login again from landing modal
   - route gating: while signed out, deep-link directly to `/(tabs)` and
     `/(onboarding)/setup` and confirm both redirect to `/`
   - re-run `npm run build:web` (not re-verified this session) before deploy
2. Tighten setup chat UX after manual UAT:
   - mobile/desktop spacing
   - review summary readability
   - edit/back behavior around accepted suggestions
   - notification denied/skipped states
3. Replace deterministic setup suggestions with real inference only after a
   server endpoint exists. Required before enabling: structured output schema,
   validation, prompt/version logging, rate limiting, deterministic fallback,
   and no client-bundled provider secrets.
4. Begin Phase 2 agent-runtime work once setup UAT is stable:
   Telegram webhook -> Supabase Edge Function -> FAQ/keyword pre-filter ->
   provider approval queue -> outbound reply/draft.
5. Continue cleanup:
   - migrate residual auth/onboarding hard-coded colors to `components/ui`
     tokens
   - refresh app icon/favicon for the night/owl brand
   - keep removing stale/legacy routes and Bolt remnants as they surface.
