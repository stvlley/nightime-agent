// Provider-context formatting — pure, dependency-free (shared with vitest).
//
// Turns the provider's configured services and weekly availability into short
// human strings the chat model can read, so the agent knows what the provider
// offers, for how much, and when — without the LLM ever inventing those facts.

export interface ServiceSummary {
  name: string;
  durationMinutes?: number | null;
  priceCents?: number | null;
  currency?: string | null;
}

export interface AvailabilityRow {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

const DAY_ABBR = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** "$250", "$250.50", or "120 EUR"; null when there is no positive price. */
export function formatPrice(cents?: number | null, currency?: string | null): string | null {
  if (cents == null || cents <= 0) return null;
  const amount = cents % 100 === 0 ? String(cents / 100) : (cents / 100).toFixed(2);
  return currency && currency !== 'USD' ? `${amount} ${currency}` : `$${amount}`;
}

/** "09:00" → "9 AM", "17:30" → "5:30 PM". */
function formatTime(hhmm: string): string {
  const [h, m] = (hhmm || '').split(':').map(Number);
  if (!Number.isFinite(h)) return hhmm;
  const period = h < 12 ? 'AM' : 'PM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return m ? `${hour12}:${String(m).padStart(2, '0')} ${period}` : `${hour12} ${period}`;
}

/** e.g. "Massage (60 min, $250); Deep Tissue (90 min, $350)". */
export function summarizeServices(services: ServiceSummary[]): string {
  return services
    .map((s) => {
      const bits: string[] = [];
      if (s.durationMinutes) bits.push(`${s.durationMinutes} min`);
      const price = formatPrice(s.priceCents, s.currency);
      if (price) bits.push(price);
      return bits.length ? `${s.name} (${bits.join(', ')})` : s.name;
    })
    .filter(Boolean)
    .join('; ');
}

/**
 * Collapse weekly availability into ranges of consecutive days that share the
 * same window, e.g. "Mon–Fri 9 AM–5 PM" or "Mon–Wed 9 AM–5 PM; Sat 10 AM–2 PM".
 */
export function summarizeHours(rows: AvailabilityRow[]): string {
  if (!rows.length) return '';
  const byDay = [...rows].sort((a, b) => a.dayOfWeek - b.dayOfWeek);

  const groups: Array<{ start: number; end: number; window: string }> = [];
  for (const row of byDay) {
    const window = `${formatTime(row.startTime)}–${formatTime(row.endTime)}`;
    const last = groups[groups.length - 1];
    if (last && last.window === window && row.dayOfWeek === last.end + 1) {
      last.end = row.dayOfWeek;
    } else {
      groups.push({ start: row.dayOfWeek, end: row.dayOfWeek, window });
    }
  }

  return groups
    .map((g) => {
      const days = g.start === g.end ? DAY_ABBR[g.start] : `${DAY_ABBR[g.start]}–${DAY_ABBR[g.end]}`;
      return `${days} ${g.window}`;
    })
    .join('; ');
}
