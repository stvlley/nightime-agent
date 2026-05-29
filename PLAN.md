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

## Decisions (locked in)

| Decision | Choice | Why |
|---|---|---|
| Backend compute | **Supabase Edge Functions** | Next to data+auth; free `pg_cron`; one free platform; deploy only at launch |
| Dev loop | **Local Supabase stack (needs Docker)** → fall back to remote (free) until Docker is set up | $0 |
| First channel | **Telegram** | Free API, no per-message fees, simple webhook |
| AI strategy | **Autonomous conversational agent** with **free keyword/FAQ pre-filter** + cheap model (Haiku 4.5) workhorse | Controls token cost; most messages avoid the LLM |
| Lead model | Inbound replies + re-engage past clients (consent-based) + post/manage ads. **No cold contact.** | Cold outreach = bans + legal exposure |
| Version control | git initialized; initial commit is the recovery point | rollback safety |

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

### Phase 1 — Wire UI to real data  _(remote Supabase, free; no Docker needed)_
- [ ] Replace mock arrays (inbox, dashboard stats, calendar) with live Supabase reads
- [ ] Make `ai-settings` FAQ editor persist to the `faq` table
- [ ] Converge screens onto canonical types; retire `types/index.ts`

### Phase 2 — Agent runtime  _(local-only via Docker/Supabase, still $0)_
- [ ] Set up Docker + local Supabase stack
- [ ] Telegram webhook → Edge Function → agent loop (keyword/FAQ pre-filter → LLM fallback) → DB write → reply
- [ ] Promote `BookingAgent` + `TelegramConnector` into the runtime (real, not mock slots)
- [ ] Reconcile ThreadState casing (DB lowercase = source of truth)

### Phase 3 — Re-engagement + ads  _(consent-based only)_
- [ ] `pg_cron` job for past-client follow-ups (free)
- [ ] Ad post/refresh helper (mind platform ToS)

### Phase 4 — Launch  _(first real cost)_
- [ ] `supabase functions deploy` + set production env
- [ ] Point Telegram webhook at deployed function
- [ ] Set Vercel env vars; verify production

## Working agreement
- Plan first, then build. Check in at each phase boundary.
- Keep secrets server-side; never add `EXPO_PUBLIC_` to service keys.
