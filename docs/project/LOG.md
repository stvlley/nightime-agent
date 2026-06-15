# Project Log

## 2026-06-15

### Remove setup chat and align lighter app branding

- Removed the old chat-style onboarding path:
  - Deleted `app/(onboarding)/setup.tsx`.
  - Deleted setup-chat-only utilities, inference helpers, validation helpers,
    tests, and manual setup-flow QA doc.
  - Removed the `setup` screen from the onboarding stack.
- Updated conversion onboarding so skip/finish now marks onboarding complete and
  routes directly to the provider dashboard instead of handing off to setup chat.
- Replaced Settings' "Setup chat" row with a direct "Agent settings" entry.
- Rethemed the shared app UI tokens to the lighter conversion-onboarding
  palette and switched the Tamagui root theme to `light`.
- Updated the landing page to keep a partial dark branded backing:
  - Dark nav, hero, trust band, footer CTA, and page gutters.
  - Light constrained section panels/cards on top of the dark backing.
  - `NightSky` restored in the footer CTA.
- Refreshed docs and roadmap references so active product docs describe
  conversion onboarding and dashboard configuration instead of setup chat.
- Local validation passed: `npm run typecheck`, `npm test`, `npm run lint`, and
  `npm run build:web`.

### Landing signup and visual direction

- Updated the public landing direction so the top stays dark and branded:
  dark nav + starry hero remain, owl stays in the navbar logo, and the hero
  visual is now the app inbox mockup instead of the large owl mascot.
- Reduced signup friction from landing:
  - Removed the separate client CTA from the nav and hero.
  - Primary CTA now opens provider account creation directly.
  - Signup modal no longer asks users to choose provider/client again after
    clicking provider signup.
  - Client path remains as a lighter early-access/update option in the role
    section.
- Lightened the rest of the landing page:
  - Main content bands, cards, FAQ, early-access section, cookie banner, and
    signup modal now use light branded surfaces with dark text.
  - Reintroduced one intentional dark contrast band for trust/privacy because it
    fits the brand and makes the discretion/control story feel stronger.
- Reworked the bottom CTA into a more authentic footer:
  - Brand row with owl mark.
  - Product grounding copy.
  - Provider CTA.
  - Small trust/meta line and Privacy / Terms / Contact footer links.
- Local validation passed: `npm run typecheck`, `npm run lint`, and
  `npm run build:web`.
- Deployment intentionally paused per owner request: do not deploy again until
  explicitly told to deploy.

## 2026-06-04

- Refreshed stale documentation after the Phase 2 runtime work:
  - `AGENTS.md` now lists `npm test` and `npm run typecheck`, and no longer says
    there is no test runner.
  - `PLAN.md` current-state snapshot now reflects the provider app, live
    Supabase data, setup chat, approval queue, Edge Functions, script-first
    channel setup, and the hosted deploy/live-UAT milestone.
  - `CORE_FEATURES.md` channel coverage now reflects implemented web chat,
    Telegram, and Google Voice-over-Gmail runtime support, plus pending Settings
    UI for channel connection.
  - `DEPLOYMENT.md` now documents the current Supabase migration/function deploy
    flow and script-first channel setup.
  - `supabase/functions/README.md` now describes `send-draft` as channel-aware
    instead of Telegram bot-only.
- Verification after the docs refresh: `npm test` (50 tests) and
  `npm run typecheck` pass.

### App Store / Google Play prep + WhatsApp channel

- Updated native Expo metadata for store builds:
  - App display name: `Nightime Agent`
  - URL scheme: `nightime-agent`
  - iOS bundle identifier: `com.nightime.agent`
  - Android package: `com.nightime.agent`
  - Initial native build numbers: iOS `1`, Android `versionCode` `1`
- Added `eas.json` with development, preview, and production build profiles;
  production Android builds as an App Bundle.
- Added WhatsApp Cloud API runtime support:
  - `supabase/functions/whatsapp-webhook` for Meta webhook verification and
    inbound message handling.
  - `_shared/whatsappParser.ts` and `_shared/whatsapp.ts` for dependency-free
    webhook parsing and Graph API text delivery.
  - `send-draft` support for WhatsApp approvals.
  - `scripts/connect-whatsapp.mjs` to validate/store a provider phone number id
    and access token server-side.
  - Supabase function config, env example, deployment docs, and runtime README
    updated for WhatsApp.

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

