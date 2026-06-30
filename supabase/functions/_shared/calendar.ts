// Calendar sync (Deno IO).
//
// The app keeps its OWN internal calendar: every confirmed booking is recorded
// in calendar_events and stamped on the booking, with NO external account
// required. If the provider has additionally connected Google Calendar, the
// booking is also pushed there (refreshing the OAuth access token when needed)
// and the Google event id is used. Best-effort: an external push failure never
// blocks the booking or the internal calendar record.

import type { SupabaseClient } from 'npm:@supabase/supabase-js@2.55.0';
import { buildEventTitle, makeLocalEventId } from './calendarLogic.ts';
import {
  GOOGLE_TOKEN_ENDPOINT,
  buildGoogleEventBody,
  expiryIsoFromExpiresIn,
  isAccessTokenExpired,
} from './googleCalendar.ts';

type Admin = SupabaseClient;

export interface CalendarSyncResult {
  /** The internal calendar record was written (the booking is on our calendar). */
  synced: boolean;
  /** Event id stamped on the booking — the Google event id, or a local id. */
  externalEventId?: string;
  /** True when the booking was also pushed to a connected external calendar. */
  externalSynced?: boolean;
  /** 'google' when an external calendar is connected, else 'internal'. */
  externalProvider?: string;
  /** Reason an external push failed (the internal record still succeeds). */
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

  // Optional external mirror: push to Google when it's connected. If it fails we
  // still record the booking internally and fall back to a local event id.
  let externalEventId: string | null = null;
  let externalSynced = false;
  let externalReason: string | undefined;
  const hasGoogle = connection?.provider === 'google' && connection.status === 'connected';
  if (hasGoogle) {
    const pushed = await pushToGoogle(admin, userId, connection as ConnectionRow, { startIso, endIso, serviceName, clientName });
    if (pushed.synced && pushed.externalEventId) {
      externalEventId = pushed.externalEventId;
      externalSynced = true;
    } else {
      externalReason = pushed.reason;
    }
  }

  // Internal calendar is always on: record the booking on the app's own calendar
  // and stamp it, using the external event id when we have one.
  const eventId = externalEventId ?? makeLocalEventId();
  const { error: evtError } = await admin.from('calendar_events').upsert(
    {
      user_id: userId,
      booking_id: bookingId,
      external_event_id: eventId,
      title: buildEventTitle(serviceName, clientName),
      start: startIso,
      end: endIso,
      status: 'confirmed',
    },
    { onConflict: 'booking_id' },
  );
  if (evtError) return { synced: false, reason: evtError.message };

  await admin.from('bookings').update({ calendar_event_id: eventId }).eq('id', bookingId);
  return {
    synced: true,
    externalEventId: eventId,
    externalSynced,
    externalProvider: hasGoogle ? 'google' : 'internal',
    reason: externalReason,
  };
}
