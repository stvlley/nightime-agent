# Nightime Agent Design System

This document is the durable UI contract for provider and client work. New UI
should feel like a quiet operations product at night: discreet, readable,
restrained, and built for repeated daily work.

The brand is a **night theme** (deep purple sky, owl mascot). The provider app,
landing page, and future customer portal all share the same token table. There
is no light variant in this pass — opt-in light mode is a follow-up.

## Principles

- Build real workflows first. Marketing pages are allowed only for public entry
  points and should stay separate from provider workflow screens.
- Prefer dense, scannable layouts over decorative card stacks.
- Use reusable primitives from `components/ui` before adding local styles.
- Always reference tokens from `components/ui` `colors` — never hard-code hex in
  screens or component styles. Lucide icons take `color={colors.X}`.
- Use lucide icons for icon buttons and row affordances.
- Keep cards at `8px` radius or less. Do not nest cards inside cards.
- Avoid gradients (except as documented for mascot/hero glow), large shadows,
  decorative blobs, bokeh, oversized pills, and synthetic SaaS marketing copy.
- Decorative animation (twinkling stars, drifting clouds) is allowed **only**
  on the marketing landing page, gated by `useCanAnimate()` (web + no reduced
  motion).

## Tokens (night palette)

Source of truth: `components/ui/index.tsx` `colors`.

- Background: `#0d0a26` (deep indigo)
- Surface: `#1a1340` (raised purple)
- Surface muted: `#221955`
- Border: `#2e2466`
- Border strong: `#3d2f80`
- Text primary: `#f4f1ff`
- Text secondary: `#b8aee0`
- Text muted: `#8478b0`
- Primary action: `#9d7bff` (luminous violet)
- Primary pressed/active: `#7e5cf0`
- On-primary (text/icons on primary): `#0d0a26`
- Accent (mascot, stars, eyebrow text): `#c9b5ff`
- Accent dim (cloud strokes, secondary chrome): `#5d4d8c`
- Star glow (rgba for box-shadow): `rgba(201, 181, 255, 0.7)`
- Success: `#5ae0a3` on `#1d3a30`
- Warning: `#ffc278` on `#3a2a14`
- Danger: `#ff7884` on `#3a1620`
- Info: `#7ac0ff` on `#172a44`

Use system fonts. Do not scale font sizes with viewport width. Letter spacing is
normally `0`; use uppercase sparingly for compact metadata (eyebrows, tags).

### Contrast notes
- Primary `#9d7bff` on background → ~7.1:1 (AAA)
- Text secondary `#b8aee0` on background → ~9.3:1 (AAA)
- Verify any new accent surface against the background before shipping.

## Components

Provider screens should compose these primitives from `components/ui`:

- `Screen`: safe-area page shell with optional scroll.
- `PageHeader`: title, subtitle, optional action.
- `Section`: grouped content with a compact heading.
- `Surface`: bordered white surface, max `8px` radius.
- `Button` and `IconButton`: command surfaces with semantic variants.
- `Badge`: compact status labels with semantic tones.
- `Field`: labeled input wrapper.
- `EmptyState`: compact no-data/loading fallback.
- `StatBlock`: metric display.
- `ListRow`: row layout for inbox/settings/actions.
- `ToggleRow`: labeled row for switches.
- `ProgressBar`: usage and confidence indicators.

If a screen needs a new pattern twice, add it to `components/ui` instead of
copying local `StyleSheet` card/button styles.

## Provider UI Rules

- Headers should state the operational area: `Dashboard`, `Inbox`, `Calendar`,
  `Agent Settings`, `Training`, `Plan & Billing`, `Settings`.
- Use rows for repeated data: conversations, appointments, settings, plans.
- Empty states should tell the provider what is missing, not advertise.
- Use status badges for state, not color-only indicators.
- Keep controls visible and predictable. Avoid hidden gestures and decorative
  controls.
- Provider-facing branding is `Nightime Agent`.

## Bottom Tab Bar

