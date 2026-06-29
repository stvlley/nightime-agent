// Connected-calendar helpers — pure, dependency-free (shared with vitest).
//
// The IO (reading the connection, writing events, stamping the booking) lives in
// calendar.ts; these are the pure bits: building an external event id and a
// human event title. Kept import-free so they can be unit-tested without the
// Deno/Supabase-only sync module.

/** A plausible external calendar event id. `rand` is injectable for tests. */
export function makeSimulatedEventId(rand: () => number = Math.random): string {
  const hex = Array.from({ length: 16 }, () => Math.floor(rand() * 16).toString(16)).join('');
  return `sim-evt-${hex}`;
}

/** The title shown on the connected calendar for a booking. */
export function buildEventTitle(serviceName?: string | null, clientName?: string | null): string {
  const service = (serviceName || '').trim() || 'Appointment';
  const client = (clientName || '').trim();
  return client ? `${service} — ${client}` : service;
}
