import type { SendResult } from './agent.ts';

export async function sendWhatsAppText(
  accessToken: string,
  phoneNumberId: string,
  to: string,
  text: string,
): Promise<SendResult> {
  try {
    const res = await fetch(`https://graph.facebook.com/v21.0/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'text',
        text: {
          preview_url: false,
          body: text,
        },
      }),
    });

    if (!res.ok) return { ok: false, error: `whatsapp ${res.status}: ${await res.text()}` };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}
