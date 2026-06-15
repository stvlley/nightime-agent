# Nightime Agent — Implementation Plan

> Living document. Goal: take the implementation forward from a static demo to a
> working AI booking agent, at **$0 cost until launch**.

## What the app is

Nightime Agent is a **communication tool, not a marketplace** — a
**message-provider assistant**. It helps independent providers handle inbound
client conversations from messaging channels: common questions, boundaries,
tone, approval mode, follow-ups, and threads that need human attention. The
provider and client transact however they already do, **off our platform**.

**Not the marketplace first.** Because we don't sell services — no money for a
service moves through us, we don't own the booking-of-record, we don't publicly
list services — "we are a tool then we are fine." That keeps us out of
marketplace/intermediary regulation (notably Germany/EU); going the marketplace
way would pull all of that in now. The strategy is: launch the communication
piece, get providers hooked across the sites they already use, then choose a
later fork — **sell the tool to companies / create a bidding war**, *or* **add a
marketplace** (accepting the German/EU work that comes with it). Both are
deliberate later decisions; the default path stays the communication tool.

Booking, availability, and public portal concepts remain in the schema and
longer-term roadmap **as the gated marketplace fork** (see Phase 3), but they are
not the center of the first usable setup experience and must not ship by default.
V1 should feel like onboarding a messaging assistant, not configuring a full
business operations suite.

## Current state

- **Stack:** Expo Router app (React 19, RN 0.81, Expo SDK 54), TypeScript,
  Supabase, and Supabase Edge Functions. The provider app deploys as a static
  web export to Vercel (`nightime-agent.vercel.app`).
- **Provider app:** signed-out `/` renders the marketing landing page; signed-in
  providers route to `/(tabs)`. Auth is centralized in `AuthProvider`, protected
  route groups use `AuthGate`, and demo-mode AsyncStorage fallback still works
  when Supabase env vars are absent.
- **Live data:** dashboard, inbox, calendar, and FAQ settings read/write through
  Supabase services in `lib/data.ts`, with RLS around provider-owned tables.
  The Inbox includes the approval queue for pending agent drafts.
- **Setup:** first-run provider onboarding is a deterministic chat transcript
  focused on message-provider context. It persists profiles, services,
  availability context where relevant, provider preferences, and demo payloads.
- **Agent runtime:** Phase 2 server tier exists in `supabase/functions/`.
  Telegram, WhatsApp, web chat, and Google Voice-over-Gmail all share the same
  agent loop: inbound message -> FAQ pre-filter -> optional LLM fallback ->
  approval queue or auto-send -> channel delivery.
- **Channel setup:** web chat and Telegram are self-serve in the app
  (Settings → Channels: one-tap web chat with shareable link/embed snippet,
  paste-a-token Telegram connect). WhatsApp and Google Voice remain
  script-first/assisted (`connect-whatsapp.mjs`, `connect-google-voice.mjs`)
  because they need Meta/Google Cloud credentials. The operator scripts
  (`enable-webchat.mjs`, `connect-telegram.mjs`) still work for support cases.
- **Verification:** current local checkpoint passes `npm test` (50 tests),
  `npm run typecheck`, `npm run lint`, and `npm run build:web`.
- **Open milestone:** hosted deploy and real-channel UAT are still pending:
  apply migrations, deploy Edge Functions, connect live channel credentials
  (especially WhatsApp + Google Voice for the first paid/phone-like pair), send
  real messages, and approve drafts from the provider app.
- **Secret hygiene OK:** service-role and provider/channel credentials stay
  server-side; only Supabase public URL/anon key are safe as `EXPO_PUBLIC_*`.

## Type and domain cleanup remaining

- Three overlapping type files: `types/database.ts` (LIVE, source of truth for DB),
  `types/booking.ts` (older agent domain model — uppercase `ThreadState`),
  `types/index.ts` (DEAD — unused; screens redefine types inline). The Phase 2
  runtime uses DB-lowercase thread states directly and does not depend on the
  uppercase `types/booking.ts` state machine; clean that older model up when the
  booking/portal fork resumes.
