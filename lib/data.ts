// Data-access layer for the app's core tables.
// Mirrors the `profileService` pattern in lib/supabase.ts: every method is a
// no-op-safe wrapper that returns empty results when Supabase is not configured
// (demo mode), so screens can call these unconditionally.
import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database';

type Tables = Database['public']['Tables'];
type ThreadRow = Tables['threads']['Row'];
type MessageRow = Tables['messages']['Row'];
type BookingRow = Tables['bookings']['Row'];

type ThreadPreviewMessage = Pick<MessageRow, 'text' | 'created_at' | 'direction' | 'ai_generated'>;
type ThreadDetailMessage = Pick<
  MessageRow,
  | 'id'
  | 'text'
  | 'direction'
  | 'created_at'
  | 'ai_generated'
  | 'approval_status'
  | 'response_source'
  | 'ai_label'
  | 'ai_confidence'
>;
type ThreadListRow = Pick<ThreadRow, 'id' | 'channel' | 'client_handle' | 'state' | 'last_activity_at'> & {
  messages?: ThreadPreviewMessage[] | null;
};
type ThreadDetailRow = Pick<ThreadRow, 'id' | 'channel' | 'client_handle' | 'state'> & {
  messages?: ThreadDetailMessage[] | null;
};
type JoinedThread = Pick<ThreadRow, 'client_handle' | 'channel'>;
type BookingListRow = Pick<BookingRow, 'id' | 'start' | 'end' | 'status'> & {
  threads?: JoinedThread | JoinedThread[] | null;
};
type PendingDraftRow = Pick<
  MessageRow,
  | 'id'
  | 'text'
  | 'ai_label'
  | 'ai_confidence'
  | 'response_source'
  | 'created_at'
  | 'thread_id'
  | 'reply_to_message_id'
> & {
  threads?: JoinedThread | JoinedThread[] | null;
};

function hasFunctionError(value: unknown): value is { error: unknown } {
  return typeof value === 'object' && value !== null && 'error' in value;
}

function joinedThread(value: JoinedThread | JoinedThread[] | null | undefined): JoinedThread | null {
  return Array.isArray(value) ? value[0] ?? null : value ?? null;
}

export interface ThreadListItem {
  id: string;
  clientHandle: string;
  channel: string;
  state: string;
  lastActivityAt: string | null;
  lastMessage: string;
  /** Heuristic: latest inbound message that hasn't been answered yet. */
  unread: boolean;
  /** Derived display category for the inbox badge. */
  kind: 'ai' | 'booking' | 'manual';
}

export interface BookingListItem {
  id: string;
  clientHandle: string;
  channel: string;
  start: string | null;
  end: string | null;
  durationMinutes: number | null;
  status: string;
}

export interface FaqItem {
  id: string;
  trigger: string;
  reply: string;
  enabled: boolean;
}

export interface DashboardStats {
  messagesToday: number;
  bookingsThisWeek: number;
  aiResponsesToday: number;
  responseRate: number; // 0-100
}

export interface ThreadMessageItem {
  id: string;
  text: string;
  direction: 'in' | 'out';
  createdAt: string | null;
  aiGenerated: boolean;
  approvalStatus: string | null;
  source: string | null;
  intent: string | null;
  confidence: number | null;
}

export interface ThreadDetail {
  id: string;
  clientHandle: string;
  channel: string;
  state: string;
  messages: ThreadMessageItem[];
}

export interface PendingDraft {
  /** The outbound draft message id (the row whose approval_status is 'pending'). */
  id: string;
  threadId: string;
  clientHandle: string;
  channel: string;
  /** The client message this draft answers, when known. */
  inboundText: string | null;
  draftText: string;
  intent: string | null;
  confidence: number | null;
  source: string | null;
  createdAt: string | null;
}

function startOfTodayISO(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function weekRangeISO(): { start: string; end: string } {
  const now = new Date();
  const day = now.getDay(); // 0 = Sunday
  const start = new Date(now);
  start.setDate(now.getDate() - day);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 7);
  return { start: start.toISOString(), end: end.toISOString() };
}

