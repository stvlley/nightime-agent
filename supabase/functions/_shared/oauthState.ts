// Signed OAuth `state` for the calendar connect flow (Deno).
//
// connect-calendar (JWT-verified) signs `userId` into the state it sends to
// Google; calendar-callback (public) verifies the signature before trusting the
// userId, so the public redirect can't be forged to connect someone else's
// calendar. HMAC-SHA256 over "userId.expiry", short TTL — no DB round-trip.

const encoder = new TextEncoder();

async function hmacHex(secret: string, data: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(data));
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** Returns "userId.expiryMs.signature". TTL defaults to 10 minutes. */
export async function signState(
  secret: string,
  userId: string,
  ttlMs = 600_000,
  nowMs: number = Date.now(),
): Promise<string> {
  const expiry = nowMs + ttlMs;
  const payload = `${userId}.${expiry}`;
  return `${payload}.${await hmacHex(secret, payload)}`;
}

/** Returns the userId when the state is valid and unexpired, else null. */
export async function verifyState(
  secret: string,
  state: string,
  nowMs: number = Date.now(),
): Promise<string | null> {
  const parts = (state || '').split('.');
  if (parts.length !== 3) return null;
  const [userId, expiryStr, signature] = parts;
  const expiry = Number(expiryStr);
  if (!userId || !Number.isFinite(expiry) || nowMs > expiry) return null;
  const expected = await hmacHex(secret, `${userId}.${expiryStr}`);
  return expected === signature ? userId : null;
}
