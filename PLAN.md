# Nightime Agent — Implementation Plan

> Living document. Goal: take the implementation forward from a static demo to a
> working AI booking agent, at **$0 cost until launch**.

## What the app is

An **autonomous AI booking agent that acts as the service provider** (independent
massage / companion services). It connects the provider's messaging channels,
holds natural conversations with clients, qualifies them, offers time slots, and
books appointments — so the provider doesn't have to reply manually.

## Current state (discovery)

- **Stack:** Bolt-generated Expo Router app (React 19, RN 0.81, Expo SDK 54),
  TypeScript. Deployed as a **static web export** to Vercel (`nightime-agent.vercel.app`).
  Typecheck passes; build is healthy.
- **Wired & working:** Supabase auth only (login/register via `useAuth`). Real
  Supabase project `hwcpztsltgpjzclrmyez` with schema applied (`profiles`,
  `threads`, `messages`, `bookings`, `faq`) + RLS. Demo fallback to AsyncStorage
  when env vars are absent.
- **Dead code / skeleton (well-designed, never executed):** `utils/bookingAgent.ts`
  (state machine), `utils/channelConnectors.ts` (GV/WhatsApp/Telegram/Email),
  `utils/aiTraining.ts`, `utils/webhooks.ts`, `utils/api.ts`. **Not imported by any
  screen.** Agent internals are regex/keyword stubs returning mock slots.
- **UI is mostly hardcoded mock arrays** — inbox conversations, dashboard stats,
  calendar, FAQ list are literals inside the components.
- **No server tier exists.** Connectors POST to `/api/...` and `EXPO_PUBLIC_*_WEBHOOK_URL`
  endpoints that don't exist. AI inference, inbound webhooks, calendar, outbound
  sending have nowhere to run.