export const threadService = {
  /**
   * List the signed-in user's threads, newest activity first, with the latest
   * message text folded in for the inbox preview.
   */
  async listForInbox(userId: string): Promise<ThreadListItem[]> {
    if (!supabase) return [];

    const { data, error } = await supabase
      .from('threads')
      .select('id, channel, client_handle, state, last_activity_at, messages(text, created_at, direction, ai_generated)')
      .eq('user_id', userId)
      .order('last_activity_at', { ascending: false });

    if (error) throw error;

    return ((data ?? []) as ThreadListRow[]).map((thread) => {
      const messages = thread.messages ?? [];
      const latest = messages
        .slice()
        .sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? ''))[0];

      const kind: ThreadListItem['kind'] =
        thread.state === 'confirmed'
          ? 'booking'
          : latest?.ai_generated
          ? 'ai'
          : 'manual';

      return {
        id: thread.id,
        clientHandle: thread.client_handle ?? 'Unknown',
        channel: thread.channel,
        state: thread.state ?? 'open',
        lastActivityAt: thread.last_activity_at,
        lastMessage: latest?.text ?? 'No messages yet',
        unread: latest?.direction === 'in',
        kind,
      };
    });
  },

  /** One thread with its full message history, oldest first. */
  async getDetail(userId: string, threadId: string): Promise<ThreadDetail | null> {
    if (!supabase) return null;

    const { data, error } = await supabase
      .from('threads')
      .select(
        'id, channel, client_handle, state, messages(id, text, direction, created_at, ai_generated, approval_status, response_source, ai_label, ai_confidence)'
      )
      .eq('user_id', userId)
      .eq('id', threadId)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    const thread = data as ThreadDetailRow;
    const messages = (thread.messages ?? [])
      .slice()
      .sort((a, b) => (a.created_at ?? '').localeCompare(b.created_at ?? ''))
      .map(
        (m): ThreadMessageItem => ({
          id: m.id,
          text: m.text ?? '',
          direction: m.direction === 'out' ? 'out' : 'in',
          createdAt: m.created_at,
          aiGenerated: Boolean(m.ai_generated),
          approvalStatus: m.approval_status ?? null,
          source: m.response_source ?? null,
          intent: m.ai_label ?? null,
          confidence: m.ai_confidence ?? null,
        })
      );

    return {
      id: thread.id,
      clientHandle: thread.client_handle ?? 'Unknown',
      channel: thread.channel,
      state: thread.state ?? 'open',
      messages,
    };
  },

  /**
   * Provider-written reply: persist it as a pending outbound message, then
   * deliver through the channel via the `send-draft` Edge Function (which
   * owns per-channel transport). If delivery fails the message stays in the
   * approval queue, so nothing is lost.
   */
  async sendManualReply(userId: string, threadId: string, text: string): Promise<void> {
    if (!supabase) throw new Error('Supabase is not configured.');

    const { data, error } = await supabase
      .from('messages')
      .insert({
        user_id: userId,
        thread_id: threadId,
        text,
        direction: 'out',
        sender: 'provider',
        ai_generated: false,
        approval_status: 'pending',
      })
      .select('id')
      .single();
    if (error) throw error;

    await draftService.approveAndSend(data.id);
  },
};

export const bookingService = {
  /** Upcoming bookings (today onward) for the signed-in user, soonest first. */
  async listUpcoming(userId: string): Promise<BookingListItem[]> {
    if (!supabase) return [];

    const { data, error } = await supabase
      .from('bookings')
      .select('id, start, end, status, threads(client_handle, channel)')
      .eq('user_id', userId)
      .gte('start', startOfTodayISO())
      .order('start', { ascending: true });

    if (error) throw error;

    return ((data ?? []) as unknown as BookingListRow[]).map((b) => {
      const thread = joinedThread(b.threads);
      const start = b.start as string | null;
      const end = b.end as string | null;
      const durationMinutes =
        start && end
          ? Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000)
          : null;

      return {
        id: b.id,
        clientHandle: thread?.client_handle ?? 'Unknown',
        channel: thread?.channel ?? '',
        start,
        end,
        durationMinutes,
        status: b.status ?? 'tentative',
      };
    });
  },
};

export const faqService = {
  async list(userId: string): Promise<FaqItem[]> {
    if (!supabase) return [];

    const { data, error } = await supabase
      .from('faq')
      .select('id, trigger, reply_text, enabled')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    if (error) throw error;

    return (data ?? []).map((f) => ({
      id: f.id,
      trigger: f.trigger ?? '',
      reply: f.reply_text ?? '',
      enabled: f.enabled ?? true,
    }));
  },

  async create(userId: string, trigger: string, reply: string): Promise<FaqItem> {
    if (!supabase) throw new Error('Supabase is not configured.');

    const { data, error } = await supabase
      .from('faq')
      .insert({ user_id: userId, trigger, reply_text: reply, enabled: true })
      .select('id, trigger, reply_text, enabled')
      .single();

    if (error) throw error;

    return {
      id: data.id,
      trigger: data.trigger ?? '',
      reply: data.reply_text ?? '',
      enabled: data.enabled ?? true,
    };
  },

  async remove(id: string): Promise<void> {
    if (!supabase) throw new Error('Supabase is not configured.');
    const { error } = await supabase.from('faq').delete().eq('id', id);
    if (error) throw error;
  },

  async setEnabled(id: string, enabled: boolean): Promise<void> {
    if (!supabase) throw new Error('Supabase is not configured.');
    const { error } = await supabase.from('faq').update({ enabled }).eq('id', id);
    if (error) throw error;
  },
};