## 2026-05-30 (Phase 2 — agent runtime)

- Built the first server tier: the message loop the product is named for. Until
  now everything was UI + schema + deterministic client stubs; there was no
  compute and `utils/bookingAgent.ts` / `channelConnectors.ts` (~1.5k lines) were
  dead, POSTing to endpoints that never existed.
- **Edge Functions** (`supabase/functions/`, Deno):
  - `telegram-webhook` (verify_jwt=false): authenticates the inbound call by the
    per-provider `X-Telegram-Bot-Api-Secret-Token`, resolves the owning provider,
    persists the inbound message, runs the free FAQ pre-filter, falls back to the
    cheap model only on a miss, and writes a draft into the approval queue (or
    auto-sends when the provider opted into `auto_eligible` and the FAQ match is
    confident + clean).
  - `send-draft` (verify_jwt=true): the provider approves a pending draft from the
    app; it verifies ownership, sends via the bot, and marks it `sent`.
- **Shared pure logic** lives in `_shared/agentLogic.ts` (normalize/tokenize,
  `matchFaq`, `classifyIntent`, `screenContent`, `decideResponse`) and
  `_shared/telegramParser.ts`. Dependency-free (no Deno/Supabase/RN) so the same
  code runs in the Edge Function and under vitest. IO is isolated in
  `_shared/telegram.ts` (send) and `_shared/llm.ts` (Anthropic, gated on
  `ANTHROPIC_API_KEY`, model `claude-haiku-4-5`).
- **Policy:** the free pre-filter handles most messages at $0; the model is only
  called on an FAQ miss and only when a key is set (otherwise a deterministic
  holding reply). Only confident FAQ answers can auto-send; LLM/fallback drafts
  always require human approval — keeps the AI-disclosure / impersonation risk
  behind a human gate for v1.
- **Schema** (`20260530030000_agent_runtime.sql`): approval-queue columns on
  `messages` (`approval_status`, `response_source`, `reply_to_message_id`,
  `delivered_at`), `agent_channels` (bot creds + webhook secret, owner-RLS,
  secrets only read server-side), and `agent_events` (observability/audit log).
  `types/database.ts` updated to match; typecheck clean.
- **Provider app:** `lib/data.ts` gains `draftService` (listPending /
  approveAndSend via `send-draft` / reject); the Inbox renders a **Needs your
  approval** section above Conversations with Approve & send / Reject and inline
  error surfacing. Demo mode shows nothing (no Supabase).
- **Onboarding:** `scripts/connect-telegram.mjs` validates a bot token, upserts
  the `agent_channels` row with a generated secret, and calls Telegram
  `setWebhook` at the deployed function. `supabase/functions/README.md` documents
  the deploy + try-the-loop steps.
- **Plumbing:** `config.toml` sets per-function `verify_jwt`; `tsconfig.json` and
  `eslint.config.js` exclude `supabase/functions` (Deno toolchain, not Expo);
  `.env.example` documents the server-side-only secrets (never `EXPO_PUBLIC_`).
- **Verification:** `npm run typecheck`, `npm test` (45 tests, +23 new for
  `agentLogic` and `telegramParser`), `npm run lint`, and `npm run build:web` all
  pass. Live UAT (deploy + real bot message) still pending — not possible in this
  no-Docker session.

### Superseded next steps

The setup-chat UAT list below was the checkpoint before the Phase 2 runtime was
implemented. The current next steps are in `PLAN.md`: deploy/apply migrations,
connect live webchat/Telegram/Google Voice credentials, run hosted UAT, add
channel-connect UI in Settings, add notifications, and continue visual polish.

## 2026-05-30 (Product direction alignment — tool, not marketplace)

- Aligned the product docs with partner direction: **Nightime Agent is a
  communication tool, not a marketplace. Not the marketplace first.** The
  product is the messaging/communication piece on the provider's own channels;
  the provider and client transact off-platform.
- **Rationale captured (legal/regulatory):** as long as we sell no services — no
  money for a service through us, no booking-of-record, no public service
  listing — "we are a tool then we are fine," and we stay out of
  marketplace/intermediary regulation (notably Germany/EU). Going the
  marketplace way pulls that burden in now.
- **Strategy captured:** launch the comms piece → get providers hooked across
  the sites they already use → then a deliberate fork: **sell the tool to
  companies (bidding war)** *or* **add a marketplace** (and accept the German/EU
  work). Both are later decisions; the default path stays the comms tool.
