// Google Calendar OAuth + event helpers — pure, dependency-free (shared with
// vitest). The Deno IO (token exchange/refresh, events.insert) lives in
// calendar.ts and the calendar-callback function; these are the pure bits:
// building the consent URL, the event request body, and token-expiry math.

export const GOOGLE_CALENDAR_SCOPE = 'https://www.googleapis.com/auth/calendar.events';
export const GOOGLE_AUTH_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth';
export const GOOGLE_TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';

/** The consent URL we send the provider to. `offline` + `consent` so Google
 *  returns a refresh token we can use to sync future bookings unattended. */
export function buildGoogleAuthUrl(params: {
  clientId: string;
  redirectUri: string;
  state: string;
  scope?: string;
}): string {
  const query = new URLSearchParams({
    client_id: params.clientId,
    redirect_uri: params.redirectUri,
    response_type: 'code',
    scope: params.scope ?? GOOGLE_CALENDAR_SCOPE,
    access_type: 'offline',
    prompt: 'consent',
    include_granted_scopes: 'true',
    state: params.state,
  });
  return `${GOOGLE_AUTH_ENDPOINT}?${query.toString()}`;
}

/** The events.insert request body for a booking. A dateTime carrying a UTC
 *  offset is an absolute instant, so timeZone is optional (display only). */
export function buildGoogleEventBody(params: {
  summary: string;
  startIso: string;
  endIso: string;
  timeZone?: string | null;
  description?: string | null;
}): Record<string, unknown> {
  const start: Record<string, unknown> = { dateTime: params.startIso };
  const end: Record<string, unknown> = { dateTime: params.endIso };
  if (params.timeZone) {
    start.timeZone = params.timeZone;
    end.timeZone = params.timeZone;
  }
  const body: Record<string, unknown> = { summary: params.summary, start, end };
  if (params.description) body.description = params.description;
  return body;
}

/** ISO expiry from Google's `expires_in` (seconds). */
export function expiryIsoFromExpiresIn(expiresInSeconds: number, nowMs: number): string {
  const seconds = Number.isFinite(expiresInSeconds) ? expiresInSeconds : 0;
  return new Date(nowMs + seconds * 1000).toISOString();
}

/** True when the access token is missing or within `skewMs` of expiring. */
export function isAccessTokenExpired(expiryIso: string | null | undefined, nowMs: number, skewMs = 60_000): boolean {
  if (!expiryIso) return true;
  const expiry = Date.parse(expiryIso);
  if (!Number.isFinite(expiry)) return true;
  return nowMs >= expiry - skewMs;
}
