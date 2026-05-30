// Small HTTP helpers shared by the Edge Functions (Deno).

export const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

/** Telegram retries on any non-2xx, so the webhook acks even on ignored updates. */
export function ack(): Response {
  return new Response('ok', { status: 200 });
}
