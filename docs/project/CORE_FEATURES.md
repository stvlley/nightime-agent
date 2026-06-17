# Nightime Agent — Core Features

> Forward-looking engineering spec. Describes the target feature set we are building
> toward, not current implementation status. For phase/status see `PLAN.md`; for
> repo conventions see `AGENTS.md`; for visual conventions see `DESIGN_SYSTEM.md`.

## Product in one line

A provider-controlled messaging assistant for **message providers**: it helps
handle inbound client conversations, answer common questions, preserve provider
boundaries, and route messages that need human attention. Booking and public
portal features remain planned, but v1 starts with the message workflow.

## Product positioning & strategy (locked)

**Nightime Agent is a communication tool, not a marketplace. Not the marketplace
first.** This is a product *and* legal/regulatory decision, and it gates the
roadmap below.

- **We are a tool.** We move and assist with messages on the provider's own
  channels under their rules. The provider and client transact however they
  already do — **off our platform**. We never take money for a service, never
  own the booking of record, and never publicly list a provider's services as
  our own surface.
- **No sales of services.** The moment money for a service flows through us, or
  we become the system that books/confirms/lists the service, we stop being a
  tool and become a **marketplace** that *intermediates the service*. As a pure
  communication tool with no sales of services, "we are a tool then we are fine."
- **Why this matters (Germany / EU):** going the marketplace way pulls in
  marketplace/intermediary regulation now — and the companion/massage vertical
  raises that exposure further (public listings, age-gating, processor ToS). A
  communication tool sidesteps that. We do not take on the marketplace
  regulatory burden unless and until we deliberately choose to.
- **The strategy:** launch the communication piece → get providers hooked across
  all the sites they already use → *then* choose a fork: **(a)** sell the tool to
  the companies / create a bidding war, or **(b)** add a marketplace (and accept
  the German/EU marketplace work that comes with it). Both forks are deliberate
  later decisions. **The default path is and remains the communication tool.**

### The marketplace line

Everything below is sorted by which side of the line it sits on. Tool-side work
is the active product. Marketplace-side work stays in the schema/roadmap so we
lose no optionality, but is **explicitly gated**: do **not** build it until we
make a conscious decision to become a marketplace.

| Side | Features | Build now? |
|---|---|---|
| **Tool** (active) | Provider app, conversion onboarding, inbox/approval, FAQ/automation, agent runtime on the provider's own channels, consent-based re-engagement, marketing landing page | Yes |
| **Marketplace** (gated) | Public customer portal `/p/[slug]`, booking flow that creates/confirms bookings, **payments** (prepay/deposit/checkout), multi-provider directory/discovery | No — only after an explicit "become a marketplace" decision |

Treat the public **portal**, the **booking flow**, and **payments** as the line.
They are kept schema-ready (§1.5/§3) for optionality, but they are not the
default next step and must not ship by default.

## Surfaces

| Surface | Stack | Audience | Role |
|---|---|---|---|
| **Marketing landing page** | Expo Router (this repo), web export to Vercel | Anonymous public, providers, booking clients | Product explanation, provider/client intent capture, early access CTAs, consent banner |
| **Provider app** | Expo Router (this repo), web export to Vercel | Authenticated provider | Control panel: dashboard, train message replies, watch conversations, manage automation, billing |
| **Customer portal** | Separate Next.js app (App Router), SSR | Anonymous public + booking client | Future discovery / "ad" surface + self-serve booking; payments-ready |
| **Agent runtime** | Supabase Edge Functions + `pg_cron` | Background (no UI) | Handles channel webhooks, applies message rules, drafts/sends replies |

All product surfaces share one Supabase project (auth, Postgres, RLS, storage).

The marketing landing page is distinct from the future customer portal
`/p/[slug]`. The landing page explains Nightime Agent and captures
provider/client intent; the first app workflow is for providers who live in
messages.

---

## 1. Marketing landing page (Expo, this repo)

### 1.1 Public home route
- Signed-out `/` renders a product landing page rather than redirecting straight
  to login.