export const draftService = {
  /** Agent drafts awaiting the provider's approval, newest first. */
  async listPending(userId: string): Promise<PendingDraft[]> {
    if (!supabase) return [];

    const { data, error } = await supabase
      .from('messages')
      .select(
        'id, text, ai_label, ai_confidence, response_source, created_at, thread_id, reply_to_message_id, threads(client_handle, channel)'
      )
      .eq('user_id', userId)
      .eq('direction', 'out')
      .eq('approval_status', 'pending')
      .order('created_at', { ascending: false });

    if (error) throw error;

    const rows = (data ?? []) as unknown as PendingDraftRow[];

    // Resolve the inbound text each draft answers in one follow-up query.
    const replyIds = rows.map((r) => r.reply_to_message_id).filter(Boolean) as string[];
    const inboundById = new Map<string, string>();
    if (replyIds.length) {
      const { data: inbound } = await supabase
        .from('messages')
        .select('id, text')
        .in('id', replyIds);
      for (const m of inbound ?? []) inboundById.set(m.id, m.text ?? '');
    }

    return rows
      .filter((r): r is PendingDraftRow & { thread_id: string } => Boolean(r.thread_id))
      .map((r) => {
        const thread = joinedThread(r.threads);
        return {
          id: r.id,
          threadId: r.thread_id,
          clientHandle: thread?.client_handle ?? 'Unknown',
          channel: thread?.channel ?? '',
          inboundText: r.reply_to_message_id ? inboundById.get(r.reply_to_message_id) ?? null : null,
          draftText: r.text ?? '',
          intent: r.ai_label ?? null,
          confidence: r.ai_confidence ?? null,
          source: r.response_source ?? null,
          createdAt: r.created_at ?? null,
        };
      });
  },

  /** Count of drafts awaiting approval (inbox tab badge). */
  async countPending(userId: string): Promise<number> {
    if (!supabase) return 0;
    const { count, error } = await supabase
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('direction', 'out')
      .eq('approval_status', 'pending');
    if (error) throw error;
    return count ?? 0;
  },

  /** Approve a draft and deliver it via the channel (Edge Function `send-draft`). */
  async approveAndSend(messageId: string): Promise<void> {
    if (!supabase) throw new Error('Supabase is not configured.');
    const { data, error } = await supabase.functions.invoke('send-draft', {
      body: { messageId },
    });
    if (error) throw error;
    if (hasFunctionError(data)) throw new Error(String(data.error));
  },

  /** Reject a draft so it leaves the queue and is never sent. */
  async reject(messageId: string): Promise<void> {
    if (!supabase) throw new Error('Supabase is not configured.');
    const { error } = await supabase
      .from('messages')
      .update({ approval_status: 'rejected' })
      .eq('id', messageId);
    if (error) throw error;
  },
};

export const statsService = {
  async getDashboardStats(userId: string): Promise<DashboardStats> {
    if (!supabase) {
      return { messagesToday: 0, bookingsThisWeek: 0, aiResponsesToday: 0, responseRate: 0 };
    }

    const today = startOfTodayISO();
    const week = weekRangeISO();

    const [messagesToday, aiToday, bookingsWeek] = await Promise.all([
      supabase
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .gte('created_at', today),
      supabase
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('ai_generated', true)
        .gte('created_at', today),
      supabase
        .from('bookings')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .gte('start', week.start)
        .lt('start', week.end),
    ]);

    for (const r of [messagesToday, aiToday, bookingsWeek]) {
      if (r.error) throw r.error;
    }

    const msgCount = messagesToday.count ?? 0;
    const aiCount = aiToday.count ?? 0;

    return {
      messagesToday: msgCount,
      bookingsThisWeek: bookingsWeek.count ?? 0,
      aiResponsesToday: aiCount,
      responseRate: msgCount > 0 ? Math.round((aiCount / msgCount) * 100) : 0,
    };
  },
};
