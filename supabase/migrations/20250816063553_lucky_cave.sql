/*
  # Bootstrap Threads Schema

  This migration safely creates the threading structure and links existing messages.
  
  1. Creates threads table if missing
  2. Adds user_id and thread_id to messages if missing  
  3. Creates bootstrap thread and attaches existing messages
  4. Sets up RLS policies based on thread ownership
*/

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Step 1: Create threads table if missing
CREATE TABLE IF NOT EXISTS public.threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  channel text NOT NULL CHECK (channel IN ('gv','telegram','whatsapp','email','sms')),
  external_thread_id text,
  client_handle text,
  state text DEFAULT 'open',
  last_activity_at timestamptz DEFAULT now()
);

-- Step 2: Add missing columns to messages (idempotent)
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS thread_id uuid;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_threads_user_id ON public.threads(user_id);
CREATE INDEX IF NOT EXISTS idx_threads_external_id ON public.threads(external_thread_id);
CREATE INDEX IF NOT EXISTS idx_messages_thread_id ON public.messages(thread_id);
CREATE INDEX IF NOT EXISTS idx_messages_user_id ON public.messages(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at DESC);