/*
  # Final Database Verification
  
  Run this after the abnormality check to verify everything is correct
*/

-- =============================================================================
-- TABLE STRUCTURE VERIFICATION
-- =============================================================================

SELECT 'TABLE VERIFICATION' as check_type;

-- Check all expected tables exist
SELECT 
  table_name,
  CASE WHEN table_name IN ('profiles', 'threads', 'messages', 'bookings', 'faq') 
    THEN '✅ Expected' 
    ELSE '⚠️  Unexpected' 
  END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- =============================================================================
-- COLUMN VERIFICATION
-- =============================================================================

SELECT 'COLUMN VERIFICATION' as check_type;

-- Check messages table has all required columns
SELECT 
  'messages' as table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'messages' AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check threads table structure
SELECT 
  'threads' as table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'threads' AND table_schema = 'public'
ORDER BY ordinal_position;

-- =============================================================================
-- FOREIGN KEY VERIFICATION
-- =============================================================================

SELECT 'FOREIGN KEY VERIFICATION' as check_type;

SELECT 
  tc.table_name,
  tc.constraint_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
  JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
  JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_schema = 'public'
ORDER BY tc.table_name, tc.constraint_name;

-- =============================================================================
-- INDEX VERIFICATION
-- =============================================================================

SELECT 'INDEX VERIFICATION' as check_type;

SELECT 
  t.relname AS table_name,
  i.relname AS index_name,
  pg_get_indexdef(i.oid) AS index_definition
FROM pg_class t
  JOIN pg_index ix ON t.oid = ix.indrelid
  JOIN pg_class i ON i.oid = ix.indexrelid
  JOIN pg_namespace n ON t.relnamespace = n.oid
WHERE n.nspname = 'public'
  AND t.relkind = 'r'
  AND t.relname IN ('profiles', 'threads', 'messages', 'bookings', 'faq')
ORDER BY t.relname, i.relname;

-- =============================================================================
-- RLS VERIFICATION
-- =============================================================================

SELECT 'RLS VERIFICATION' as check_type;

-- Check RLS is enabled
SELECT 
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public'
  AND tablename IN ('profiles', 'threads', 'messages', 'bookings', 'faq')
ORDER BY tablename;

-- Check policies exist
SELECT 
  tablename,
  policyname,
  cmd as operation,
  CASE WHEN qual IS NOT NULL THEN 'Has USING clause' ELSE 'No USING clause' END as using_clause,
  CASE WHEN with_check IS NOT NULL THEN 'Has WITH CHECK' ELSE 'No WITH CHECK' END as check_clause
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- =============================================================================
-- DATA INTEGRITY VERIFICATION
-- =============================================================================

SELECT 'DATA INTEGRITY VERIFICATION' as check_type;

-- Check for orphaned messages
SELECT 
  'Messages without thread_id' as check_description,
  count(*) as count
FROM public.messages 
WHERE thread_id IS NULL;

SELECT 
  'Messages without user_id' as check_description,
  count(*) as count
FROM public.messages 
WHERE user_id IS NULL;

-- Check for messages referencing non-existent threads
SELECT 
  'Messages with invalid thread_id' as check_description,
  count(*) as count
FROM public.messages m
LEFT JOIN public.threads t ON m.thread_id = t.id
WHERE m.thread_id IS NOT NULL AND t.id IS NULL;

-- Check thread activity timestamps
SELECT 
  'Threads with outdated last_activity_at' as check_description,
  count(*) as count
FROM public.threads t
WHERE EXISTS (
  SELECT 1 FROM public.messages m 
  WHERE m.thread_id = t.id 
    AND m.created_at > t.last_activity_at
);

-- =============================================================================
-- SUMMARY STATISTICS
-- =============================================================================

SELECT 'SUMMARY STATISTICS' as check_type;

SELECT 
  'profiles' as table_name,
  count(*) as row_count
FROM public.profiles
UNION ALL
SELECT 
  'threads' as table_name,
  count(*) as row_count
FROM public.threads
UNION ALL
SELECT 
  'messages' as table_name,
  count(*) as row_count
FROM public.messages
UNION ALL
SELECT 
  'bookings' as table_name,
  count(*) as row_count
FROM public.bookings
UNION ALL
SELECT 
  'faq' as table_name,
  count(*) as row_count
FROM public.faq
ORDER BY table_name;

-- Check auth users vs profiles alignment
SELECT 
  'Auth users without profiles' as check_description,
  count(*) as count
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
WHERE p.id IS NULL;

SELECT 'DATABASE VERIFICATION COMPLETE ✅' as final_status;