- Signed-in providers still route to the authenticated provider dashboard.
- Navigation keeps direct access to existing provider login/register routes.
- CTAs support `Log in`, `Start as provider`, and `Continue as client`.

### 1.2 Content sections
- Hero: Nightime Agent promise, product preview, primary provider CTA, and client
  CTA.
- Role split: provider and client panels open the same signup modal with the
  selected role preloaded.
- How it works: connect channels, agent handles conversations, bookings land in
  calendar.
- Provider workflow: inbox, availability, calendar, saved replies, moderation.
- Client experience: public profile, services, availability, booking request,
  confirmation.
- Trust/privacy: discreet profiles, consent-based follow-ups, AI disclosure, and
  age-gate support.
- Early access/pricing: simple launch positioning; no complex billing
  integration on the landing page.
- FAQ and final CTA repeat the provider/client entry points.

### 1.3 Dual signup modal
- Role intent type: `provider | client`.
- Toggle switches between Provider and Client copy/fields.
- Provider fields: email, password, business/display name. Submission can use the
  current provider auth/register path.
- Client fields: email, password, name/handle. Until the client portal has
  account auth, submission is intent capture or a placeholder success state.
- No database schema change or Supabase role enforcement is required for this
  pass.

### 1.4 Cookie consent
- Landing page shows a simple bottom consent banner with `Accept all` and
  `Reject optional`.
- Store the local preference in AsyncStorage or equivalent local storage.
- Do not load optional tracking until tracking exists and consent is granted.
- GEO-aware consent behavior is deferred until analytics/ads or regional
  compliance requirements make it necessary.

### 1.5 Brand surface (night theme + owl mascot)
- The whole product runs on a deep-purple **night theme** sourced from
  `components/ui` `colors`. No light variant in this pass; an opt-in toggle is
  a tracked follow-up.
- **Owl mascot** (`components/landing/OwlMascot.tsx`) is the visual identity.
  Hero variant (~280px, with soft glow) on the hero; small bust (~36px, no
  glow) in the nav. Built as a single react-native-svg component so it works
  on web and native without a raster asset.
- **NightSky backdrop** (`components/landing/NightSky.tsx`) sits behind the hero
  and final CTA: a deterministically-seeded star field, a moon, and a few soft
  blurred clouds. On web with normal motion preferences, stars twinkle and
  clouds drift via CSS keyframes; on native or with `prefers-reduced-motion`,
  the layout renders static. The backdrop is decorative and aria-hidden.
- SEO meta (`<title>`, description, og:*, twitter:*, canonical) injected via
  `expo-router/head` from the landing component.
- `assets/images/icon.png` and `favicon.png` will be refreshed to match the owl
  mascot — tracked separately.

---

## 2. Provider app (Expo, this repo)

### 2.1 Authentication & conversion onboarding
- Email/password auth via Supabase (`hooks/useAuth.ts`), with AsyncStorage demo
  fallback when env vars are absent.
- First-run onboarding is the conversion diagnostic in
  `app/(onboarding)/onboarding.tsx`, ending in the provider dashboard rather
  than a second setup-chat flow.
- V1 remains message-provider-first: profile, channels, saved replies,
  moderation, approval mode, follow-up preference, and billing are edited from
  the main app screens after onboarding.
- Availability and booking details are optional context only. They should not
  dominate the first provider path.
- Profile maps to `profiles`; message/automation preferences map to
  `provider_preferences`; services and availability are saved only as relevant
  message context until portal work resumes.

### 2.2 Dashboard (`app/(tabs)/dashboard.tsx`)
- Live counts from Supabase: open threads, bookings today/week, agent reply
  count, conversion %, monthly usage vs `usage_limit`.
- AI insights card surfaces recent agent activity, top FAQ matches, missed-reply
  warnings.
- Quick links to inbox + calendar.

### 2.3 Inbox (`app/(tabs)/inbox.tsx`)
- List of `threads` ordered by `last_activity_at`, grouped by `state` (open,
  qualifying, offering, awaiting_client, tentative, confirmed, cancelled,
  abandoned). DB lowercase state vocabulary is the source of truth — reconcile
  `types/booking.ts` uppercase enum during runtime build.
