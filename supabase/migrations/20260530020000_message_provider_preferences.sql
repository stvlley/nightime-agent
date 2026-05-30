/*
  # Message-provider setup context

  Adds v1 message-provider onboarding fields to provider preferences. These are
  focused on inbound conversation setup; booking context stays optional.
*/

ALTER TABLE public.provider_preferences
  ADD COLUMN IF NOT EXISTS message_channels text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS common_questions text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS response_boundaries text,
  ADD COLUMN IF NOT EXISTS booking_context_enabled boolean NOT NULL DEFAULT false;
