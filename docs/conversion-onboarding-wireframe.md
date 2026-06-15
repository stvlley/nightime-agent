# Nightime Agent Conversion Onboarding Wireframe

Figma file: https://www.figma.com/design/BPw6F3KXJ5ny67GNBrB8Xj

High-fidelity code mockup route: `/mockups/conversion-onboarding`

## Purpose

Convert provider curiosity into trial intent before the provider dashboard. The flow should make the provider feel the cost of slow replies, repetitive questions, missed clients, and boundary management, then present a transparent annual-first trial paywall.

## Mobile Funnel

1. **Start: Make missed messages measurable**
   - Entry from provider CTA.
   - No visible skip path.
   - CTA: `Start 2-minute checkup`.

2. **Provider category**
   - Independent wellness provider.
   - Beauty or personal care studio.
   - Companion or nightlife-adjacent service.
   - Other appointment-based provider.
   - Reinforce: Nightime configures a message assistant, not a marketplace listing.

3. **Current message channels**
   - WhatsApp, SMS/Voice, Instagram DM, Telegram, Email, Website chat.
   - Recommendation panel: start with the channel where clients already ask pricing, availability, and boundaries.

4. **Inbound message volume**
   - Ranges: 1-5, 6-15, 16-30, 30+ daily messages.
   - Purpose: estimate response load and missed opportunity risk.

5. **Reply speed**
   - Under 10 minutes, within an hour, a few hours later, often next day.
   - Risk panel: late replies turn warm requests cold.

6. **Client value**
   - Ask average value of one converted client.
   - Show conservative estimate, for example `$180` average value and `$1,440/month` opportunity if two requests go cold weekly.
   - Must say this is not a revenue guarantee.

7. **Repeating questions**
   - Pricing/packages.
   - Availability/location.
   - What to expect.
   - Boundaries/policies.
   - These shape starter agent settings.

8. **Assistant caution level**
   - Draft everything for approval.
   - Auto-answer simple FAQs only.
   - Auto-answer most routine messages.
   - Recommended: auto-answer safe FAQs and hold sensitive cases.

9. **Personalized result**
   - Show recommended channels, FAQ categories, approval mode, and protected opportunity estimate.
   - CTA: `See trial options`.

10. **Paywall priming 1**
   - `Try the assistant free first`.
   - Includes inbox preview, approval queue, FAQ training setup.

11. **Paywall priming 2**
   - `We remind you before renewal`.
   - Day 1: connect first channel.
   - Day 2: approve suggested replies.
   - Day 3: reminder before billing.

12. **Paywall**
   - Annual first: `$299/year`, 3-day free trial.
   - Monthly secondary: `$39/month`, no trial.
   - Required terms: trial length, renewal price, billing period, cancellation path, restore purchase.

13. **Dashboard handoff**
   - Summarize diagnostic answers and send the provider into the dashboard.
   - Provider edits channels, saved replies, and safety controls from the app.

14. **Dashboard arrival**
   - Confirm immediate value: agent status, approvals waiting, FAQ replies, channel checklist.

## Desktop Adaptations

- Diagnostic web layout: question panel left, sticky estimate/progress right.
- Personalized result: wide summary panel with CTA.
- Paywall: annual card, monthly secondary, visible terms.
- Dashboard handoff: imported-answer summary and first actionable dashboard state.

## Implementation Notes

- Define diagnostic questions as structured data: `id`, `prompt`, `options`, and `analyticsKey`.
- Persist answers locally before signup, then attach to provider profile after trial/signup.
- Use accepted answers to frame the first dashboard and agent settings experience.
- Instrument funnel events before paid traffic.
- Keep copy on the tool side: message handling, approval queue, own channels. Avoid marketplace or client checkout language.

## Figma Population Pass

The next Figma pass should add four populated sections after the wireframe frames:

1. **Component kit**
   - Color swatches: Night, Panel, Violet, Mint, Amber, Warning.
   - Controls: selected/unselected chips, answer rows, risk insight rows, trust reassurance rows, primary CTA, secondary restore link.
   - Purpose: make implementation decisions visible without turning the file into a full design system.

2. **Screen copy matrix**
   - Table columns: Step, Screen, Primary question/headline, Selected examples, Event.
   - This becomes the source for product copy review and event naming.

3. **Implementation data model**
   - Add a code-style panel for `DiagnosticQuestion` and `DiagnosticResult`.
   - Add notes for calculation guardrails, dashboard handoff, paywall gate, and tool/marketplace boundary.

