// WhatsApp Cloud API webhook → agent runtime.
//
// Meta verifies this endpoint with a global verify token. Inbound messages are
// resolved to a provider by the WhatsApp `phone_number_id` in webhook metadata,
// which is stored as `agent_channels.external_account_id`. Outbound delivery uses
// the stored phone-number access token in `agent_channels.bot_token`.

import { createClient } from 'npm:@supabase/supabase-js@2.55.0';
import { runAgentTurn, logEvent } from '../_shared/agent.ts';
import { ack } from '../_shared/http.ts';
import { parseWhatsAppWebhook } from '../_shared/whatsappParser.ts';
import { sendWhatsAppText } from '../_shared/whatsapp.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const VERIFY_TOKEN = Deno.env.get('WHATSAPP_VERIFY_TOKEN') ?? '';
const APP_SECRET = Deno.env.get('WHATSAPP_APP_SECRET') ?? '';

function verifyChallenge(req: Request): Response {
  const url = new URL(req.url);
  const mode = url.searchParams.get('hub.mode');
  const token = url.searchParams.get('hub.verify_token');
  const challenge = url.searchParams.get('hub.challenge') ?? '';
  if (mode === 'subscribe' && VERIFY_TOKEN && token === VERIFY_TOKEN) {
    return new Response(challenge, { status: 200 });
  }
  return new Response('Forbidden', { status: 403 });
}

async function signatureOk(req: Request, bodyText: string): Promise<boolean> {
  if (!APP_SECRET) return true;
  const signature = req.headers.get('x-hub-signature-256') ?? '';
  const expectedPrefix = 'sha256=';
  if (!signature.startsWith(expectedPrefix)) return false;

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(APP_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(bodyText));
  const expected =
    expectedPrefix +
    Array.from(new Uint8Array(mac))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  return signature.length === expected.length && signature === expected;
}

Deno.serve(async (req) => {
  if (req.method === 'GET') return verifyChallenge(req);
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  const bodyText = await req.text();
  if (!(await signatureOk(req, bodyText))) return new Response('Forbidden', { status: 403 });

  let payload: unknown;
  try {
    payload = JSON.parse(bodyText);
  } catch {
    return ack();
  }

  const inbounds = parseWhatsAppWebhook(payload);
  if (inbounds.length === 0) return ack();

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });

  for (const inbound of inbounds) {
    const { data: channel } = await admin
      .from('agent_channels')
      .select('id, user_id, bot_token, external_account_id, active')
      .eq('channel', 'whatsapp')
      .eq('external_account_id', inbound.phoneNumberId)
      .maybeSingle();

    if (!channel || !channel.active || !channel.bot_token || !channel.external_account_id) continue;
    if (!inbound.text.trim()) continue;

    const userId = channel.user_id as string;
    try {
      await runAgentTurn(admin, {
        userId,
        channel: 'whatsapp',
        inbound,
        deliver: (text) =>
          sendWhatsAppText(
            channel.bot_token as string,
            channel.external_account_id as string,
            inbound.externalThreadId,
            text,
          ),
      });
    } catch (e) {
      await logEvent(admin, { userId, kind: 'error', source: 'whatsapp', detail: { stage: 'handler', error: String(e) } });
    }
  }

  return ack();
});
