# Handoff

## Current Goal

Get the iOS production build queued through EAS, then submit it to TestFlight/App Store Connect.

## Current State

- EAS account is logged in as `stvll3y`.
- EAS project is linked: `@stvll3y/nightime-agent`.
- Project ID: `0dbf9154-990b-4df3-88f5-ea145b963a13`.
- App Store readiness audit passes: `30 passed, 0 warnings, 0 failures`.
- `.env` was repaired and is ignored by git. Do not print secret values.
- `EXPO_PUBLIC_SUPABASE_URL` was restored from EAS production env.
- App Store Connect API auth now works for reads.
- The custom `scripts/asc-storekit.mjs setup` path cannot create the app record because Apple rejects `POST /apps` with `403`.
- Glowscore used the simple EAS path: build, then submit. In this checkout use
  `npx eas-cli`, not `npx eas` or a global `eas` binary.

## Blocker

EAS iOS credentials are still not fully validated for non-interactive builds.

Last non-interactive failure:

```text
Distribution Certificate is not validated for non-interactive builds.
Failed to set up credentials.
Credentials are not set up. Run this command again in interactive mode.
```

Interactive build reaches:

```text
Do you want to log in to your Apple account? (Y/n)
```

The next session should not enter Apple credentials for the user. Ask the user to complete Apple login/2FA locally if the prompt appears.

## Build Number Note

Repeated failed/aborted EAS build attempts incremented remote iOS build numbers. Last observed increment was `8 -> 9`.

## Next Commands

Run this first:

```sh
cd /home/testuser/workspace/repos/nightime-agent
EAS_BUILD_NO_EXPO_GO_WARNING=true npx eas-cli build --profile production --platform ios
```

If it asks for Apple login/2FA, the user must complete it interactively and continue until the build is queued.

After the build is queued/completed:

```sh
npx eas-cli submit --profile production --platform ios --latest
```

## Useful Checks

```sh
node --env-file=.env scripts/app-store-readiness-audit.mjs
npx eas-cli whoami
npx eas-cli project:info
npx eas-cli build:list --platform ios --limit 5
```

## Files Touched This Session

- `.env` repaired locally; ignored by git.
- `docs/project/HANDOFF.md` added for this handoff.