- Historical cleanup already completed: app identity now uses `nightime-agent`,
  dead `types/index.ts` was retired, and the duplicate interface block in
  `app/_layout.tsx` was removed.

## Product shape

V1 is message-provider-first on one shared Supabase backend:
1. **Marketing landing page** (this Expo app) — signed-out home page explaining
   the product, capturing provider/client intent, and showing local cookie
   consent. This is not the provider-specific booking portal.
2. **Provider app** (this Expo app) — authenticated control panel: dashboard,
   inbox, message automation settings, billing, settings.
3. **Customer portal** (FUTURE, separate Next.js app) — provider-specific public
   profile + availability + booking at `/p/[slug]`. Payments-ready,
   multi-tenant-ready, but deferred until the message-provider loop works.
4. **Agent runtime** (Supabase Edge Functions, Phase 2) — talks to customers in
   their own messaging surface (web chat, Telegram, WhatsApp,
   Google Voice-over-Gmail) under provider-controlled rules.

The first customer interaction surface is the conversational channel. The
marketing home captures early intent, but v1 UAT should focus on provider
message setup and approval, not public portal readiness.

## Decisions (locked in)

| Decision | Choice | Why |
|---|---|---|
| **Product positioning** | **Communication tool, not a marketplace. No sales of services.** | Staying a pure messaging tool keeps us out of marketplace/intermediary regulation (Germany/EU). Marketplace is a deliberate later fork, not the default. (Partner-aligned direction.) |
| **Marketplace fork** | **Gated — only after an explicit decision** | Launch comms → hook providers → then either sell the tool to companies (bidding war) *or* add a marketplace. Portal/booking/payments stay schema-ready but not built by default. |
| Backend compute | **Supabase Edge Functions** | Next to data+auth; free `pg_cron`; one free platform; deploy only at launch |
| Dev loop | **Local Supabase stack (needs Docker)** → fall back to remote (free) until Docker is set up | $0 |
| First channel | **Telegram** | Free API, no per-message fees, simple webhook |
| V1 provider target | **Message providers** | Keeps setup and product promise focused on inbound conversations before portal/booking breadth |
| AI strategy | **Provider-controlled message assistant** with **free keyword/FAQ pre-filter** + cheap model (Haiku 4.5) fallback | Controls token cost; most messages avoid the LLM |
| Lead model | Inbound replies + re-engage past clients (consent-based) + post/manage ads. **No cold contact.** | Cold outreach = bans + legal exposure |
| Customer surface | **Conversational channel first; portal later** | Current priority is message-provider UAT and agent control, not public booking UX |
| Customer portal stack | **Separate Next.js app** sharing Supabase (not Expo public booking routes) | Provider-specific booking pages need SSR/SEO, fast first paint, payments UX; Expo-web SPA is weak at all three. Provider app stays Expo (authed dashboard, SEO irrelevant) |
| Marketing home | **Expo signed-out `/` landing page** | Fast first public surface and role intent capture; distinct from SEO-sensitive provider portal `/p/[slug]` |
| Tenancy | **Single provider now, multi-tenant-ready schema/routes** | User decision; avoid a later rewrite without building discovery/multi-signup yet |
| Payments | **Decide later** — schema allows a payment/deposit record; no checkout built this pass | User decision; processor ToS for the vertical is a real gating constraint |
| Version control | git initialized; initial commit is the recovery point | rollback safety |

## Risk / compliance constraints (named, not blockers)

- **Tool vs. marketplace is the master compliance lever.** As long as we sell no
  services (no money for a service through us, no booking-of-record, no public
  service listing), we are a tool and avoid marketplace/intermediary regulation
  (Germany/EU). The marketplace fork (Phase 3) opts us into that burden — it is a
  deliberate decision, not a drift.
- A **public** portal for massage/companion services raises exposure the private
  provider app did not: public listing content, **age-gating**, and host/processor
  **ToS restrictions** on adult/companion services (many payment processors ban it).
  These only apply once we choose the marketplace fork.
