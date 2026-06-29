// Appointment availability engine — pure, runtime-agnostic, dependency-free.
//
// Given a provider's weekly recurring availability, their existing bookings, and
// any time-off blackouts, this computes concrete open appointment slots that fit
// a requested service duration. Like agentLogic.ts it imports nothing (no Deno,
// Supabase, or date library) so the Edge Function, vitest, and any future runtime
// share identical behavior.
//
// Timezone model: the provider's availability `start_time`/`end_time` are local
// wall-clock times in a fixed UTC offset (`offsetMinutes`, minutes EAST of UTC).
// Slots are returned as absolute UTC ISO timestamps plus a human label rendered
// in that same local offset. A fixed offset (not full IANA/DST) keeps the engine
// pure and deterministic; callers pass the provider's current offset.

export interface WeeklyAvailability {
  /** 0 = Sunday … 6 = Saturday (matches Date.getUTCDay and the DB CHECK). */
  dayOfWeek: number;
  /** Local wall-clock 'HH:MM' or 'HH:MM:SS'. */
  startTime: string;
  endTime: string;
  active?: boolean;
}

/** A busy interval (an existing booking) as absolute ISO timestamps. */
export interface BusyInterval {
  start: string;
  end: string;
  /** Only these statuses block a slot; cancelled/no_show do not. Defaults to busy. */
  status?: string | null;
}

/** A blackout date range (inclusive), local calendar dates 'YYYY-MM-DD'. */
export interface TimeOffRange {
  startDate: string;
  endDate: string;
}

export interface OpenSlot {
  /** Absolute UTC instant when the slot starts / ends. */
  startIso: string;
  endIso: string;
  /** Human-readable label in the provider's local offset, e.g. "Tue, Jul 1 · 2:00 PM". */
  label: string;
}

export interface ComputeSlotsParams {
  weekly: WeeklyAvailability[];
  bookings?: BusyInterval[];
  timeOff?: TimeOffRange[];
  /** Service length the slot must accommodate. */
  durationMinutes: number;
  /** First local calendar date to consider, 'YYYY-MM-DD'. */
  fromDateLocal: string;
  /** Number of calendar days to scan from fromDateLocal (inclusive). */
  days: number;
  /** Provider local UTC offset in minutes east of UTC (e.g. New York DST = -240). */
  offsetMinutes: number;
  /** Step between candidate slot starts; defaults to durationMinutes (back-to-back). */
  slotIntervalMinutes?: number;
  /** Earliest absolute instant a slot may start (excludes the past). Defaults to now. */
  nowMs?: number;
  /** Minimum lead time before a slot may start, in minutes. */
  minLeadMinutes?: number;
  /** Cap on returned slots. */
  maxSlots?: number;
}

/** Booking statuses that occupy the calendar. Anything else (cancelled, no_show) frees the slot. */
const BUSY_STATUSES = new Set(['tentative', 'confirmed', 'completed', 'pending']);

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_LABELS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

const DAY_MS = 86_400_000;
const MIN_MS = 60_000;

/** Parse 'HH:MM' or 'HH:MM:SS' into minutes since local midnight, or null if malformed. */
export function parseTimeToMinutes(value: string): number | null {
  const m = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec((value || '').trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h < 0 || h > 23 || min < 0 || min > 59) return null;
  return h * 60 + min;
}

/** Parse a 'YYYY-MM-DD' local date into UTC-midnight epoch ms (used for calendar math), or null. */
function parseLocalDateToBaseMs(value: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec((value || '').trim());
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  return Date.UTC(y, mo - 1, d);
}

function ymd(baseMs: number): { y: number; mo: number; d: number } {
  const dt = new Date(baseMs);
  return { y: dt.getUTCFullYear(), mo: dt.getUTCMonth() + 1, d: dt.getUTCDate() };
}

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function localDateString(baseMs: number): string {
  const { y, mo, d } = ymd(baseMs);
  return `${y}-${pad(mo)}-${pad(d)}`;
}

/** Render an absolute instant as a local-offset label like "Tue, Jul 1 · 2:00 PM". */
function labelFor(instantMs: number, offsetMinutes: number): string {
  const local = new Date(instantMs + offsetMinutes * MIN_MS);
  const weekday = WEEKDAY_LABELS[local.getUTCDay()];
  const month = MONTH_LABELS[local.getUTCMonth()];
  const day = local.getUTCDate();
  let hour = local.getUTCHours();
  const minute = local.getUTCMinutes();
  const ampm = hour >= 12 ? 'PM' : 'AM';
  hour = hour % 12;
  if (hour === 0) hour = 12;
  return `${weekday}, ${month} ${day} · ${hour}:${pad(minute)} ${ampm}`;
}

