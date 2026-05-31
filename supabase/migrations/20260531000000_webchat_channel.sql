/*
  # Web-chat channel (Phase 2, zero-setup channel)

  Adds 'webchat' to the allowed channel values on `agent_channels` and `threads`.

  Web chat is the no-setup channel: the provider is identified by their public
  `profiles.slug` and the visitor by an unguessable session id, so it needs no
  per-provider credentials. No new tables — it reuses `threads`/`messages` exactly
  like Telegram (the runtime is channel-agnostic). This migration only widens the
  two channel CHECK constraints.
*/

ALTER TABLE public.agent_channels DROP CONSTRAINT IF EXISTS agent_channels_channel_check;
ALTER TABLE public.agent_channels
  ADD CONSTRAINT agent_channels_channel_check
  CHECK (channel = ANY (ARRAY['gv', 'telegram', 'whatsapp', 'email', 'sms', 'webchat']));

ALTER TABLE public.threads DROP CONSTRAINT IF EXISTS threads_channel_check;
ALTER TABLE public.threads
  ADD CONSTRAINT threads_channel_check
  CHECK (channel = ANY (ARRAY['gv', 'telegram', 'whatsapp', 'email', 'sms', 'webchat']));
