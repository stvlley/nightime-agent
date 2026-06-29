// Connected-calendar sync (Deno IO).
//
// Pushes a confirmed booking to the provider's connected calendar and stamps the
// booking with the external event id. Today the 'simulated' provider writes to a
// local calendar_events table so the flow is verifiable end-to-end; a real
// 'google' provider would call the Calendar API here using the stored OAuth
// tokens. Best-effort: a sync failure never blocks the booking itself.

import type { SupabaseClient } from 'npm:@supabase/supabase-js@2.55.0';
import { buildEventTitle, makeSimulatedEventId } from './calendarLogic.ts';

type Admin = SupabaseClient;

export interface CalendarSyncResult {
  synced: boolean;
  externalEventId?: string;
  reason?: string;
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
    .select('provider, status')
    .eq('user_id', userId)
    .maybeSingle();

  if (!connection || connection.status !== 'connected') {
    return { synced: false, reason: 'no_calendar_connected' };
  }

  // 'simulated' (default) writes a local mirror; 'google' would call the API.
  const externalEventId = makeSimulatedEventId();
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
