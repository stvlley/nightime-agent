/*
  # Google Voice channel metadata

  Google Voice is wired through Gmail Pub/Sub notifications. The channel row
  needs provider-specific operational state, especially the last processed Gmail
  history id, without adding a Google-Voice-only table.
*/

ALTER TABLE public.agent_channels
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;