The provider tab bar (`app/(tabs)/_layout.tsx`) is night chrome, not a light
surface. Pull every value from `colors` — never hard-code hex here either.

- Surface: `colors.surface`; top border: `colors.border` (1px).
- Active tint: `colors.primary`; inactive tint: `colors.textMuted`.

Use a single, consistent lucide set for the tabs. Prefer the modern variants
(`*Days`, `*2`, dashboard/cloud glyphs) over the legacy template defaults — do
not reintroduce the `Chrome as Home` placeholder. Canonical mapping:

| Tab         | Icon              |
| ----------- | ----------------- |
| Home        | `LayoutDashboard` |
| Inbox       | `Inbox`           |
| Calendar    | `CalendarDays`    |
| AI Settings | `Sparkles`        |
| Upload      | `CloudUpload`     |
| Billing     | `Wallet`          |
| Settings    | `Settings2`       |

## Client Portal Alignment

The client portal can use the same tokens and tone, but it may be warmer and
more spacious because it is client-facing. It should still avoid gradients,
over-rounded cards, fake testimonials, and generic marketing filler. Portal
surfaces should align with provider tokens so both experiences feel connected.

## Mascot

The brand mascot is an **owl** rendered as `components/landing/OwlMascot.tsx`
(react-native-svg, works on web + native). Use only the provided component; do
not reproduce the owl in raster form unless explicitly producing the favicon or
OG image.

- Hero variant: `size={280}` with `glow` enabled (default).
- Nav/bust variant: `size={36}`, `glow={false}`.
- Eye iris uses `accent`; body uses a `primary → primaryActive` linear gradient.
- The owl is decorative; wrap usages in `accessibilityElementsHidden` when paired
  with text that already conveys the brand.

## NightSky Backdrop

`components/landing/NightSky.tsx` is the deterministic star/cloud/moon backdrop
used behind the hero and final CTA sections.

- Always render with `pointerEvents="none"` (the component sets this).
- Positions are seeded so SSR and client render identically — do not pass
  random seeds at render time.
- Stars twinkle and clouds drift on web only, and only when the user has not set
  `prefers-reduced-motion`. Native renders the same layout, statically.
- Do not use this backdrop on provider workflow screens — the night chrome is
  enough; the animated sky is reserved for marketing.

## Marketing Landing Page

The Expo app owns the signed-out marketing home route (`/`). Keep this surface
distinct from both the authenticated provider app and the future customer portal
(`/p/[slug]`).

- Keep `app/index.tsx` thin; compose landing UI from `components/landing`.
- Keep copy/data in `components/landing/content.ts`.
- Keep landing-only types in `components/landing/types.ts`.
- Keep consent persistence in `hooks/useCookieConsent.ts`.
- Use the same tokens, mascot, and `8px` radius rules as the provider app.
- The hero and final CTA use the `NightSky` backdrop; other sections sit on
  plain `surface` or `background` so the page has a clear rhythm.
- Do not add analytics or optional tracking until consent behavior is wired to a
  real tracking implementation.
- Do not put provider portal booking UX into the marketing landing page; that
  belongs to the separate Next.js customer portal.

## Migration Checklist

- Import from `components/ui`.
- For marketing landing changes, prefer `components/landing` composition and
  shared landing styles over growing `app/index.tsx`.
- Remove local card/header/button shadows unless there is a clear product need.
- Replace gradients with neutral surfaces and semantic accents (the owl gradient
  and the hero glow are the only sanctioned exceptions).
- Replace any remaining hard-coded hex literals with `colors.X` from
  `components/ui`. As of the night-theme rollout, the auth screens
  (`app/(auth)/*`) and onboarding screens (`app/(onboarding)/*`) still carry
  local hex literals and will look mismatched until they are migrated; this is
  tracked as a follow-up and intentionally deferred.
- Replace old `TherapyBot AI` references with `Nightime Agent`.
- Check mobile and desktop widths for clipped text and overlapping controls.
- Run `npm run typecheck`, `npm run lint`, and `npm run build:web`.