- **Defined "the marketplace line"** in `CORE_FEATURES.md`: the public portal
  `/p/[slug]`, the booking-of-record flow, and **payments** are the line —
  payments (money for a service through us) is the brightest part of it. They
  stay schema-ready for optionality but are **gated**: do not build until an
  explicit marketplace decision.
- **Edits:**
  - `CORE_FEATURES.md`: new "Product positioning & strategy" + "The marketplace
    line" sections; §3 (customer portal) and §3.4 (payments) re-headed as GATED
    marketplace-fork work; §5.5 compliance now leads with tool-vs-marketplace as
    the master lever; §6 non-goals leads with "being a marketplace."
  - `PLAN.md`: rewrote "What the app is"; added Product positioning + Marketplace
    fork rows to the Decisions table; compliance section leads with the
    tool/marketplace lever; **Phase 3 (Customer portal) marked ⛔ GATED** — the
    default roadmap is Phase 2 → Phase 4 → Phase 5, Phase 3 only after an explicit
    decision to become a marketplace.
- **No code/schema changes.** Payment columns and portal schema remain in place
  (dormant) so optionality for the marketplace fork is preserved. Their presence
  does not change positioning as long as no money for a service moves through us.

## 2026-05-30 (Phase 2 — first live run of the agent loop)

- Docker is now available, so the message loop ran end to end for the first time
  against the **local Supabase stack** (real Postgres + real Deno edge runtime),
  not just unit tests. Every prior session was blocked on "no Docker."
- **Boot gotcha (deploy-blocking) fixed:** both Edge Functions imported
  `https://esm.sh/@supabase/supabase-js@2.55.0`, which resolves a transitive
  `storage-js@2.99.3` whose `StorageClient` module path **404s on esm.sh** → the
  worker fails to bootstrap (`InvalidWorkerCreation`, HTTP 503). This would have
  failed on real deploy too; the 45 unit tests never caught it because they only
  import the dependency-free `_shared` logic, never the function entrypoints.
  Fix: switched both imports to the `npm:@supabase/supabase-js@2.55.0` specifier
  the Supabase edge runtime supports natively.
- **Local-DB gotcha:** the persisted local DB volume predated the agent-runtime
  migration, so `supabase start` left `20260530030000_agent_runtime.sql`
  unapplied (only 6 of 7 versions in `schema_migrations`). `supabase migration up
  --local` applied it (creates `agent_channels`, `agent_events`, approval-queue
  columns on `messages`).
- **Live UAT harness** added: `scripts/connect-telegram.mjs`'s sibling
  `scripts/live-test-agent.mjs` seeds a provider (auth user + profile +
  `provider_preferences` + FAQ + `agent_channels`) and drives `telegram-webhook`
  + `send-draft` with simulated Telegram updates, asserting DB state. 14/14 checks
  pass:
  - bad webhook secret → `200` ack, zero rows written;
  - FAQ hit under `auto_eligible` → inbound persisted, FAQ matched (conf 1.0),
    `auto_sent`, delivery attempted, events logged;
  - FAQ miss with no `ANTHROPIC_API_KEY` → deterministic `$0` fallback draft into
    the **pending** approval queue;
  - `send-draft` (JWT) → caller identified, ownership + state-machine checks pass;
  - moderation hit ("under 18") → forced `pending` even on a confident FAQ match.
- **Still credential-gated (not a code gap):** literal Telegram delivery needs a
  real bot token (the run reached `api.telegram.org` and got `404` on the fake
  token, so outbound HTTP works), and the LLM path needs `ANTHROPIC_API_KEY` (it
  correctly fell to the deterministic reply without one).

## 2026-05-31 (Phase 2 — zero-setup web-chat channel; both channels live)

- Added a **web-chat channel** alongside Telegram: the no-setup surface. A
  provider needs no bot, no token, no third-party account — clients message an
  embeddable widget identified by the provider's public `profiles.slug`. Telegram
  (branded, requires a one-time BotFather token) is kept; both run the *same* loop.
- **One loop, two transports.** Extracted the orchestration out of
  `telegram-webhook` into channel-agnostic `_shared/agent.ts` `runAgentTurn()`
  (persist inbound → FAQ pre-filter → LLM/fallback → approval queue/auto-send →
  events → thread state). Channels differ only in transport via an injected
  `deliver()`: Telegram hits the Bot API; web chat is a no-op because "delivery"
  is just DB visibility. `telegram-webhook` is now thin (auth + parse + wire).