- Agent posing as the provider → **AI-disclosure** question (clients may not know
  they're talking to a bot) + anti-spam law for any outbound.
- Decide age-gate + disclosure copy before the portal/agent go live.

## Cost model

- Functions: **$0** pre-launch (Supabase free tier ~500K invocations/mo).
- Real cost drivers at launch: **AI tokens** (controllable via pre-filter + cheap
  model) and **per-message channel fees** (Telegram = free; WhatsApp/SMS = paid).
- DB: Supabase free tier (500MB, 50K MAU) fine pre-launch.

## Phased plan

### Phase 0 — Foundation & cleanup  _(no infra, no cost)_ ✅ DONE (commit d6981db)
- [x] git init + recovery-point commit
- [x] Remove dead duplicate interface block from `app/_layout.tsx`
- [x] Fix identity naming (package.json + app.json → `nightime-agent`)
- [x] Note type-convergence plan (database.ts + booking.ts canonical; retired index.ts in Phase 1)

### Phase 1 — Wire provider UI to real data  _(remote Supabase, free; no Docker)_
- [x] Replace mock arrays (inbox, dashboard stats, calendar) with live Supabase reads (commit 103f041)
- [x] Fix global-gitignore excluding `lib/` (lib/supabase.ts had never been committed)
- [x] Make `ai-settings` FAQ editor persist to the `faq` table (commit 4f3a91c)
- [x] Retire dead `types/index.ts` (commit 4f3a91c)

### Phase 1.6 — Marketing landing + night-theme brand  _(no infra, no cost)_
- [x] Public marketing landing route at `/` (signed-out home), composed from `components/landing`
- [x] Dual-role signup modal + cookie consent + `landing_intents` table (anon-insert RLS)
- [x] SEO meta via `expo-router/head` on the landing
- [x] **Night-theme brand reskin**: deep-purple palette replaces the old teal tokens in
      `components/ui` `colors`; Tamagui `dark` theme updated to match; `defaultTheme="dark"`.
- [x] Owl mascot (`components/landing/OwlMascot.tsx`, react-native-svg) — hero + nav variants
- [x] `NightSky` backdrop (stars/clouds/moon) on hero + final CTA; twinkle/drift animations
      gated by `useCanAnimate()` (web + no reduced motion); static on native
- [x] DESIGN_SYSTEM.md rewritten around the night palette + mascot + backdrop conventions
- [ ] **Deferred:** migrate residual hex literals in `app/(auth)/*` and `app/(onboarding)/*`
      to `colors` tokens. Those screens will look mismatched (light surfaces on night
      chrome) until this pass — intentional, scheduled after the in-flight onboarding flow
      reaches a checkpoint.
- [ ] **Deferred:** regenerate `assets/images/icon.png` and `favicon.png` to match the owl
      mascot.

### Phase 1.5 — Schema for portal + tenancy  _(remote Supabase, free)_ ✅ DONE (commits 23784ad, d9bd5d4, 59e5546)
- [x] profiles public fields: slug (unique+format), display_name, headline, bio,
      avatar_url, location_label, published, age_gate_required
- [x] Public read via VIEW `public_provider_profiles` (column-subset), NOT a row policy
      on profiles — avoids leaking private columns. anon granted the view only.
- [x] services + availability relational tables; public-read RLS (active rows of
      published providers only)
- [x] bookings payment columns (all nullable; no checkout)
- [x] Keyed by provider id; seed publishes provider + services + availability
- [x] Database TS types updated; typecheck passes; RLS verified anon pos+neg
- [x] Hotfix (59e5546): services/availability public-read RLS now tests the VIEW, not
  the profiles table (the old EXISTS-on-profiles ran as anon and was blocked by
  profiles' own owner-only RLS, so it never matched). Demo-mode profiles in
  hooks/useAuth.ts filled in for the new non-optional portal columns.
- **Gotcha for later phases:** apply migrations via the SESSION pooler (port 5432),
  NOT the transaction pooler (6543 in DATABASE_URL) — 6543 breaks the Supabase CLI's
  prepared statements ("prepared statement already exists"). Use
  `supabase db push --db-url "$(echo $DATABASE_URL | sed 's/:6543/:5432/')"`.

### Phase 1.75 — Public marketing landing page  _(Expo web, no schema change)_ ✅ DONE
- [x] Signed-out `/` renders marketing landing page; signed-in users still route
      to `/(tabs)`
- [x] CTA paths for login, provider signup, and client early access intent
- [x] Dual role modal with `provider | client` intent
- [x] Provider modal submission uses existing provider signup path
- [x] Client modal submission records local placeholder intent until client
      portal auth exists
- [x] Cookie consent banner with `Accept all` / `Reject optional`, persisted
      locally; no optional tracking added
- [x] Refactored landing into `components/landing/` and
      `hooks/useCookieConsent.ts`
- [x] Docs updated in `CORE_FEATURES.md`, `PLAN.md`, `DESIGN_SYSTEM.md`,
      `DEPLOYMENT.md`, and `LOG.md`
- [x] `npm run typecheck`, `npm run lint`, `npm run build:web`

### Phase 1.8 — Conversion onboarding and provider dashboard  _(Expo app + existing schema)_ 🔄 IN PROGRESS
- [x] Replace the old setup-chat route with a conversion diagnostic that ends
      in the dashboard.
- [x] Keep provider configuration in the main app: Profile, Channels, Agent
      Settings, Billing, and Settings.
- [x] Treat availability and booking fields as optional context. Do not make
      portal readiness the main path.
- [ ] Visual UAT in browser/device for mobile and desktop sizes.
- [ ] Add server-backed inference only after prompt/version logging,
      structured output validation, and provider approval are in place.
      validation, rate limiting, and deterministic fallback.

### Phase 2 — Agent runtime for messages  _(Edge Functions, still $0)_ 🔄 CODE-COMPLETE (needs deploy + live UAT)
- [x] Telegram webhook → Edge Function → message loop (keyword/FAQ pre-filter
      → LLM fallback) → DB write → reply/draft.
      `supabase/functions/telegram-webhook/` with shared pure logic in
      `_shared/agentLogic.ts` (FAQ pre-filter, intent, moderation, decision) and
      `_shared/telegramParser.ts`. LLM fallback (`_shared/llm.ts`, `claude-haiku-4-5`)
      is gated on `ANTHROPIC_API_KEY`; without it the runtime uses a deterministic
      holding reply. The free pre-filter runs first; the model is only hit on a miss.
- [x] Provider approval queue for outbound messages before autonomous send.
      Drafts land in `messages` with `approval_status='pending'`; the Inbox shows a
      **Needs your approval** section (Approve & send / Reject). `send-draft`
      Edge Function (JWT-verified) delivers approved drafts. Only confident FAQ
      matches under `approval_mode='auto_eligible'` auto-send; LLM/fallback drafts
      always wait for a human.
- [x] Promote `TelegramConnector` and message parsing helpers into the runtime
      (clean, tested `parseTelegramUpdate`; old dead `utils/channelConnectors.ts`
      superseded for Telegram).
- [x] Reconcile ThreadState casing — runtime uses DB lowercase states throughout
      (new modules avoid the uppercase `types/booking.ts` model entirely).
- [x] Schema: migration `20260530030000_agent_runtime.sql` — approval queue
      columns on `messages`, `agent_channels` (per-provider bot creds + webhook
      secret), `agent_events` (observability log). RLS owner-scoped; Edge Functions
      use the service role.
- [x] Channel onboarding via `scripts/connect-telegram.mjs` (validates the bot,
      stores creds, sets the Telegram webhook with a secret token).
- [x] **Local live UAT (2026-05-30/31):** Docker now available — ran the loop end
      to end on the local stack. Fixed a deploy-blocking Edge Function boot failure
      (esm.sh `storage-js` 404 → switched to the `npm:` supabase-js specifier).
      27/27 checks pass across both channels. Live UAT against the *hosted* project
      (deploy + real Telegram bot) still pending.
- [x] **Zero-setup web-chat channel:** extracted the loop into channel-agnostic
      `_shared/agent.ts` `runAgentTurn()` (one loop, injected `deliver()`
      transport). Added `webchat-inbound`/`webchat-poll` Edge Functions, made
      `send-draft` channel-aware, an embeddable `public/chat.html` widget (with AI
      disclosure), and `scripts/enable-webchat.mjs`. No new tables; migration
      `20260531000000` only widens the channel CHECK. Provider identified by public
      slug, visitor by an unguessable session id; held drafts never leak to the
      visitor before approval.
- [x] **Google Voice-over-Gmail channel wiring:** added `google-voice-webhook`,
      dependency-free Google Voice/Gmail parsing, Gmail OAuth/API transport,
      `send-draft` support for `gv`, channel metadata storage
      (`20260602000000_google_voice_channel_metadata.sql`), and
      `scripts/connect-google-voice.mjs` to register/renew Gmail `watch()`.
      This is code-wired but credential-gated: it still needs Pub/Sub setup,
      Gmail OAuth refresh token, deploy, and real delivery UAT.
- **Channel model:** **web chat = no provider setup** (the default activation
  surface); **Telegram = branded but one-time BotFather token** (Telegram has no
  programmatic bot creation); **Google Voice = Gmail-backed, credential-heavy,
  interactive messaging only**. Web chat + Telegram are self-serve in-app;
  WhatsApp + Google Voice stay script-first/assisted.
- [x] Channel-connect UI (Settings → Channels / dashboard "Manage"): one-tap web
      chat enable with shareable link + iframe embed snippet, paste-a-token
      Telegram connect (validates via getMe, registers the webhook), pause /
      resume / disconnect per channel, honest "assisted setup" cards for
      WhatsApp + Google Voice. Client writes its own `agent_channels` rows under
      the owner-scoped RLS policy and never SELECTs `bot_token`/`webhook_secret`.
- [x] Thread detail screen (`/(tabs)/thread?id=`): full transcript with
      direction/source/approval badges, inline approve/reject for pending
      drafts, and a **manual provider reply** composer that persists a pending
      outbound message and delivers it through the existing `send-draft`
      function (no new server surface; failed sends stay in the approval queue).
- [x] In-app attention signal: Inbox tab badge with the pending-draft count
      (30s poll) + a "needs your approval" card on the dashboard. Push/system
      notifications are still pending below.
- [x] Provider controls now persist: auto-send mode (`approval_mode`),
      moderation level, follow-up + notification preferences write to
      `provider_preferences`; FAQ rows can be toggled on/off; profile/slug
      editing in Settings → Profile & business (slug validated against the DB
      format).
- [ ] **Deploy + live UAT on hosted project:** apply migrations,
      `supabase functions deploy`, connect a bot/Gmail watch, message it, approve
      a draft.
- [ ] Push/system notifications for inbound messages needing provider attention
      (in-app badge exists; no push transport yet).

### Phase 3 — Customer portal  ⛔ GATED (marketplace fork — do NOT build by default)
> This phase **crosses the tool→marketplace line** (public listing + booking +
> payments = sales of services = marketplace = German/EU regulatory burden). It is
> kept here schema-ready to preserve optionality, but it ships **only** after an
> explicit decision to become a marketplace. The default roadmap goes
> Phase 2 → Phase 4. Do not pull this forward without that decision.
- [ ] Scaffold Next.js app (App Router) + shared Supabase client + shared types strategy
- [ ] Public provider page `/p/[slug]` (SSR/SEO): bio, services, availability
- [ ] Booking flow (no auth): pick slot → create tentative booking → confirmation
- [ ] Age-gate + AI-disclosure copy
- [ ] (Payments = the marketplace line itself — schema ready, build only post-decision)

### Phase 4 — Re-engagement + ads  _(consent-based only)_
- [ ] `pg_cron` job for past-client follow-ups (free)
- [ ] Ad post/refresh helper (mind platform ToS)

### Phase 5 — Launch  _(first real cost)_
- [ ] `supabase functions deploy` + set production env
- [ ] Point Telegram webhook at deployed function
- [ ] Deploy customer portal (Vercel) + provider app; set env vars; verify production

## Working agreement
- Plan first, then build. Check in at each phase boundary.
- Keep secrets server-side; never add `EXPO_PUBLIC_` to service keys.
