/*
  # Setup RLS Policies for Thread-based Authorization
  
  Sets up Row Level Security policies that authorize messages through parent thread ownership.
*/

-- Enable RLS
ALTER TABLE public.threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Drop any conflicting old policies
DROP POLICY IF EXISTS "threads_select_self" ON public.threads;
DROP POLICY IF EXISTS "messages_select_self" ON public.messages;
DROP POLICY IF EXISTS "messages_insert_self" ON public.messages;
DROP POLICY IF EXISTS "messages_update_self" ON public.messages;
DROP POLICY IF EXISTS "messages_delete_self" ON public.messages;

-- Threads: users can see only their own
CREATE POLICY "threads_select_self"
ON public.threads FOR SELECT
USING (user_id = auth.uid());

-- Allow users to manage their own threads
CREATE POLICY "threads_insert_self"
ON public.threads FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "threads_update_self"
ON public.threads FOR UPDATE
USING (user_id = auth.uid());

-- Messages: authorize via parent thread ownership
CREATE POLICY "messages_select_self"
ON public.messages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.threads t
    WHERE t.id = public.messages.thread_id
      AND t.user_id = auth.uid()
  )
);

CREATE POLICY "messages_insert_self"
ON public.messages FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.threads t
    WHERE t.id = public.messages.thread_id
      AND t.user_id = auth.uid()
  )
);

CREATE POLICY "messages_update_self"
ON public.messages FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.threads t
    WHERE t.id = public.messages.thread_id
      AND t.user_id = auth.uid()
  )
);

CREATE POLICY "messages_delete_self"
ON public.messages FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.threads t
    WHERE t.id = public.messages.thread_id
      AND t.user_id = auth.uid()
  )
);