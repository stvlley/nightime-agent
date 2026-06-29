/*
  AI booking flow.

  1. `threads.booking_context`: per-thread scratch space for the deterministic
     booking handler. When the agent offers concrete times it stores the offered
     slots here so the client's next message can be matched against exactly the
     slots we proposed (the agent can never book a time it did not offer).
     Shape: { offered: [{ startIso, endIso, label }], serviceId, durationMinutes }.

  2. `messages.response_source`: allow a 'booking' value so deterministic offer /
     confirmation drafts are distinguishable from faq / llm / fallback replies.
*/

ALTER TABLE public.threads
  ADD COLUMN IF NOT EXISTS booking_context jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.messages
  DROP CONSTRAINT IF EXISTS messages_response_source_check;
ALTER TABLE public.messages
  ADD CONSTRAINT messages_response_source_check
  CHECK (response_source IS NULL OR response_source IN ('faq', 'llm', 'fallback', 'booking'));
