// Data-access layer for the app's core tables.
// Mirrors the `profileService` pattern in lib/supabase.ts: every method is a
// no-op-safe wrapper that returns empty results when Supabase is not configured
// (demo mode), so screens can call these unconditionally.
import { supabase } from '@/lib/supabase';

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

    return (data ?? []).map((thread: any) => {
      const messages = (thread.messages ?? []) as Array<{
        text: string | null;
        created_at: string | null;
        direction: string | null;
        ai_generated: boolean | null;
      }>;
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

    return (data ?? []).map((b: any) => {
      const start = b.start as string | null;
      const end = b.end as string | null;
      const durationMinutes =
        start && end
          ? Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000)
          : null;

      return {
        id: b.id,
        clientHandle: b.threads?.client_handle ?? 'Unknown',
        channel: b.threads?.channel ?? '',
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

    const rows = (data ?? []) as any[];

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

    return rows.map((r) => ({
      id: r.id,
      threadId: r.thread_id,
      clientHandle: r.threads?.client_handle ?? 'Unknown',
      channel: r.threads?.channel ?? '',
      inboundText: r.reply_to_message_id ? inboundById.get(r.reply_to_message_id) ?? null : null,
      draftText: r.text ?? '',
      intent: r.ai_label ?? null,
      confidence: r.ai_confidence ?? null,
      source: r.response_source ?? null,
      createdAt: r.created_at ?? null,
    }));
  },

  /** Approve a draft and deliver it via the channel (Edge Function `send-draft`). */
  async approveAndSend(messageId: string): Promise<void> {
    if (!supabase) throw new Error('Supabase is not configured.');
    const { data, error } = await supabase.functions.invoke('send-draft', {
      body: { messageId },
    });
    if (error) throw error;
    if (data && (data as any).error) throw new Error(String((data as any).error));
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
