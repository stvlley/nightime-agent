# Message Provider Setup Chat Test Guide

## What this flow should do

New providers should move from account creation into the setup chat before reaching the main tabs. The setup should feel like an actual scripted chat transcript, not a wizard: assistant prompt bubbles and provider answers stay visible as the conversation grows.

Existing providers should be able to open the same setup chat again from Settings and see their saved answers pre-filled.

V1 is for message providers. The flow should collect enough context for an inbound messaging assistant: who the provider is, what clients usually ask, where clients message them, what offers/services come up in chat, preferred tone, boundaries, approval mode, follow-up preference, moderation level, and notification permission.

The current inference pass is intentionally bounded. It may suggest starter channels, offers, tone, and boundaries from the provider's category and common questions, but those suggestions are deterministic and must be accepted or edited by the provider before saving.

## Manual test: new signup

1. Start the app with `npm run dev`.
2. Open the web app or Expo device session.
3. Create a new provider account from the register screen or provider signup modal.
4. Confirm the app routes to `/(onboarding)/setup`, not directly to `/(tabs)`.
5. Confirm the setup appears as a chat transcript, not a full-screen wizard step replacement.
6. Answer the business/display name prompt.
7. Choose or enter the provider category.
8. Enter common inbound questions clients ask.
9. Confirm the assistant shows a short typing state before moving to the next prompt.
10. Review suggested starter defaults if shown.
11. Either use or skip the suggestions.
12. Choose or edit current client message channels.
13. Add services/offers only as things clients ask about in messages.
14. If the flow asks about booking, confirm it is framed as optional message context.
15. Choose agent tone and boundaries.
16. Choose manual approval or auto-response for eligible messages.
17. Turn follow-up automation on or off.
18. Choose a moderation level.
19. On the notification step, either enable notifications or skip them.
20. Review the transcript summary.
21. Save setup.
22. Confirm the app routes to `/(tabs)`.

## Manual test: chat behavior

1. Each provider answer should appear as a user bubble in the transcript.
2. The assistant should acknowledge or advance with the next scripted message.
3. Prior answers should remain visible when later prompts appear.
4. Quick replies should look like chat reply options, not large wizard cards.
5. Typed answers should be entered inline at the current prompt.
6. The composer should stay near the bottom while the transcript scrolls.
7. The transcript should scroll to the newest assistant prompt or typing state.
8. Back/edit behavior should let a provider correct earlier answers without losing the whole transcript.

## Manual test: suggested defaults

1. Enter a category and common questions that mention rates or availability.
2. Confirm the assistant offers starter suggestions before asking for channels.
3. Tap Use.
4. Confirm the later channel, offer, tone, and boundary prompts are pre-filled with suggested values.
5. Go back and repeat the same path, then tap Skip.
6. Confirm skipped suggestions do not silently save hidden values.

## Manual test: saved data

After saving setup, verify the database contains the expected rows:

1. `profiles` has the provider's `business_name`, `display_name`, `headline`, `location_label`, and `timezone` when supplied.
2. `provider_preferences` has the selected business category, tone, approval mode, moderation level, follow-up setting, notification setting, notification permission, and a non-empty `setup_completed_at`.
3. `services` has message-relevant offers/services when the provider entered them.
4. `availability` has rows only when the provider supplied booking availability as part of the message workflow.

## Manual test: demo mode

1. Remove or unset Supabase environment variables.
2. Start the app with `npm run dev`.
3. Register a provider account.
4. Complete the setup chat.
5. Confirm setup completes and routes to the tabs without Supabase.
6. Relaunch setup from Settings.
7. Confirm the saved demo answers are pre-filled from AsyncStorage.

## Manual test: Settings relaunch

1. Sign in as an existing provider.
2. Go to Settings.
3. Tap Setup chat.
4. Confirm the setup chat opens.
5. Confirm previously saved answers are pre-filled.
6. Edit message-provider context such as common questions, tone, boundaries, approval mode, and notification preference.
7. Save setup.
8. Confirm the app returns to tabs and the edited values persist.

## Manual test: validation and notification edge cases

1. Clear the business name and try to continue from the profile prompt. The flow should ask for a business name in chat.
2. Try to skip required message-provider context such as category or message channels. The flow should ask for the missing answer in chat.
3. Remove all service/offer names if that prompt is shown. The flow should either allow skipping as optional context or clearly ask for one message-relevant offer.
4. If availability is shown, remove all availability days and try to continue. The flow should block only when the provider opted into booking context.
5. If availability is shown, enter invalid times such as `9am` or `25:00`. The flow should block and ask for `HH:MM`.
6. If availability is shown, enter an end time earlier than the start time. The flow should block and ask for valid hours.
7. Skip notification permission. Setup should still save with `notification_permission = skipped`.
8. Test in a browser that denies notifications. Setup should still save with `notification_permission = denied`.
9. Test on a platform without the web Notification API. Setup should still save with `notification_permission = unsupported`.

## Automated unit tests

Run:

```sh
npm test
```

These tests cover the pure setup-flow validation rules, deterministic chat transitions, and provider-approved setup suggestions that gate the scripted chat before it saves.
