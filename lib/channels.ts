// Self-serve channel connection (Settings → Channels).
//
// Mirrors what scripts/enable-webchat.mjs and scripts/connect-telegram.mjs do
// with the service role, but runs as the signed-in provider under RLS:
//   - agent_channels has an owner-scoped FOR ALL policy, so the provider can
//     create/update their own channel rows.
//   - We only ever SELECT safe columns (never bot_token / webhook_secret).
//     The Telegram token transits the client once because the provider pastes
//     it here; it is written, used to call the Telegram API, then dropped.
import { supabase } from '@/lib/supabase';
import {
  functionsBaseFromSupabaseUrl,
  isValidSlug,
  looksLikeTelegramToken,
  randomHexSecret,
  slugifyHandle,
} from '@/utils/channelSetup';

export interface ConnectedChannel {
  id: string;
  channel: string;
  /** Bot username, watched Gmail address, phone number id, or webchat slug. */
  externalAccountId: string | null;
  active: boolean;
  createdAt: string | null;
}

const SAFE_COLUMNS = 'id, channel, external_account_id, active, created_at';

function mapRow(row: {
  id: string;
  channel: string;
  external_account_id: string | null;
  active: boolean;
  created_at: string | null;
}): ConnectedChannel {
  return {
    id: row.id,
    channel: row.channel,
    externalAccountId: row.external_account_id,
    active: row.active,
    createdAt: row.created_at,
  };
}

export const channelService = {
  /** All channel connections for the signed-in provider (safe columns only). */
  async list(userId: string): Promise<ConnectedChannel[]> {
    if (!supabase) return [];
    const { data, error } = await supabase
      .from('agent_channels')
      .select(SAFE_COLUMNS)
      .eq('user_id', userId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return (data ?? []).map(mapRow);
  },

  /**
   * Turn on the zero-setup web-chat channel. Ensures the profile has a public
   * slug (web chat resolves the provider by slug), then upserts the channel
   * row. Returns the slug the widget link should use.
   */
  async enableWebchat(userId: string, fallbackHandle: string): Promise<{ slug: string }> {
    if (!supabase) throw new Error('Supabase is not configured.');

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('slug, business_name, display_name')
      .eq('id', userId)
      .maybeSingle();
    if (profileError) throw profileError;

    let slug = profile?.slug ?? null;
    if (!slug) {
      const base = slugifyHandle(
        profile?.business_name || profile?.display_name || fallbackHandle
      );
      slug = base;
      // The slug has a unique index; on collision retry once with a random
      // suffix. Upsert (not update) so a missing profile row can't silently
      // leave the slug unset and the chat link dead.
      for (let attempt = 0; attempt < 2; attempt++) {
        const { error } = await supabase
          .from('profiles')
          .upsert({ id: userId, slug }, { onConflict: 'id' });
        if (!error) break;
        if (attempt === 1 || error.code !== '23505') throw error;
        slug = `${base}-${randomHexSecret(2)}`;
      }
    }

    const { error: channelError } = await supabase.from('agent_channels').upsert(
      {
        user_id: userId,
        channel: 'webchat',
        external_account_id: slug,
        // Unused for webchat (visitors are identified by session id); the
        // column is NOT NULL because webhook channels require it.
        webhook_secret: randomHexSecret(16),
        active: true,
      },
      { onConflict: 'user_id,channel' }
    );
    if (channelError) throw channelError;

    return { slug };
  },

  /**
   * Connect a Telegram bot: validate the pasted token against the Bot API,
   * store the channel row, then point the bot's webhook at the deployed
   * `telegram-webhook` Edge Function with a fresh secret.
   */
  async connectTelegram(userId: string, botToken: string): Promise<{ username: string }> {
    if (!supabase) throw new Error('Supabase is not configured.');
    const token = botToken.trim();
    if (!looksLikeTelegramToken(token)) {
      throw new Error('That does not look like a bot token. Paste the full token from @BotFather.');
    }

    const meRes = await fetch(`https://api.telegram.org/bot${token}/getMe`);
    const me = await meRes.json().catch(() => null);
    if (!me?.ok) {
      throw new Error('Telegram rejected this token. Check it in @BotFather and try again.');
    }
    const username: string = me.result.username;

    const webhookSecret = randomHexSecret(24);
    const { error: upsertError } = await supabase.from('agent_channels').upsert(
      {
        user_id: userId,
        channel: 'telegram',
        external_account_id: username,
        bot_token: token,
        webhook_secret: webhookSecret,
        active: true,
      },
      { onConflict: 'user_id,channel' }
    );
    if (upsertError) throw upsertError;

    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL as string;
    const webhookUrl = `${functionsBaseFromSupabaseUrl(supabaseUrl)}/telegram-webhook`;
    const setRes = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: webhookUrl,
        secret_token: webhookSecret,
        allowed_updates: ['message', 'edited_message'],
      }),
    });
    const setJson = await setRes.json().catch(() => null);
    if (!setJson?.ok) {
      // Leave the row but inactive so a retry can finish the job.
      await supabase
        .from('agent_channels')
        .update({ active: false })
        .eq('user_id', userId)
        .eq('channel', 'telegram');
      throw new Error(
        `Saved the bot, but could not register its webhook${setJson?.description ? `: ${setJson.description}` : '.'} Try connecting again.`
      );
    }

    return { username };
  },

  /** Pause or resume a channel without losing its credentials. */
  async setActive(channelId: string, active: boolean): Promise<void> {
    if (!supabase) throw new Error('Supabase is not configured.');
    const { error } = await supabase
      .from('agent_channels')
      .update({ active })
      .eq('id', channelId);
    if (error) throw error;
  },

  /**
   * Remove a channel connection entirely. Inbound webhooks for deleted rows
   * no longer resolve a provider and are ignored by the Edge Functions.
   */
  async disconnect(channelId: string): Promise<void> {
    if (!supabase) throw new Error('Supabase is not configured.');
    const { error } = await supabase.from('agent_channels').delete().eq('id', channelId);
    if (error) throw error;
  },
};

export { isValidSlug, slugifyHandle };
