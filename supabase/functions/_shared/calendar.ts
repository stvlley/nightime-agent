// Connected-calendar sync (Deno IO).
//
// Pushes a confirmed booking to the provider's connected calendar and stamps the
// booking with the external event id. The 'google' provider calls the Calendar
// API with the stored OAuth tokens (refreshing the access token when needed);
// the 'simulated' provider writes to a local calendar_events table so the flow
// is verifiable without external OAuth. A local mirror row is written for both
// so the in-app calendar view is consistent. Best-effort: a sync failure never
// blocks the booking itself.

import type { SupabaseClient } from 'npm:@supabase/supabase-js@2.55.0';
import { buildEventTitle, makeSimulatedEventId } from './calendarLogic.ts';
import {
  GOOGLE_TOKEN_ENDPOINT,
  buildGoogleEventBody,
  expiryIsoFromExpiresIn,
  isAccessTokenExpired,
} from './googleCalendar.ts';

type Admin = SupabaseClient;

export interface CalendarSyncResult {
  synced: boolean;
  externalEventId?: string;
  reason?: string;
}

interface ConnectionRow {
  provider: string;
  status: string;
  external_calendar_id: string | null;
  access_token: string | null;
  refresh_token: string | null;
  metadata: Record<string, unknown> | null;
}

/** Ensure a non-expired Google access token, refreshing + persisting if needed.
 *  Returns the usable access token, or null when it can't be obtained. */
async function ensureGoogleAccessToken(admin: Admin, userId: string, connection: ConnectionRow): Promise<string | null> {
  const expiry = (connection.metadata?.expiry as string | undefined) ?? null;
  if (connection.access_token && !isAccessTokenExpired(expiry, Date.now())) {
    return connection.access_token;
  }
  if (!connection.refresh_token) return null;

  const clientId = Deno.env.get('GOOGLE_OAUTH_CLIENT_ID') ?? '';
  const clientSecret = Deno.env.get('GOOGLE_OAUTH_CLIENT_SECRET') ?? '';
  if (!clientId || !clientSecret) return null;

  const res = await fetch(GOOGLE_TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: connection.refresh_token,
      grant_type: 'refresh_token',
    }),
  });
  const tokens = await res.json().catch(() => ({}));
  if (!res.ok || !tokens.access_token) return null;

  await admin
    .from('calendar_connections')
    .update({
      access_token: tokens.access_token,
      metadata: { ...(connection.metadata ?? {}), expiry: expiryIsoFromExpiresIn(Number(tokens.expires_in), Date.now()) },
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId);

  return tokens.access_token;
}

/** Insert the booking as an event on the provider's Google Calendar. */
async function pushToGoogle(
  admin: Admin,
  userId: string,
  connection: ConnectionRow,
  params: { startIso: string; endIso: string; serviceName?: string | null; clientName?: string | null },
): Promise<CalendarSyncResult> {
  const accessToken = await ensureGoogleAccessToken(admin, userId, connection);
  if (!accessToken) {
    await admin.from('calendar_connections').update({ status: 'error' }).eq('user_id', userId);
    return { synced: false, reason: 'google_token_unavailable' };
  }

  const calendarId = connection.external_calendar_id || 'primary';
  const body = buildGoogleEventBody({
    summary: buildEventTitle(params.serviceName, params.clientName),
    startIso: params.startIso,
    endIso: params.endIso,
  });

  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
    {
      method: 'POST',
      headers: { authorization: `Bearer ${accessToken}`, 'content-type': 'application/json' },
      body: JSON.stringify(body),
    },
  );
  const event = await res.json().catch(() => ({}));
  if (!res.ok || !event.id) {
    return { synced: false, reason: `google_insert_failed_${res.status}` };
  }
  return { synced: true, externalEventId: event.id as string };
}

export async function syncBookingToCalendar(
  admin: Admin,
  params: {
    userId: string;
    bookingId: string;
    startIso: string;
    endIso: string;
    serviceName?: string | null;
    clientName?: string | null;
  },
): Promise<CalendarSyncResult> {
  const { userId, bookingId, startIso, endIso, serviceName, clientName } = params;

  const { data: connection } = await admin
    .from('calendar_connections')
    .select('provider, status, external_calendar_id, access_token, refresh_token, metadata')
    .eq('user_id', userId)
    .maybeSingle();

  if (!connection || connection.status !== 'connected') {
    return { synced: false, reason: 'no_calendar_connected' };
  }

  // 'google' pushes to the real calendar; 'simulated' uses a generated id.
  let externalEventId: string;
  if (connection.provider === 'google') {
    const pushed = await pushToGoogle(admin, userId, connection as ConnectionRow, { startIso, endIso, serviceName, clientName });
    if (!pushed.synced || !pushed.externalEventId) return pushed;
    externalEventId = pushed.externalEventId;
  } else {
    externalEventId = makeSimulatedEventId();
  }

  // Mirror the event locally (in-app calendar view) and stamp the booking.
  const title = buildEventTitle(serviceName, clientName);
  const { error: evtError } = await admin.from('calendar_events').upsert(
    {
      user_id: userId,
      booking_id: bookingId,
      external_event_id: externalEventId,
      title,
      start: startIso,
      end: endIso,
      status: 'confirmed',
    },
    { onConflict: 'booking_id' },
  );
  if (evtError) return { synced: false, reason: evtError.message };

  await admin.from('bookings').update({ calendar_event_id: externalEventId }).eq('id', bookingId);
  return { synced: true, externalEventId };
}
