# Nitime Design System

This is the durable UI contract for the Expo app. Public pages, onboarding,
auth, provider workflow screens, legal/support pages, and the public profile
should all feel like one warm paper operations product with muted purple brand
chrome.

## Principles

- Use reusable primitives from `components/ui` before adding local screen styles.
- Reference `colors` from `components/ui/index.tsx`; avoid local hex values
  except documented exceptions.
- Keep cards, controls, panels, and repeated rows at `8px` radius. True circles
  are allowed for radio dots, switches, avatars, and tiny status dots.
- Prefer quiet, scannable layouts over decorative card stacks.
- Use lucide icons for tab, button, and row affordances.
- Avoid one-off gradients, pure white panels, oversized pills, decorative blobs,
  heavy shadows, and nested cards.
- Text must fit on mobile and desktop without horizontal overflow.

## Tokens

Source of truth: `components/ui/index.tsx`.

| Token | Value | Use |
| --- | --- | --- |
| `background` | `#f6f0e6` | Page background |
| `surface` | `#fbf6ec` | Panels, cards, modal content, inputs |
| `surfaceMuted` / `neutralBg` | `#eee6d8` | Inset rows, icon wells, tracks |
| `border` | `#ddd2c0` | Default 1px borders |
| `borderStrong` | `#cfc1ad` | Emphasis and semantic borders |
| `text` | `#211b18` | Primary ink |
| `textSecondary` | `#675d55` | Body and metadata |
| `textMuted` | `#8c8175` | Placeholder and low-priority metadata |
| `primary` | `#7460d6` | Primary actions |
| `primaryActive` | `#5f4cbd` | Pressed/active primary |
| `accent` | `#8b76e6` | Secondary brand emphasis |
| `accentDim` | `#d7cdea` | Active tab backgrounds, soft brand borders |
| `success` / `successBg` | `#197a52` / `#e3f3e8` | Positive states |
| `warning` / `warningBg` | `#9a6115` / `#f4e5c8` | Pending/caution states |
| `danger` / `dangerBg` | `#b23b45` / `#f3d9db` | Error/destructive states |
| `info` / `infoBg` | `#346e9d` / `#dceaf1` | Informational states |
| `onPrimary` | `#ffffff` | Text/icons on primary buttons |

## Typography

The app uses system fonts only.

- Serif display stack from `fonts.display` is used for large primary text:
  landing heroes, section headlines, onboarding screen titles, page headers,
  legal/support titles, large stats, and other main headline numbers.
- Rounded sans stack from `fonts.rounded` is used for subtext, body copy,
  labels, controls, inputs, metadata, list rows, and explanatory text across
  landing, onboarding, auth, provider, and public profile surfaces.
- Do not scale font size with viewport width.
- Letter spacing is `0` by default. Use uppercase sparingly for compact metadata
  only when an existing landing style already does it.

## Components

Provider and public app screens should compose these primitives:

- `Screen`: safe-area page shell with warm paper background.
- `PageHeader`: compact title, subtitle, optional action.
- `Section`: grouped content with compact heading.
- `Surface`: bordered warm paper panel, max `8px` radius.
- `Button` / `IconButton`: primary, secondary, ghost, and danger commands.
- `Badge`: semantic compact labels.
- `Field`: labeled text input on paper surface.
- `ListRow` / `ToggleRow`: repeated operational rows.
- `ProgressBar`, `LoadingState`, `SkeletonBlock`: progress and loading states.

If a new pattern appears more than once, add or extend a shared primitive instead
of copying local card/button styles.

## Provider Chrome

The tab bar is paper chrome:

- Surface: `colors.surface`.
- Border: `colors.border`.
- Active state: muted purple using `colors.accentDim` and `colors.primaryActive`.
- Inactive state: `colors.textSecondary`.

Canonical tab icons:

| Tab | Icon |
| --- | --- |
| Dashboard | `LayoutDashboard` |
| Inbox | `Inbox` |
| Calendar | `CalendarDays` |
| Settings | `Settings2` |

Secondary routes stay reachable from Dashboard, Inbox, or Settings and should not
add extra visible tabs without a product decision.

## Auth And Onboarding

Auth/register, onboarding, and pricing use the same warm paper tokens as the
provider app. They may be more spacious, but should not use the old bright
purple/blue gradient surfaces or pure white floating cards.

Onboarding can keep subtle brand emphasis for primary CTAs, selected answers,
and the owl mascot. It should not introduce a separate visual theme.

## Landing Exceptions

The landing page may keep dark hero/footer sections, `NightSky`, and the owl
gradient as brand storytelling exceptions. All non-hero landing sections should
prefer warm paper surfaces and shared purple tokens.

The landing hero must not show the old `Private booking desk` kicker. The mockup
top bar must show `Tonight's request` without the old `Provider desk` label.

## Payment QR Exception

Payment QR codes intentionally render on pure white with black modules:
`backgroundColor="#ffffff"` and `color="#000000"`. This is an accessibility and
scanner reliability exception. Keep surrounding payment surfaces warm paper.

## Migration Checklist

- Import `colors`, `fonts`, and primitives from `components/ui`.
- Replace local page backgrounds with `colors.background`.
- Replace white panels with `colors.surface`, except QR code rendering.
- Replace local bright purples with `colors.primary`, `primaryActive`, `accent`,
  or `accentDim`.
- Keep radii at `8px` except true circles and switch controls.
- Use serif display type for large primary text and rounded system text for
  subtext, controls, inputs, metadata, and body copy.
- Preserve behavior, routing, auth, onboarding, subscriptions, Supabase calls,
  payment behavior, and copy structure unless a product task says otherwise.
- Run `npm run typecheck`, `SUPABASE_SERVICE_ROLE_KEY="" DATABASE_URL="" npm run lint`,
  `npm test`, and `npm run build:web` before shipping broad UI migrations.