- Thread detail: message stream (`messages` with `direction` in/out, `sender`,
  `ai_generated`, `ai_confidence`, `ai_label`).
- Provider can: take over (mute agent), send manual message, approve a queued
  outbound message, label/tag, mark abandoned.
- "Approve before send" mode for new providers; flips to autonomous once trust
  is established (`BookingAgentConfig.requireManualApproval`).
- V1 UAT should prove message triage and approval, not end-to-end public portal
  booking.

### 2.4 Calendar (`app/(tabs)/calendar.tsx`)
- Calendar is secondary in v1. It supports message providers who book from
  conversations, but setup and onboarding should not force every provider into a
  booking-first model.
- Read view of `bookings` (tentative / confirmed / cancelled) joined to
  `services` + `threads` (so each booking shows service name + client handle +
  channel).
- Block-out / exception editor → writes availability exceptions (per
  `types/booking.ts` `AvailabilityException`; needs a table — not yet in schema).
- Manual booking create (source = `manual`).
- Optional Google Calendar mirror via `calendar_event_id`.

### 2.5 AI training & settings (`app/(tabs)/ai-settings.tsx`)
- FAQ editor (`faq` table): trigger phrase + reply text + enabled toggle.
  Hits before LLM to keep token cost down.
- Agent persona: system prompt, voice/tone, hard guardrails (what the agent must
  never say), AI-disclosure copy.
- Booking policy: min notice, buffer minutes, max offered slots, allow same-day,
  cancellation policy, follow-up cadence.
- Content filter level (low / medium / strict) for inbound NSFW/abuse before
  classification.
- File upload card (`components/FileUploadCard.tsx`) feeds long-form training
  material (price lists, intake forms) into retrieval.

### 2.6 Channels
- Provider connects messaging channels in the app (Settings -> Channels, also
  reachable from the dashboard). Self-serve today: **web chat** (one tap;
  shareable link + iframe embed snippet) and **Telegram** (paste a BotFather
  token; the app validates it and registers the webhook). Channels can be
  paused, resumed, and disconnected in place. **WhatsApp** and **Google Voice**
  show as "assisted setup" -- they need Meta/Google Cloud credentials and stay
  script-first (`scripts/connect-whatsapp.mjs`,
  `scripts/connect-google-voice.mjs`). Operator scripts remain for support.
- Each channel = a webhook + credential bundle stored server-side (NOT
  `EXPO_PUBLIC_*`). Per-channel toggle for auto-reply + business-hours-only.
- Inbound webhook handlers live in the agent runtime (§4), not the client.

### 2.7 Billing (`app/(tabs)/billing.tsx`)
- Plan tier (`starter` / `pro` / `premium`) on `profiles.plan`.
- Monthly usage meter against `usage_limit` (agent replies + LLM calls).
- Upgrade / downgrade flow (payment integration deferred — see §3.4).

### 2.8 Settings (`app/(tabs)/settings.tsx`)
- Edit public portal fields → `profiles`.
- Toggle `published` (controls portal visibility via `public_provider_profiles`
  view).
- Toggle `age_gate_required`.
- Manage services (`services`) and weekly availability (`availability`).
- Timezone, notification preferences, FCM token registration
  (`utils/notifications.ts`).

### 2.9 Notifications
- Push (FCM) for: new inbound message needing approval, new booking, cancellation,
  agent error / channel disconnect.

---

## 3. Customer portal (separate Next.js app, GATED — marketplace fork)

> ⚠️ **This whole section is marketplace-side work (see "The marketplace line").**
> A public listing + booking + payments turns us from a communication tool into
> a marketplace that intermediates the service, with the German/EU regulatory
> burden that comes with it. **Do not build this until we explicitly decide to
> become a marketplace.** It stays documented and schema-ready only to preserve
> optionality for that later fork. The default path does not include it.

The portal is deferred until the message-provider loop is usable. Keep schema
and public profile work intact, but do not let portal readiness drive v1 setup
or UAT.