- **Secret hygiene OK:** `SUPABASE_SERVICE_ROLE_KEY` and `DATABASE_URL` are NOT
  `EXPO_PUBLIC_`-prefixed (won't bundle into client). `.env` is gitignored.

## Key inconsistencies to resolve

- Identity: `package.json` name `bolt-expo-starter`, `app.json` name/slug
  `bolt-expo-nativewind`, Vercel project `nightime-agent`.
- Three overlapping type files: `types/database.ts` (LIVE, source of truth for DB),
  `types/booking.ts` (agent domain model — uppercase `ThreadState`), `types/index.ts`
  (DEAD — unused; screens redefine types inline). DB states are lowercase vs
  booking.ts uppercase — reconcile when building the runtime.
- `app/_layout.tsx` contains an unused duplicate interface block.

## Product shape

Two-sided product on one shared Supabase backend:
1. **Provider app** (this Expo app) — authenticated control panel: dashboard, inbox,
   calendar, ai-settings, billing, settings. Everything built so far is provider-facing.
2. **Customer portal** (NEW, separate Next.js app) — public profile + availability +
   booking; also the discovery/"ad" surface. Payments-ready, multi-tenant-ready.
3. **Agent runtime** (Supabase Edge Functions, Phase 2) — talks to customers in their
   own messaging app (Telegram/WhatsApp/email), posing as the provider.

The customer interacts via TWO surfaces: the conversational channel (agent) AND the
public web portal. Both read/write the same Supabase data.

## Decisions (locked in)

| Decision | Choice | Why |
|---|---|---|
| Backend compute | **Supabase Edge Functions** | Next to data+auth; free `pg_cron`; one free platform; deploy only at launch |
| Dev loop | **Local Supabase stack (needs Docker)** → fall back to remote (free) until Docker is set up | $0 |
| First channel | **Telegram** | Free API, no per-message fees, simple webhook |
| AI strategy | **Autonomous conversational agent** with **free keyword/FAQ pre-filter** + cheap model (Haiku 4.5) workhorse | Controls token cost; most messages avoid the LLM |
| Lead model | Inbound replies + re-engage past clients (consent-based) + post/manage ads. **No cold contact.** | Cold outreach = bans + legal exposure |
| Customer surface | **Full public customer web portal** + conversational channel | User decision; portal doubles as the ad |
| Customer portal stack | **Separate Next.js app** sharing Supabase (NOT public routes in Expo app) | Portal is the "ad" → needs SSR/SEO, fast first paint, payments UX; Expo-web SPA is weak at all three. Provider app stays Expo (authed dashboard, SEO irrelevant) |
| Tenancy | **Single provider now, multi-tenant-ready schema/routes** | User decision; avoid a later rewrite without building discovery/multi-signup yet |
| Payments | **Decide later** — schema allows a payment/deposit record; no checkout built this pass | User decision; processor ToS for the vertical is a real gating constraint |
| Version control | git initialized; initial commit is the recovery point | rollback safety |

## Risk / compliance constraints (named, not blockers)

- A **public** portal for massage/companion services raises exposure the private
  provider app did not: public listing content, **age-gating**, and host/processor
  **ToS restrictions** on adult/companion services (many payment processors ban it).
- Agent posing as the provider → **AI-disclosure** question (clients may not know
  they're talking to a bot) + anti-spam law for any outbound.
- Decide age-gate + disclosure copy before the portal/agent go live.

## Cost model

- Functions: **$0** pre-launch (Supabase free tier ~500K invocations/mo).
- Real cost drivers at launch: **AI tokens** (controllable via pre-filter + cheap
  model) and **per-message channel fees** (Telegram = free; WhatsApp/SMS = paid).
- DB: Supabase free tier (500MB, 50K MAU) fine pre-launch.

## Phased plan

### Phase 0 — Foundation & cleanup  _(no infra, no cost)_
- [x] git init + recovery-point commit
- [ ] Remove dead duplicate interface block from `app/_layout.tsx`
- [ ] Fix identity naming (package.json + app.json → `nightime-agent`)
- [ ] Note type-convergence plan (database.ts + booking.ts canonical; retire index.ts in Phase 1)

### Phase 1 — Wire provider UI to real data  _(remote Supabase, free; no Docker)_
- [x] Replace mock arrays (inbox, dashboard stats, calendar) with live Supabase reads (commit 103f041)
- [x] Fix global-gitignore excluding `lib/` (lib/supabase.ts had never been committed)
- [ ] Make `ai-settings` FAQ editor persist to the `faq` table (faqService ready)
- [ ] Converge screens onto canonical types; retire `types/index.ts`

### Phase 1.5 — Schema for portal + tenancy  _(remote Supabase, free)_
- [ ] Add provider/profile public fields: slug, display name, bio, services+prices,
      published flag, (optional) age-gate ack
- [ ] Public-read RLS for PUBLISHED profiles only; keep all else private
- [ ] Booking table: allow a nullable payment/deposit record (no checkout yet)
- [ ] Multi-tenant-ready: everything keyed by provider id; single provider seeded now

### Phase 2 — Customer portal  _(new Next.js app, shares Supabase; $0 on Vercel Hobby)_
- [ ] Scaffold Next.js app (App Router) + shared Supabase client + shared types strategy
- [ ] Public provider page `/p/[slug]` (SSR/SEO): bio, services, availability
- [ ] Booking flow (no auth): pick slot → create tentative booking → confirmation
- [ ] Age-gate + AI-disclosure copy
- [ ] (Payments deferred — schema ready)

### Phase 3 — Agent runtime  _(local-only via Docker/Supabase, still $0)_
- [ ] Set up Docker + local Supabase stack
- [ ] Telegram webhook → Edge Function → agent loop (keyword/FAQ pre-filter → LLM fallback) → DB write → reply
- [ ] Promote `BookingAgent` + `TelegramConnector` into the runtime (real, not mock slots)
- [ ] Reconcile ThreadState casing (DB lowercase = source of truth)
- [ ] Agent can send the portal booking/confirm link in-chat

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
