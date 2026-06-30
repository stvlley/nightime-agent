// Connected-calendar helpers — pure, dependency-free (shared with vitest).
//
// The IO (reading the connection, writing events, stamping the booking) lives in
// calendar.ts; these are the pure bits: building an external event id and a
// human event title. Kept import-free so they can be unit-tested without the
// Deno/Supabase-only sync module.

/** An id for an event on the app's own (internal) calendar. Used when there is
 *  no external event id to reference. `rand` is injectable for tests. */
export function makeLocalEventId(rand: () => number = Math.random): string {
  const hex = Array.from({ length: 16 }, () => Math.floor(rand() * 16).toString(16)).join('');
  return `evt-${hex}`;
}

/** The title shown on the connected calendar for a booking. */
export function buildEventTitle(serviceName?: string | null, clientName?: string | null): string {
  const service = (serviceName || '').trim() || 'Appointment';
  const client = (clientName || '').trim();
  return client ? `${service} — ${client}` : service;
}
