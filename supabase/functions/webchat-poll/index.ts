// Web-chat poll (Phase 2, zero-setup channel).
//
// The widget polls this for new messages in its conversation. Returns the
// visitor's own messages and only the outbound replies that are actually visible
// — auto-sent FAQ answers and provider-approved drafts (approval_status in
// 'auto_sent' | 'sent'). Pending / rejected / failed drafts are never exposed,
// so an unapproved AI draft can't leak to the visitor.
//
// The provider is identified by public `profiles.slug`; the unguessable
// `sessionId` scopes the read to one thread. verify_jwt = false (public).

import { createClient } from 'npm:@supabase/supabase-js@2.55.0';
import { json, corsHeaders } from '../_shared/http.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const VISIBLE_OUT = ['auto_sent', 'sent'];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });

  let body: { slug?: string; sessionId?: string; afterIso?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'bad_request' }, 400);
  }
  const slug = (body.slug || '').trim().toLowerCase();
  const sessionId = (body.sessionId || '').trim();
  if (!slug || !sessionId) return json({ error: 'missing_fields' }, 400);

  const { data: profile } = await admin.from('profiles').select('id').eq('slug', slug).maybeSingle();
  if (!profile) return json({ error: 'unknown_provider' }, 404);
  const userId = profile.id as string;

  const { data: thread } = await admin
    .from('threads')
    .select('id')
    .eq('user_id', userId)
    .eq('channel', 'webchat')
    .eq('external_thread_id', sessionId)
    .maybeSingle();
  if (!thread) return json({ messages: [] });

  let q = admin
    .from('messages')
    .select('id, text, direction, approval_status, created_at')
    .eq('thread_id', thread.id)
    .order('created_at', { ascending: true });
  if (body.afterIso) q = q.gt('created_at', body.afterIso);

  const { data: rows } = await q;
  const messages = ((rows ?? []) as any[])
    .filter((m) => m.direction === 'in' || VISIBLE_OUT.includes(m.approval_status))
    .map((m) => ({
      id: m.id,
      text: m.text,
      role: m.direction === 'in' ? 'visitor' : 'agent',
      aiGenerated: false,
      createdAt: m.created_at,
    }));

  return json({ messages });
});