function overlapsBusy(startMs: number, endMs: number, busy: Array<{ start: number; end: number }>): boolean {
  for (const b of busy) {
    if (startMs < b.end && endMs > b.start) return true;
  }
  return false;
}

function isWithinTimeOff(dateStr: string, ranges: Array<{ start: string; end: string }>): boolean {
  for (const r of ranges) {
    if (dateStr >= r.start && dateStr <= r.end) return true;
  }
  return false;
}

/**
 * Compute concrete open appointment slots. Returns slots sorted ascending by
 * start, each fitting `durationMinutes` entirely within a weekly availability
 * window, not overlapping a busy booking, not on a time-off day, and not before
 * `nowMs + minLeadMinutes`.
 */
export function computeFreeSlots(params: ComputeSlotsParams): OpenSlot[] {
  const {
    weekly,
    bookings = [],
    timeOff = [],
    durationMinutes,
    fromDateLocal,
    days,
    offsetMinutes,
    slotIntervalMinutes,
    nowMs = Date.now(),
    minLeadMinutes = 0,
    maxSlots,
  } = params;

  if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) return [];
  const base = parseLocalDateToBaseMs(fromDateLocal);
  if (base === null || !Number.isFinite(days) || days <= 0) return [];

  const step = slotIntervalMinutes && slotIntervalMinutes > 0 ? slotIntervalMinutes : durationMinutes;
  const earliestStart = nowMs + minLeadMinutes * MIN_MS;

  // Normalize busy intervals to ms once, dropping non-blocking statuses and junk.
  const busy = bookings
    .filter((b) => BUSY_STATUSES.has((b.status ?? 'confirmed').toLowerCase()))
    .map((b) => ({ start: Date.parse(b.start), end: Date.parse(b.end) }))
    .filter((b) => Number.isFinite(b.start) && Number.isFinite(b.end) && b.end > b.start);

  const offRanges = timeOff
    .filter((t) => t.startDate && t.endDate)
    .map((t) => ({ start: t.startDate, end: t.endDate }));

  // Index availability windows by weekday for O(1) lookup per day.
  const windowsByDow = new Map<number, Array<{ startMin: number; endMin: number }>>();
  for (const w of weekly) {
    if (w.active === false) continue;
    const startMin = parseTimeToMinutes(w.startTime);
    const endMin = parseTimeToMinutes(w.endTime);
    if (startMin === null || endMin === null || endMin <= startMin) continue;
    const list = windowsByDow.get(w.dayOfWeek) ?? [];
    list.push({ startMin, endMin });
    windowsByDow.set(w.dayOfWeek, list);
  }

  const slots: OpenSlot[] = [];

  for (let i = 0; i < days; i++) {
    const dayBase = base + i * DAY_MS;
    const dateStr = localDateString(dayBase);
    if (isWithinTimeOff(dateStr, offRanges)) continue;

    const dow = new Date(dayBase).getUTCDay();
    const windows = windowsByDow.get(dow);
    if (!windows) continue;

    // Local midnight of this calendar date as an absolute instant.
    const localMidnightUtcMs = dayBase - offsetMinutes * MIN_MS;

    for (const win of windows) {
      for (let m = win.startMin; m + durationMinutes <= win.endMin; m += step) {
        const startMs = localMidnightUtcMs + m * MIN_MS;
        const endMs = startMs + durationMinutes * MIN_MS;
        if (startMs < earliestStart) continue;
        if (overlapsBusy(startMs, endMs, busy)) continue;
        slots.push({
          startIso: new Date(startMs).toISOString(),
          endIso: new Date(endMs).toISOString(),
          label: labelFor(startMs, offsetMinutes),
        });
        if (maxSlots && slots.length >= maxSlots) return slots;
      }
    }
  }

  return slots;
}

/** The first `count` open slots (default 3) — the agent's suggested times. */
export function suggestSlots(params: ComputeSlotsParams, count = 3): OpenSlot[] {
  return computeFreeSlots({ ...params, maxSlots: count });
}

/** A natural, non-robotic sentence offering the suggested times. */
export function formatSlotOffer(slots: OpenSlot[]): string {
  if (slots.length === 0) {
    return "I don't have any openings in that window right now — would another day work for you?";
  }
  const labels = slots.map((s) => s.label);
  const list =
    labels.length === 1
      ? labels[0]
      : `${labels.slice(0, -1).join(', ')} or ${labels[labels.length - 1]}`;
  return `I have a few openings: ${list}. Which works best for you?`;
}
