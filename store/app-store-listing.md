# App Store Listing

## Metadata

- App name: Nitime
- Name count: 14 / 30
- Subtitle: AI inbox for providers
- Subtitle count: 22 / 30
- Category: Business
- Secondary category: Productivity
- Keywords: inbox,assistant,booking,telegram,whatsapp,webchat,client,messages,automation,provider
- Keywords count: 84 / 100
- Promotional text: Turn late client messages into organized drafts, approvals, and follow-ups across the channels you already use.
- Promotional text count: 113 / 170

## Description

Nitime helps independent providers manage client messages without turning their work into a public marketplace.

Connect your workspace, review incoming conversations, approve AI-assisted draft replies, and keep common questions consistent across web chat, Telegram, WhatsApp, Google Voice-over-Gmail, and email-supported workflows.

Use Nitime to:

- See client conversations in one provider inbox.
- Review pending replies before they are sent.
- Save FAQ answers for pricing, availability, location, expectations, and policies.
- Set a cautious approval mode so sensitive messages stay in your hands.
- Share a web chat link for clients who do not use your main messaging channel.
- Show direct payment links or QR codes for your own payment accounts.
- Import selected conversation files to generate better FAQ and reply suggestions.

Nitime does not process client service payments, does not provide medical advice, and does not guarantee bookings or revenue. Providers stay responsible for approving replies, setting policies, and managing their own client relationships.

## What's New

Initial App Store release.

## Review Notes

Nitime is a provider-side messaging and workflow tool. It is not a medical, diagnostic, therapy, marketplace, escort, or payment-processing app.

AI-assisted replies are drafts or controlled FAQ replies. Providers can require approval before outbound messages are sent. The app includes disclosure and moderation controls for provider-owned channels.

Direct payment links only display the provider's own PayPal, Venmo, Cash App, or Zelle details. Nitime does not collect service payments, route client money, escrow funds, or charge clients for provider services.

Some public provider profiles may show an age confirmation screen before revealing the profile and web chat entry point. This is a provider-controlled safety gate, not an adult-content marketplace.

If reviewer access is needed:

- Demo account: <reviewer-email>
- Demo password: <reviewer-password>
- Production Supabase project: confirm configured before submission
- StoreKit sandbox products: confirm `nitime_annual` and `nitime_monthly` are Ready to Submit

## App Privacy Answers

Use these as the starting point for App Store Connect's App Privacy nutrition label. Confirm against the final production build and hosted services before submission.

### Data Collected

- Contact Info: email address, provider business/display name.
- User Content: client messages, provider replies, FAQ answers, public profile fields, uploaded conversation files selected by the user.
- Identifiers: Supabase user ID, channel IDs, transaction IDs, public profile handle.
- Purchases: subscription product ID, transaction ID, entitlement status, renewal/expiration metadata when available.
- Usage Data: message counts, approval status, channel connection state, onboarding answers, landing intent submissions.

### Data Not Collected By Nitime

- Precise location.
- Contacts address book.
- Photos or camera data.
- Health data.
- Financial account credentials.
- Client service-payment card data.

### Data Use

- App Functionality: account access, provider inbox, chat routing, FAQ suggestions, subscription entitlement, public profile display.
- Analytics / Product Improvement: only if optional analytics are enabled after consent.
- Customer Support: troubleshooting account, subscription, and channel setup issues.

### Data Linked To User

Email, provider profile fields, subscription entitlement, messages, uploaded conversation files, FAQ entries, connected channel metadata, and public profile handle are linked to the signed-in provider account.

### Tracking

Do not declare tracking unless third-party advertising attribution or cross-app tracking is added. Current app code does not include an ad SDK.

## In-App Purchases

- `nitime_annual`: Nitime Annual, $299/year, 7-day free trial.
- `nitime_monthly`: Nitime Monthly, $39/month, no free trial.

Both products must be created in the same auto-renewable subscription group and marked Ready to Submit in App Store Connect before review.

## URLs

- Marketing URL: https://nitime.app/
- Support URL: https://nitime.app/support
- Privacy Policy URL: https://nitime.app/privacy
- Terms of Service URL: https://nitime.app/terms
- Support email: <support-email>

## Screenshot Captions

1. Turn client messages into an approval queue.
2. Connect the channels clients already use.
3. Save answers for pricing, availability, and policies.
4. Keep sensitive replies under provider approval.
5. Share a web chat link without joining a marketplace.
6. Track direct payment links without processing client payments.

## Submission Blockers

- Replace support email and reviewer credential placeholders.
- Add reviewer credentials or a reviewer walkthrough.
- Confirm App Store Connect IAP products and subscription group.
- Run a StoreKit sandbox purchase and restore on a physical iOS device.
