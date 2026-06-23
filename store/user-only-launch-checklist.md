# User-Only Launch Checklist

This is the short list of work that requires account ownership, credentials,
2FA, payment/admin access, DNS access, App Store Connect decisions, or a
physical iPhone. Repo-side checks and non-secret verification can be handled
without those credentials.

## DNS

Goal: make `https://nitime.app` and `https://www.nitime.app` serve the Vercel
production deployment for the `nightime-agent` project.

### 1. Confirm Vercel's Expected DNS Values

1. Log in to Vercel.
2. Open the `nightime-agent` project.
3. Go to Project Settings -> Domains.
4. Confirm both domains are attached:
   - `nitime.app`
   - `www.nitime.app`
5. Open each domain's details and copy the DNS records Vercel currently asks
   for. Use Vercel's exact values if they differ from the expected values below.

Expected standard Vercel records:

```text
A      @      76.76.21.21
CNAME  www    cname.vercel-dns-0.com
```

If Vercel specifically asks for `A www 76.76.21.21` instead of a `CNAME`,
follow the Vercel dashboard for this project.

### 2. Update Cloudflare DNS

1. Log in to Cloudflare.
2. Select the `nitime.app` zone.
3. Go to DNS -> Records.
4. Search for existing records with these names:
   - `@`
   - `nitime.app`
   - `www`
   - `www.nitime.app`
5. Do not delete mail or ownership records such as `MX`, `TXT`, `CAA`, `DKIM`,
   or `DMARC` unless you know they are wrong.
6. Remove or replace conflicting website records for `@` and `www`, especially
   old `A`, `AAAA`, or `CNAME` records that point somewhere other than Vercel.
7. Add or edit the apex record:
   - Type: `A`
   - Name: `@`
   - IPv4 address: `76.76.21.21`
   - Proxy status: `DNS only` / gray cloud while Vercel is validating the domain
   - TTL: `Auto`
8. Add or edit the `www` record:
   - Type: `CNAME`
   - Name: `www`
   - Target: `cname.vercel-dns-0.com` unless Vercel shows a different value
   - Proxy status: `DNS only` / gray cloud while Vercel is validating the domain
   - TTL: `Auto`
9. Save both records.

Keep Cloudflare proxying off until Vercel shows the domains as valid and SSL is
issued. After launch, Cloudflare can remain `DNS only`; do not turn on the
orange-cloud proxy unless you are ready to debug Cloudflare/Vercel SSL mode,
redirects, caching, and App Review URL behavior.

### 3. Verify DNS And SSL

1. Wait 5 to 15 minutes after saving Cloudflare DNS. Some resolvers can take
   longer.
2. In Vercel Project Settings -> Domains, refresh both domains until each one
   shows a valid configuration.
3. Confirm Vercel has issued SSL for both hostnames.
4. From a terminal, these should eventually return Vercel values:

```sh
dig +short A nitime.app
dig +short CNAME www.nitime.app
```

5. Open these URLs in a private browser window:
   - `https://nitime.app/`
   - `https://nitime.app/privacy`
   - `https://nitime.app/terms`
   - `https://nitime.app/support`
   - `https://www.nitime.app/`

The App Store submission should not use the final domain until the privacy,
terms, and support URLs load over HTTPS without browser certificate warnings.

Reference docs:

- Vercel custom domain setup:
  `https://vercel.com/docs/domains/set-up-custom-domain`
- Cloudflare DNS record management:
  `https://developers.cloudflare.com/dns/manage-dns-records/how-to/create-dns-records/`

## App Store Connect App Record

Create the app record manually in App Store Connect:

1. Log in to App Store Connect as the account owner or an admin with app
   creation permission.
2. Go to My Apps.
3. Select the plus button and choose New App.
4. Fill in:
   - Platform: iOS
   - Name: `Nitime`
   - Bundle ID: `com.nightime.agent`
   - SKU: `nitime-agent-ios`
   - Primary language: English
5. Save the app.
6. Confirm the app's bundle ID exactly matches `com.nightime.agent`; do not
   create a second bundle ID with a spelling variant.

The App Store Connect API key can read current state, but a prior `POST /apps`
attempt returned `403`, so this app record likely needs to be created manually
by an account owner.

## StoreKit Subscriptions

Create one auto-renewable subscription group:

1. In App Store Connect, open the `Nitime` app.
2. Go to Features -> Subscriptions.
3. Create subscription group `Nitime`.
4. Add annual subscription:
   - Product ID: `nitime_annual`
   - Reference name: `Nitime Annual`
   - Display name: `Nitime Annual`
   - Price: `$299/year`
   - Intro offer: 7-day free trial
5. Add monthly subscription:
   - Product ID: `nitime_monthly`
   - Reference name: `Nitime Monthly`
   - Display name: `Nitime Monthly`
   - Price: `$39/month`
   - Intro offer: none
6. Add required localization for both products.
7. Add subscription review screenshots for both products.
8. Add review notes that describe what the subscription unlocks.
9. Mark both products Ready to Submit before App Review.

The product IDs must match the app code and RevenueCat configuration exactly:
`nitime_annual` and `nitime_monthly`.

## EAS Credentials And Build

Run the production iOS build interactively from this repo:

```sh
EAS_BUILD_NO_EXPO_GO_WARNING=true npx eas-cli build --profile production --platform ios
```

Owner steps during the interactive build:

1. Confirm the selected Apple team is the team that owns
   `com.nightime.agent`.
2. Complete Apple login and 2FA if prompted.
3. Allow EAS to create or reuse the iOS distribution certificate.
4. Allow EAS to create or reuse the provisioning profile.
5. Wait for the build to finish and save the EAS build URL.

Apple credentials and 2FA codes should not be shared in git or chat.

## Build-Number Drift

Keep EAS remote versioning enabled. This repo already has:

- `eas.json` `cli.appVersionSource="remote"`
- production `autoIncrement=true`

Repeated failed or aborted EAS attempts can increment the remote iOS build
number. Last observed drift was around build number `9`. Treat this as cosmetic
unless App Store Connect rejects a duplicate build number.

Only if App Store Connect rejects a duplicate build number, run:

```sh
npx eas-cli build:version:set
```

Choose iOS, keep the remote version source, and set the remote build number to
the highest iOS build number already accepted in App Store Connect for version
`1.0.0`. Then rebuild once.

## Reviewer And Sandbox Accounts

1. Make sure `reviewer@nitime.app` exists.
2. Set or confirm its production password.
3. Store the password only in the ignored reviewer env file or App Store
   Connect review notes. Do not commit it.
4. Verify from a clean browser or device that the reviewer account can log in.
5. Confirm the reviewer account reaches the expected paywall or provider
   workspace state.
6. In App Store Connect, create a sandbox tester with a real inbox you control.
7. Do not reuse a personal Apple ID as the sandbox tester.
8. Confirm the sandbox tester can sign in on the physical iPhone before running
   StoreKit smoke tests.

## Physical iPhone StoreKit Smoke

1. Install the EAS/TestFlight build on a physical iPhone.
2. Sign out of personal sandbox purchase state if needed.
3. Launch the app and sign in as the reviewer or test provider account.
4. Open the paywall.
5. Confirm annual and monthly products load with the expected prices.
6. Start the annual trial with the sandbox tester.
7. Confirm entitlement opens the provider workspace.
8. Kill and reopen the app.
9. Confirm entitlement persists.
10. Delete and reinstall the app.
11. Sign in again and test Restore Purchase.
12. Test cancellation and expiration behavior in Apple sandbox.

## Submission Metadata

Use `store/app-store-listing.md`, `store/privacy-policy.md`,
`store/terms-of-service.md`, and `store/submission-runbook.md` as source copy.

In App Store Connect, complete:

1. App name, subtitle, promotional text, description, keywords, support URL,
   marketing URL, privacy policy URL, and copyright.
2. Privacy answers.
3. Age rating.
4. Export compliance.
5. Screenshots for required device sizes.
6. Subscription screenshots.
7. Review notes.
8. Demo/reviewer credentials.

Use these final URLs only after the Cloudflare DNS section passes:

- Marketing URL: `https://nitime.app/`
- Privacy Policy URL: `https://nitime.app/privacy`
- Support URL: `https://nitime.app/support`
- Terms URL: `https://nitime.app/terms`

Review notes should explain:

- AI-assisted replies are drafts or provider-controlled FAQ replies.
- Providers can require approval before outbound messages are sent.
- Nitime does not process provider/client service payments.

## Submit

Once the iOS build succeeds and physical-device StoreKit smoke passes:

```sh
npx eas-cli submit --profile production --platform ios --latest
```

Attach the uploaded binary and both IAPs in App Store Connect before submitting
for review.