4. **Paywall requirements**
   - Annual-first plan: `$299/year` with a 3-day free trial.
   - Monthly secondary plan: `$39/month`, no trial by default.
   - Visible terms: trial length, renewal price, billing period, cancellation path, included features, restore purchase.
   - Internal escape hatch: demo unlock only behind an environment flag.

## Copy Matrix

| Step | Screen | Primary question / headline | Selected examples | Event |
|---:|---|---|---|---|
| 1 | Start | Make missed messages measurable | Start 2-minute checkup | `onboarding_started` |
| 2 | Profile | What kind of provider are you? | Independent wellness, beauty, companion/nightlife, other | `diagnostic_answered.profile` |
| 3 | Channels | Where do clients message you now? | WhatsApp, SMS/Voice, Instagram, Telegram, Email, Web chat | `diagnostic_answered.channels` |
| 4 | Volume | How many inbound messages arrive daily? | 1-5, 6-15, 16-30, 30+ | `diagnostic_answered.volume` |
| 5 | Speed | How fast do you usually reply? | Under 10 min, within an hour, a few hours, next day | `diagnostic_answered.reply_speed` |
| 6 | Value | What is one converted client worth? | `$180` example; conservative monthly opportunity estimate | `diagnostic_answered.client_value` |
| 7 | FAQ | Which questions repeat the most? | Pricing, availability, what to expect, boundaries | `diagnostic_answered.faqs` |
| 8 | Control | How cautious should the assistant be? | Draft all, safe FAQs only, routine auto-answer | `diagnostic_answered.approval_mode` |
| 9 | Result | Your message assistant plan is ready | Recommended channels, FAQ categories, approval mode | `diagnostic_completed` |
| 10 | Trust 1 | Try the assistant free first | Inbox preview, approval queue, FAQ training | `trial_prime_viewed.free_first` |
| 11 | Trust 2 | We remind you before renewal | Day 1 connect, Day 2 approve, Day 3 reminder | `trial_prime_viewed.reminder` |
| 12 | Paywall | Start your 3-day free trial | Annual first, monthly secondary, visible terms | `paywall_viewed` |
| 13 | Handoff | Your assistant plan is ready | Imported-answer summary, edit controls in app | `setup_completed` |
| 14 | Dashboard | Dashboard after onboarding | Approvals, FAQ replies, channel checklist | `dashboard_viewed` |

## Diagnostic Data Shape

```ts
type DiagnosticQuestion = {
  id: string;
  step: number;
  prompt: string;
  helper?: string;
  kind: 'single' | 'multi' | 'currency' | 'range';
  options?: {
    label: string;
    value: string;
    recommended?: boolean;
  }[];
  analyticsKey: string;
};

type DiagnosticResult = {
  providerCategory: string;
  channels: string[];
  dailyVolume: string;
  replySpeed: string;
  clientValueCents: number;
  faqCategories: string[];
  approvalMode: 'draft_all' | 'safe_faq_auto' | 'routine_auto';
  estimatedMonthlyOpportunityCents: number;
};
```

## Paywall Copy Variants

- `Start free trial`
- `Protect my inbox`
- `Start with approval mode`
- `Try Nightime for 3 days`

A/B test the headline, proof block, guarantee wording, annual savings framing, and CTA copy.

## Fresha Reference Takeaways

Source screenshots: `/Users/dysto/Downloads/Fresha iOS Onboarding/`.

Use these as structural patterns only. Do not copy Fresha branding, exact screen copy, marketplace promises, venue photos, or logo treatment.

### Useful Patterns

- **Splash pacing:** a single centered brand mark over a soft color wash creates a premium first impression without explaining the product yet.
- **Account sheet hierarchy:** black system chrome behind a white rounded sheet creates focus and makes login/account creation feel like a contained task.
- **Typography:** large, heavy titles with muted explanatory copy; labels are bold and close to fields.
- **Input system:** full-width bordered social rows, full-width inputs, strong full-width primary button.
- **Utilities:** language and support links sit low on the account screen and stay visually secondary.
- **Progressive capture:** email first, then profile/password/phone details after the user has already committed.
- **Consent block:** privacy and marketing preferences are explicit, large, and readable.
- **Home after signup:** greeting, avatar initials, horizontal recommendation cards, image-led content cards, and simple bottom navigation.

### Nightime Adaptation

- Add a **soft Nightime splash/reference screen** for app-store screenshots and product polish.
- Add a **provider account capture sheet** after the diagnostic or before trial start, depending on final payment flow.
- Use a **light focused capture surface** for account details, even if the provider app remains dark.
- Keep diagnostic/paywall copy on the tool side: message handling, approval queue, own channels, no marketplace booking or service payment.
- Use image-led card patterns only for provider workflow previews, not public marketplace discovery.