### 3.1 Public provider page `/p/[slug]`
- SSR for SEO and fast first paint (this is the "ad").
- Pulls from `public_provider_profiles` VIEW (column-subset projection — never
  reads `profiles` directly, so private columns stay private).
- Renders: display name, headline, bio, avatar, location, services (active rows
  of published providers, public-read RLS), weekly availability summary.

### 3.2 Booking flow (no auth)
- Pick service → see real availability (services × availability minus existing
  bookings, server-computed).
- Pick slot → enter client name + contact → create tentative `bookings` row
  (`source = 'portal'`, `status = 'tentative'`, no `thread_id`).
- Confirmation page + email/SMS confirmation (via agent runtime).
- Provider sees the portal booking in inbox/calendar same as agent bookings.

### 3.3 Age-gate + AI-disclosure
- Interstitial honoring `profiles.age_gate_required` before profile/booking is
  shown.
- AI-disclosure copy on any agent-driven channel handoff link from the portal.

### 3.4 Payments (GATED — this is the marketplace line itself)
- **Taking money for a service through us is the single brightest line between
  "tool" and "marketplace."** Activating payments = selling/intermediating the
  service = "sales of services" = we are a marketplace. Do **not** build this
  unless the marketplace decision has been made and the German/EU + processor-ToS
  work is explicitly accepted.
- Schema-ready only: `bookings` already carries `amount_cents`, `deposit_cents`,
  `currency`, `payment_status`, `payment_provider`, `payment_ref`. These columns
  are dormant; their presence does not change our positioning as long as no money
  for a service moves through the platform.
- Processor choice gated on ToS review for the vertical.
- Flows to design (only post-decision): full prepay, deposit hold, pay-on-arrival.

### 3.5 Multi-tenancy
- Schema is keyed by provider id throughout; portal routes are `/p/[slug]`.
- Discovery / directory page is **not** in scope yet — one provider at launch,
  schema avoids a later rewrite.

---

## 4. Agent runtime (Supabase Edge Functions)

