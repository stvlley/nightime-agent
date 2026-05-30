// Telegram Bot API send (IO). Runs in Deno (Edge Functions). Not imported by
// vitest, so `fetch`/network usage here stays out of the unit tests.

export interface SendResult {
  ok: boolean;
  error?: string;
}

/** Send a plain-text message to a Telegram chat using the provider's bot token. */
export async function sendTelegramMessage(
  botToken: string,
  chatId: string,
  text: string,
): Promise<SendResult> {
  try {
    const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true }),
    });
    if (!res.ok) {
      return { ok: false, error: `telegram ${res.status}: ${await res.text()}` };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}
