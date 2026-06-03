// Google Voice via Gmail Pub/Sub → agent runtime.
//
// Google Voice does not expose a first-class SMS API for this app to call.
// This integration watches the provider's Gmail mailbox for Google Voice
// notification emails, normalizes matching messages, and runs the same
// channel-agnostic agent loop as Telegram and web chat. Outbound delivery
// replies through Gmail to the Google Voice notification reply address.

import { createClient } from 'npm:@supabase/supabase-js@2.55.0';
import { runAgentTurn, logEvent } from '../_shared/agent.ts';
import { gmailApi, sendGoogleVoiceReply } from '../_shared/gmail.ts';
import { parseGmailPubSub, parseGoogleVoiceMessage, type GmailMessage } from '../_shared/googleVoiceParser.ts';
import { ack } from '../_shared/http.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

interface GmailHistoryResponse {
  history?: Array<{ messagesAdded?: Array<{ message?: { id?: string } }> }>;
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });

  let notification: ReturnType<typeof parseGmailPubSub>;
  try {
    notification = parseGmailPubSub(await req.json());
  } catch {
    return ack();
  }
  if (!notification) return ack();

  const { data: channel } = await admin
    .from('agent_channels')
    .select('id, user_id, bot_token, active, metadata')
    .eq('channel', 'gv')
    .eq('external_account_id', notification.emailAddress)
    .maybeSingle();
  if (!channel || !channel.active || !channel.bot_token) return ack();

  const userId = channel.user_id as string;
  const metadata = ((channel as any).metadata ?? {}) as { lastHistoryId?: string };
  const startHistoryId = metadata.lastHistoryId;

  // Gmail sends one notification immediately after watch() is created. Treat
  // that first notification as the baseline instead of importing old mail.
  if (!startHistoryId) {
    await admin
      .from('agent_channels')
      .update({ metadata: { ...metadata, lastHistoryId: notification.historyId } })
      .eq('id', channel.id);
    return ack();
  }

  try {
    const history = await gmailApi<GmailHistoryResponse>(
      channel.bot_token as string,
      `history?startHistoryId=${encodeURIComponent(startHistoryId)}&historyTypes=messageAdded`,
    );
    if (!history.ok) {
      await logEvent(admin, { userId, kind: 'error', source: 'gv', detail: { stage: 'gmail_history', error: history.error } });
      return ack();
    }

    const ids = new Set<string>();
    for (const h of history.data?.history ?? []) {
      for (const added of h.messagesAdded ?? []) {
        if (added.message?.id) ids.add(added.message.id);
      }
    }

    for (const id of ids) {
      const msg = await gmailApi<GmailMessage>(channel.bot_token as string, `messages/${encodeURIComponent(id)}?format=full`);
      if (!msg.ok || !msg.data) {
        await logEvent(admin, { userId, kind: 'error', source: 'gv', detail: { stage: 'gmail_message', id, error: msg.error } });
        continue;
      }

      const inbound = parseGoogleVoiceMessage(msg.data);
      if (!inbound) continue;

      await runAgentTurn(admin, {
        userId,
        channel: 'gv',
        inbound,
        deliver: (text) => sendGoogleVoiceReply(channel.bot_token as string, inbound.replyToEmail, text, inbound.gmailThreadId),
      });
    }
  } catch (e) {
    await logEvent(admin, { userId, kind: 'error', source: 'gv', detail: { stage: 'handler', error: String(e) } });
  } finally {
    await admin
      .from('agent_channels')
      .update({ metadata: { ...metadata, lastHistoryId: notification.historyId } })
      .eq('id', channel.id);
  }

  return ack();
});
