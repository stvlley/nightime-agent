# Repository Guidelines

## Project Structure & Module Organization

This is an Expo Router TypeScript app. Route files live in `app/`, with grouped flows under `app/(auth)`, `app/(onboarding)`, and `app/(tabs)`. Shared UI belongs in `components/`, reusable hooks in `hooks/`, service and domain helpers in `utils/`, Supabase client setup in `lib/`, and shared TypeScript models in `types/`. Static web/PWA files are in `public/`, app images are in `assets/images/`, and database schema changes are tracked in `supabase/migrations/`.

## Build, Test, and Development Commands

Install dependencies with `npm install`.

- `npm run dev`: starts the Expo development server with telemetry disabled.
- `npm run build:web`: exports the app for web using Expo.
- `npm run lint`: runs Expo lint checks for the project.

Use Expo's generated QR/device options from the dev server when validating native behavior.

## Coding Style & Naming Conventions

Write TypeScript and TSX with strict typing enabled. Follow `.prettierrc`: 2-space indentation, spaces instead of tabs, single quotes, and bracket spacing. Prefer functional React components and hooks. Name components in PascalCase, for example `StatusBadge.tsx`; name hooks with a `use` prefix, for example `useAuth.ts`; keep utility modules camelCase, for example `bookingAgent.ts`. Use the `@/*` path alias for root-relative imports when it improves readability.

## Testing Guidelines

No test runner or test script is currently configured. Before merging behavior-heavy changes, at minimum run `npm run lint` and manually exercise the affected Expo route or workflow. If tests are added, place them near the feature as `*.test.ts` or `*.test.tsx`, and add a matching `npm test` script so contributors have a single command.

## Commit & Pull Request Guidelines

This checkout does not include Git history, so use short imperative commit messages such as `Add auth loading state` or `Fix booking parser edge case`. Keep each commit focused on one logical change. Pull requests should include a concise summary, validation steps such as `npm run lint` or manual Expo checks, linked issues when applicable, and screenshots or screen recordings for UI changes.

## Security & Configuration Tips

Keep secrets in `.env` and never commit credentials. Review `lib/supabase.ts` and `supabase/migrations/` together when changing database access patterns. Public assets in `public/` and `assets/` may be shipped to clients, so do not place private configuration or sample customer data there.