### 4.1 Inbound pipeline
1. Channel webhook → Edge Function endpoint (one per channel).
2. Resolve / create `threads` row by `(channel, external_thread_id)`.
3. Insert inbound `messages` row (`direction = 'in'`).
4. Content filter → `filtered_text` (per provider's filter level).
5. **Free pre-filter:** keyword + FAQ table match. If hit, reply directly.
6. **LLM fallback:** Claude Haiku 4.5 (cheap workhorse) for intent classification
   + response generation. Token cost is the real launch cost driver.
7. Drive the state machine (§4.2), persist new `state`, append outbound
   `messages` row (`direction = 'out'`, `ai_generated = true`,
   `ai_confidence`, `ai_label`).
8. Send via the channel connector.

### 4.2 Booking state machine
- States (lowercase, DB-canonical): `open` → `qualifying` → `offering` →
  `awaiting_client` → `tentative` → `confirmed`. Side branches: `cancelled`,
  `abandoned`. The Phase 2 message runtime uses these lowercase DB states
  directly. The older uppercase `types/booking.ts` model should be retired or
  rewritten before booking/portal work resumes.
- `offering` writes a `TimeSlotOffer` (slots derived from `availability` minus
  existing `bookings` for the provider).
- `tentative` writes a `bookings` row with `source = 'ai'` and links
  `thread_id`.
- `confirmed` flips status and (optionally) creates the calendar event.

### 4.3 Outbound sending
- Outbound messages go through an approval queue when
  approval mode requires it (provider taps approve in inbox).
- Only confident, clean FAQ matches can auto-send under `auto_eligible`; LLM and
  deterministic fallback drafts stay pending for human approval. Delivery is
  channel-aware: Telegram uses the Bot API, web chat flips visibility in the DB,
  and Google Voice-over-Gmail replies through Gmail.

### 4.4 Re-engagement & follow-ups (`pg_cron`)
- Past-client follow-ups (consent-based only — no cold contact).
- No-show / abandoned-cart nudges.
- Post-booking review request.
- Cadence per `BookingAgentConfig.followUpSettings`.

### 4.5 Ad post / refresh helper (Phase 4)
- Helper to (re)post the portal link to the provider's ad surfaces.
- Mind per-platform ToS — out of scope for the agent itself.

### 4.6 Channel coverage
- Web chat is the zero-setup default surface: embeddable widget, provider
  resolved by public slug, pending drafts hidden until approved.
- Telegram is implemented and free per message, but requires a provider-created
  BotFather bot token.
- WhatsApp Cloud API is wired through Meta webhooks and Graph API delivery. It
  needs a Meta app, phone number id, access token, webhook verify token, and
  hosted live UAT.
- Google Voice-over-Gmail is code-wired through Gmail Pub/Sub/OAuth because
  Google Voice has no direct SMS API. It is credential-heavy and still needs
  hosted live UAT.
- SMS remains a later paid channel.

---

## 5. Cross-cutting

### 5.1 Data model (Supabase, single project)
- Provider-owned tables (owner-only RLS): `profiles`, `threads`, `messages`,
  `bookings`, `faq`.
- Public-read tables (RLS gated on **published** providers): `services`,
  `availability`. Public reads of provider profile go through the
  `public_provider_profiles` VIEW, never the `profiles` table.
- `Database` interface in `types/database.ts` is the source of truth for DB
  shape; `types/booking.ts` is the agent domain model (reconcile state casing
  during runtime build).

### 5.2 Authorization model
- Provider auth: Supabase Auth (email/password now; OAuth later).
- Portal: anonymous; reads only the public view + active services/availability
  for published providers; writes only tentative bookings.
- Agent runtime: service role inside Edge Functions; never shipped to client.

### 5.3 Secrets & deploy
- `EXPO_PUBLIC_*` only for non-sensitive values. `SUPABASE_SERVICE_ROLE_KEY` and
  `DATABASE_URL` stay server-side.
- Migrations applied via session pooler (port 5432), not transaction pooler
  (6543) — CLI prepared statements break on 6543.
- Provider app deploys as static web export to Vercel
  (`nightime-agent.vercel.app`). Portal deploys as separate Next.js project on
  Vercel Hobby. Edge Functions deploy via `supabase functions deploy`.

### 5.4 Cost posture
- $0 until launch for local/dev usage (Supabase free tier, Vercel Hobby,
  webchat, Telegram).
- At launch the cost drivers are LLM tokens (mitigated by FAQ/keyword
  pre-filter + Haiku) and per-message channel fees for paid transports such as
  WhatsApp/SMS. Web chat and Telegram avoid per-message channel fees.

### 5.5 Compliance constraints (named, not blockers)
- **Tool vs. marketplace is the primary compliance lever.** Staying a pure
  communication tool — no sales of services, no money for a service through us,
  no booking-of-record, no public service listing — is what keeps us out of
  marketplace/intermediary regulation (notably Germany/EU). Crossing into any of
  those makes us a marketplace and opts us into that regulatory burden. See
  "Product positioning & strategy" and "The marketplace line."
- Public listing of massage/companion services raises exposure: **age-gate**
  and processor **ToS** are real gates — and they only apply once we choose the
  marketplace fork (§3).
- Agent-as-provider raises an **AI-disclosure** obligation; copy must be
  decided before any channel goes live.
- No cold outreach — re-engagement is consent-only.

---

## 6. Explicit non-goals (for now)

- **Being a marketplace.** No sales of services, no money for a service through
  the platform, no booking-of-record, no public service listing — until a
  deliberate marketplace decision (and its German/EU regulatory work) is made.
- Public customer portal / booking flow / payments (§3) — gated behind that
  marketplace decision; schema-ready, not built.
- Multi-provider directory / discovery surface (schema is ready, UI is not).
- Native mobile builds — web export only until product-market fit.
- In-house payment processing UI — schema ready, processor TBD.
- A separate provider mobile app — Expo web doubles as the dashboard.
- Cold outbound prospecting on any channel.