- **New Edge Functions** (`verify_jwt=false`, public):
  - `webchat-inbound`: resolves provider by public slug, requires an active
    `webchat` channel, runs the loop. Returns the FAQ answer immediately only when
    auto-send-eligible; otherwise returns a neutral **receipt** (NOT the held
    draft) so the human-approval gate is never bypassed.
  - `webchat-poll`: returns the visitor's own messages + only *visible* outbound
    (`auto_sent`/`sent`). Pending/rejected/failed drafts are never exposed.
- **`send-draft` is now channel-aware:** Telegram drafts deliver via the Bot API;
  web-chat drafts just flip to `sent` (visible on the visitor's next poll).
- **No new tables.** `threads`/`messages` were already channel-agnostic; the
  provider-app approval queue (`lib/data.ts` `draftService`, which already reads
  `threads.channel`) shows web-chat drafts in the same Inbox section for free.
  Migration `20260531000000_webchat_channel.sql` only widens the `channel` CHECK
  on `agent_channels` + `threads` to include `'webchat'` (caught live — both had
  a CHECK limiting to gv/telegram/whatsapp/email/sms).
- **Embeddable widget** `public/chat.html`: self-contained, night-themed, baked-in
  **AI disclosure** banner, localStorage session id, optimistic echo + 3s polling.
  Config via `?slug=&base=&key=&brand=` query params. `scripts/enable-webchat.mjs`
  flips the channel on for a provider and prints the link + iframe snippet (the
  zero-setup analog of `connect-telegram.mjs`).
- **Live UAT:** extended `scripts/live-test-agent.mjs` to drive both channels —
  **27/27 checks pass** against the local stack. Telegram path unchanged after the
  refactor (no regression); web chat verified end to end including the security
  property that a held draft is invisible to the visitor until approved, then
  becomes visible. `npm run typecheck`, `npm test` (45), `npm run lint` all clean.
- **Pending:** visual browser UAT of the widget; in-app Settings UI to toggle
  channels (both are still script-first); real Telegram token + `ANTHROPIC_API_KEY`
  for the two credential-gated paths.

## 2026-06-02 (Phase 2 — Google Voice wiring)

- Wired the first **Google Voice** path as Google Voice-over-Gmail, not a direct
  Google Voice API. Rationale: Google Voice is documented for interactive
  messaging, while Gmail provides the programmable push/send surface via Pub/Sub
  mailbox watches and `messages.send`.
- Added `google-voice-webhook` Edge Function (`verify_jwt=false`): decodes Gmail
  Pub/Sub notifications, resolves the provider by watched Gmail address
  (`agent_channels.channel='gv'`, `external_account_id=<gmail>`), fetches Gmail
  history since the stored history id, parses only Google Voice SMS emails with a
  real `@txt.voice.google.com` reply address, and runs the shared `runAgentTurn()`
  loop on channel `gv`.
- Added `_shared/googleVoiceParser.ts` (dependency-free, unit-tested) and
  `_shared/gmail.ts` (Deno-only OAuth refresh, Gmail API calls, outbound
  `messages.send`). `send-draft` now supports `gv` by replying through Gmail to
  the stored thread destination; unsupported channels still return
  `unsupported_channel`.
- Added migration `20260602000000_google_voice_channel_metadata.sql` with
  `agent_channels.metadata jsonb` for operational channel state such as
  `lastHistoryId`, watch expiration, and Pub/Sub topic. `types/database.ts` and
  `ChannelType` updated (`webchat` included too).
- Added `scripts/connect-google-voice.mjs`: validates Google OAuth refresh,
  starts/renews Gmail `watch`, saves the `gv` channel row and baseline
  `lastHistoryId`. `.env.example` and `supabase/functions/README.md` document
  `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`, and
  `GOOGLE_PUBSUB_TOPIC`.
- Verification: `npm test` (50 tests), `npm run typecheck`, and `npm run lint`
  all pass. Direct `deno check` was not run because Deno is not installed in this
  local environment.
- Pending: apply migration/deploy the new function, create the Google Cloud
  Pub/Sub push subscription, obtain a Gmail refresh token with read/send scopes,
  run `connect-google-voice.mjs`, and live-test actual Google Voice delivery.

## 2026-06-12 (Provider app: self-serve channels, thread view, real controls)

- **Self-serve channel connection shipped** (the open Phase 2 item). New
  `lib/channels.ts` + `app/(tabs)/channels.tsx` (hidden tab, reachable from
  Settings and the dashboard): one-tap web chat enable (ensures a profile slug,
  upserts the `agent_channels` row, shows the shareable widget link + iframe
  embed snippet with copy/share), paste-a-token Telegram connect (structural
  token check → Bot API `getMe` validation → row upsert → `setWebhook` with a
  fresh secret; on webhook failure the row is left inactive for retry), and
  pause/resume/disconnect per channel. WhatsApp + Google Voice render as honest
  "assisted setup" cards (credential-gated; scripts remain the path). All of it
  runs as the signed-in provider under the existing owner-scoped RLS — the
  client never SELECTs `bot_token`/`webhook_secret`; no new server surface.
- **Thread detail + manual replies** (`app/(tabs)/thread.tsx`): the inbox rows
  now open a full transcript (direction bubbles, AI/saved-reply source badges,
  auto-sent/pending/rejected/failed states), pending drafts can be approved or
  rejected inline, and the provider can reply as themselves: the reply is
  persisted as a pending outbound message and delivered through the existing
  `send-draft` Edge Function — if delivery fails it stays in the approval queue
  so nothing is lost. Demo mode gets a small clearly-placeholder transcript so
  the flow is explorable without Supabase.
- **Dead controls now real.** Dashboard channel list reads `agent_channels`
  (was hardcoded "connected" claims) with an empty-state CTA; the dashboard and
  Agent Settings toggles persist `approval_mode` (relabelled "Auto-send
  confident replies" to match what the runtime actually does); moderation level
  persists `moderation_level`; Settings notification/follow-up toggles persist
  to `provider_preferences` (new `lib/preferences.ts`); FAQ rows gained an
  enable/disable switch wired to the existing `faqService.setEnabled`.
- **Attention signal:** Inbox tab badge shows the pending-draft count (30s
  poll in the tab layout) and the dashboard shows a tappable "N replies need
  your approval" card. Inbox now refreshes on focus so approvals done from a
  thread reflect immediately.
- **Profile editing** (`app/(tabs)/profile.tsx` + `updateProfile` on the auth
  context, demo-mode aware): business/display name, headline, location, and
  the public chat handle (slug) with client-side validation matching the
  `profiles_slug_format` constraint and a friendly unique-violation message.
- **Billing made honest:** plan/usage now come from the real profile columns,
  the invented "card ending 4242" and fictional usage bars are gone, and the
  screen states plainly that payments aren't connected during early access
  (consistent with the deferred-payments decision).
- **Web-Alert bugs fixed while in there:** FAQ delete confirmation used
  buttoned `Alert.alert` (a no-op on react-native-web, the primary deploy
  target) — replaced with a shared `utils/confirm.ts` used by Settings sign-out,
  channel disconnect, and FAQ delete. Inline error text replaced the other
  web-dead alerts in Agent Settings. Last teal-era token (`#a7d6d1` ToggleRow
  track) migrated to the night palette.
- New pure helpers in `utils/channelSetup.ts` (slug derivation/validation,
  Telegram token shape check, webhook secret generation, widget link/embed
  builders) with `test/channelSetup.test.ts` — suite now 70 tests.
- Verification: `npm run typecheck`, `npm run lint`, `npm test` (70), and
  `npm run build:web` all pass; static export smoke-tested (`/` and
  `/chat.html` 200 via `scripts/serve-static.mjs`).
- Still pending (unchanged): hosted deploy + live-channel UAT, push/system
  notifications, deferred auth/onboarding night-theme migration.

## 2026-06-14 (Release prep, cleanup, nav polish, channel-test blocker)

- **EAS/App Store prep:** created and linked the EAS project
  `@stvll3y/nightime-agent` (`projectId:
  0dbf9154-990b-4df3-88f5-ea145b963a13`). Added `owner: "stvll3y"` and
  `extra.eas.projectId` to `app.json`. Set production EAS env vars
  `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`.
- **iOS release metadata:** added `ITSAppUsesNonExemptEncryption: false` and a
  document-picker usage string in `ios.infoPlist`. Removed local
  `ios.buildNumber` because EAS remote versioning is active; failed build
  attempts initialized/incremented the remote iOS build number to `2`.
- **Build status:** production iOS build now gets past project linking,
  environment loading, and export-compliance metadata. Remaining blocker is
  Apple signing credentials: EAS stops in non-interactive mode with
  `Credentials are not set up. Run this command again in interactive mode.`
  Resume with:

  ```bash
  EAS_BUILD_NO_EXPO_GO_WARNING=true eas build --platform ios --profile production
  ```

  This requires Apple Developer team/certificate/provisioning setup. Submit
  after a successful build:

  ```bash
  eas submit --platform ios --profile production
  ```

- **Root cleanup:** moved project planning/history docs out of repo root into
  `docs/project/` (`CORE_FEATURES.md`, `DEPLOYMENT.md`, `DESIGN_SYSTEM.md`,
  `LOG.md`, `PLAN.md`). Added `.easignore` so EAS upload excludes local/generated
  artifacts (`node_modules`, `dist`, `.expo`, `.vercel`, `graphify-out`, `.env`,
  native credential files, editor noise). Updated the Supabase function README
  reference to `docs/project/PLAN.md`.
- **Brand cleanup:** replaced stale TherapyBot references in
  `public/manifest.json`, `public/sw.js`, and `utils/webhooks.ts` with Nightime
  Agent naming/source headers.
- **Dependency cleanup:** removed unused packages `expo-camera`,
  `react-native-fs`, and `@lucide/lab`. Kept `expo-haptics`, `expo-blur`,
  `expo-symbols`, and `react-native-webview` per product direction. Wired
  `expo-haptics` into shared controls (`Button`, `IconButton`, pressable
  `Surface`, and `ToggleRow`) as best-effort feedback. `npm uninstall` reported
  existing audit issues (14 total, 1 critical); did **not** run
  `npm audit fix --force` because that can introduce breaking dependency churn
  during release prep.
- **Bottom nav IA + visual pass:** reduced the bottom nav from seven visible
  tabs to four primary destinations: Home, Inbox, Calendar, More. AI settings,
  Channels, Training imports, Payment links, Plan & billing, Profile, and Thread
  are now secondary screens reachable from Dashboard/More. Replaced the default
  React Navigation label bar with a custom icon-only floating nav, active pill,
  blur background on iOS, and a small Inbox dot badge. Increased shared scroll
  bottom padding so the floating nav does not cover content.
- **Settings card layout fix:** fixed `ListRow` so cards use a proper
  leading-icon / content / trailing-accessory layout. This fixed the chevron
  stacking under title/subtitle on narrow screens. Settings now passes simple
  chevron accessories instead of nested `IconButton`s.
- **Web chat enable failure investigation:** user hit `could not enable web
  chat`. Patched `lib/channels.ts` to preserve profile fields when creating a
  slug and to surface actionable errors for missing webchat migration,
  `agent_channels` RLS failures, and slug constraint failures. The actual hosted
  blocker found by `supabase link --project-ref hwcpztsltgpjzclrmyez --debug`:

  ```text
  project is paused
  An admin must unpause it from the Supabase dashboard at
  https://supabase.com/dashboard/project/hwcpztsltgpjzclrmyez
  ```

  After unpausing, run:

  ```bash
  supabase link --project-ref hwcpztsltgpjzclrmyez
  supabase db push
  supabase functions deploy webchat-inbound
  supabase functions deploy webchat-poll
  supabase functions deploy send-draft
  ```

  Then retry More → Channels → Turn on web chat.
- **No-AI channel expectation:** channel routing does not require
  `ANTHROPIC_API_KEY`. With no key, FAQ misses create a deterministic fallback
  draft in the approval queue; FAQ hits can still auto-send when
  `approval_mode='auto_eligible'`. Existing local harness
  `scripts/live-test-agent.mjs` tests Telegram + webchat routing, fallback
  drafts, approval, hidden pending webchat drafts, and rejected disabled/unknown
  channels. Local Supabase was not running in this session
  (`supabase status` could not inspect the missing local DB container), so the
  harness was not rerun.
- **Verification run during this session:** `npm run typecheck`, `npm run lint`,
  and `npm test` passed after the release config, cleanup, haptics, nav, card
  layout, and webchat-error patches. Expo web was started on port `8082`; the
  shell responded and the web bundle compiled successfully. Browser screenshot
  verification was not possible because `agent-browser` is not installed here.

## 2026-06-15 (Paywall gating decision + StoreKit next step)

- **Paywall bypass decision:** Skip must not let a provider enter the app before
  the paywall/trial step. Removed the visible Skip action from the onboarding
  top bar and added a `(tabs)` route guard: authenticated users who do not have
  `@onboarding_completed = 'true'` are redirected back to
  `/(onboarding)/onboarding` instead of reaching the workspace by deep link.
- New provider signup now clears only the prior local onboarding completion flag
  before opening onboarding, so a completed session on the same device does not
  let a fresh account skip the conversion/paywall flow.
- **Current paywall caveat:** the `paywall` screen still advances through the
  funnel as a simulated "Start free trial" action. This closes the obvious skip
  bypass, but it is **not** App Store-ready monetization until StoreKit validates
  an active entitlement.
- **StoreKit task for next session:** wire native iOS subscription purchase and
  entitlement validation before App Store submission. Required setup:
  - Apple Developer/App Store Connect access.
  - Create subscription products in App Store Connect, likely:
    `nightime_annual` and `nightime_monthly` (final IDs can differ, but must
    match code/env).
  - Add a React Native/Expo-compatible StoreKit library/config plugin
    (evaluate current best option before implementation; likely `react-native-iap`
    or RevenueCat if we want server-side receipt/subscription management faster).
  - Replace the simulated paywall CTA with:
    load products → select plan → purchase → validate receipt/entitlement →
    write subscription state to Supabase → call `completeOnboarding()` → open
    dashboard.
  - Add restore purchase support wired to the existing paywall disclosure text.
  - Add an entitlement gate in `(tabs)` in addition to the onboarding-completed
    gate, so cancelled/expired users cannot use paid workspace features.
  - Decide whether Stripe remains web-only/US external checkout later; for iOS
    App Store submission, StoreKit is the safest default path for digital app
    functionality.
- **Implementation note:** do not fake StoreKit by only setting
  `@onboarding_completed`. The app should only set that flag after confirmed
  purchase/trial entitlement or a deliberate internal/demo override gated by an
  environment flag.
- Local validation after the route/sign-up changes passed: `npm run typecheck`,
  `npm test`, `npm run lint`, and `npm run build:web`.

### StoreKit wiring

- Added `expo-iap` and registered its Expo config plugin. Native IAP requires a
  custom development/App Store build; Expo Go will not run this path.
- Replaced the simulated paywall advance with native subscription purchase and
  restore hooks:
  - iOS StoreKit product IDs come from
    `EXPO_PUBLIC_STOREKIT_ANNUAL_PRODUCT_ID` / `EXPO_PUBLIC_STOREKIT_MONTHLY_PRODUCT_ID`,
    defaulting to `nightime_annual` and `nightime_monthly`.
  - Purchase success verifies the StoreKit transaction through `expo-iap`,
    writes a subscription entitlement, finishes the transaction, and only then
    advances to setup.
  - Restore checks active subscriptions and writes the same entitlement state.
- Added `subscription_entitlements` with owner-only RLS and updated local
  database types. The `(tabs)` gate now requires both completed onboarding and
  an active entitlement; otherwise it redirects back to pricing.
- Added a web-safe fallback hook so Expo web export still builds. Web/demo
  unlocks require `EXPO_PUBLIC_ALLOW_DEMO_ENTITLEMENT=true`; keep that false in
  production/App Store builds.
- Updated the public landing page title/visible brand labels to lowercase
  `nitime`.
- Still required before device/App Store validation:
  - Create matching auto-renewable subscriptions in App Store Connect.
  - Apply the Supabase migration.
  - Build a custom iOS development client or App Store/TestFlight build.
  - Test sandbox purchase, cancellation, expiration, and restore flows on a real
    iOS device.
- **Next phase:** split the payment flow by platform. Web should use a separate
  checkout path, while the native iOS app should continue through StoreKit.

### Web testing bridge

- Web paywall flow now grants a Supabase-backed `web_trial` entitlement so the
  browser version can be tested and used before App Store launch.
- iOS remains on StoreKit purchase/restore. Web entitlements are stored as
  `platform = 'web'` and `source = 'web_trial'` so they can be replaced by a
  real web checkout flow later without changing the native StoreKit path.
- Added a follow-up migration to allow `web` / `web_trial` in
  `subscription_entitlements`.
