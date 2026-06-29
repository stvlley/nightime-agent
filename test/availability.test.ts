import { describe, expect, it } from 'vitest';
import {
  computeFreeSlots,
  formatSlotOffer,
  parseTimeToMinutes,
  suggestSlots,
  type ComputeSlotsParams,
  type WeeklyAvailability,
} from '../supabase/functions/_shared/availability';

// All tests pin nowMs and use UTC (offsetMinutes: 0) for deterministic instants.
// 2026-06-29 is a Monday (getUTCDay === 1).
const MON_2026_06_29 = Date.UTC(2026, 5, 29); // local midnight UTC for that date
const NOW = Date.UTC(2026, 5, 29, 0, 0); // start of that Monday

// Mon–Fri 09:00–17:00 in UTC.
const NINE_TO_FIVE: WeeklyAvailability[] = [1, 2, 3, 4, 5].map((dayOfWeek) => ({
  dayOfWeek,
  startTime: '09:00',
  endTime: '17:00',
}));

function base(overrides: Partial<ComputeSlotsParams> = {}): ComputeSlotsParams {
  return {
    weekly: NINE_TO_FIVE,
    durationMinutes: 60,
    fromDateLocal: '2026-06-29',
    days: 1,
    offsetMinutes: 0,
    nowMs: NOW,
    ...overrides,
  };
}

describe('parseTimeToMinutes', () => {
  it('parses HH:MM and HH:MM:SS', () => {
    expect(parseTimeToMinutes('09:00')).toBe(540);
    expect(parseTimeToMinutes('17:30:00')).toBe(1050);
  });
  it('rejects malformed or out-of-range values', () => {
    expect(parseTimeToMinutes('9am')).toBeNull();
    expect(parseTimeToMinutes('24:00')).toBeNull();
    expect(parseTimeToMinutes('10:75')).toBeNull();
    expect(parseTimeToMinutes('')).toBeNull();
  });
});

describe('computeFreeSlots — basic generation', () => {
  it('generates back-to-back 60-min slots across a single day', () => {
    const slots = computeFreeSlots(base());
    // 09:00–17:00 = 8 hours → 8 one-hour slots, 09:00 … 16:00.
    expect(slots).toHaveLength(8);
    expect(slots[0].startIso).toBe('2026-06-29T09:00:00.000Z');
    expect(slots[0].endIso).toBe('2026-06-29T10:00:00.000Z');
    expect(slots[7].startIso).toBe('2026-06-29T16:00:00.000Z');
    expect(slots[7].endIso).toBe('2026-06-29T17:00:00.000Z');
  });

  it('honors a custom slot interval', () => {
    const slots = computeFreeSlots(base({ durationMinutes: 60, slotIntervalMinutes: 120 }));
    // 09:00, 11:00, 13:00, 15:00 (17:00 start would not fit a 60-min slot).
    expect(slots.map((s) => s.label.split('· ')[1])).toEqual(['9:00 AM', '11:00 AM', '1:00 PM', '3:00 PM']);
  });

  it('only fits slots whose full duration is within the window', () => {
    // 90-min service in an 8h window starting on the hour → starts 09:00..15:30 stepping 90m.
    const slots = computeFreeSlots(base({ durationMinutes: 90 }));
    expect(slots[0].startIso).toBe('2026-06-29T09:00:00.000Z');
    const last = slots[slots.length - 1];
    expect(Date.parse(last.endIso)).toBeLessThanOrEqual(Date.UTC(2026, 5, 29, 17, 0));
  });

  it('returns nothing on a day with no availability window', () => {
    // 2026-07-04 is a Saturday → not in Mon–Fri availability.
    const slots = computeFreeSlots(base({ fromDateLocal: '2026-07-04', days: 1, nowMs: Date.UTC(2026, 6, 4) }));
    expect(slots).toHaveLength(0);
  });
});

describe('computeFreeSlots — exclusions', () => {
  it('excludes slots overlapping a busy booking', () => {
    const slots = computeFreeSlots(
      base({
        bookings: [{ start: '2026-06-29T10:00:00.000Z', end: '2026-06-29T11:00:00.000Z', status: 'confirmed' }],
      }),
    );
    expect(slots.some((s) => s.startIso === '2026-06-29T10:00:00.000Z')).toBe(false);
    // 11:00 is free again (booking ended exactly at 11:00).
    expect(slots.some((s) => s.startIso === '2026-06-29T11:00:00.000Z')).toBe(true);
    expect(slots).toHaveLength(7);
  });

  it('ignores cancelled / no_show bookings (they do not block)', () => {
    const slots = computeFreeSlots(
      base({
        bookings: [
          { start: '2026-06-29T10:00:00.000Z', end: '2026-06-29T11:00:00.000Z', status: 'cancelled' },
          { start: '2026-06-29T12:00:00.000Z', end: '2026-06-29T13:00:00.000Z', status: 'no_show' },
        ],
      }),
    );
    expect(slots).toHaveLength(8);
  });

  it('treats a partial overlap as busy', () => {
    // Booking 10:30–10:45 sits inside the 10:00 slot → that slot is blocked.
    const slots = computeFreeSlots(
      base({ bookings: [{ start: '2026-06-29T10:30:00.000Z', end: '2026-06-29T10:45:00.000Z', status: 'tentative' }] }),
    );
    expect(slots.some((s) => s.startIso === '2026-06-29T10:00:00.000Z')).toBe(false);
  });

  it('skips entire days inside a time-off range', () => {
    const slots = computeFreeSlots(
      base({
        days: 5, // Mon–Fri
        timeOff: [{ startDate: '2026-06-30', endDate: '2026-07-01' }], // Tue–Wed off
      }),
    );
    const dates = new Set(slots.map((s) => s.startIso.slice(0, 10)));
    expect(dates.has('2026-06-30')).toBe(false);
    expect(dates.has('2026-07-01')).toBe(false);
    expect(dates.has('2026-06-29')).toBe(true);
    expect(dates.has('2026-07-02')).toBe(true);
  });

  it('excludes slots before now + lead time', () => {
    // "Now" is 11:15 on the Monday with a 2h lead → first bookable start is 14:00.
    const slots = computeFreeSlots(base({ nowMs: Date.UTC(2026, 5, 29, 11, 15), minLeadMinutes: 120 }));
    expect(slots[0].startIso).toBe('2026-06-29T14:00:00.000Z');
  });
});

describe('computeFreeSlots — timezone offset & labels', () => {
  it('interprets availability as local wall-clock at the given offset', () => {
    // offset -240 (e.g. New York DST). 09:00 local = 13:00 UTC.
    const slots = computeFreeSlots(base({ offsetMinutes: -240, nowMs: Date.UTC(2026, 5, 29, 0, 0) }));
    expect(slots[0].startIso).toBe('2026-06-29T13:00:00.000Z');
    expect(slots[0].label).toContain('9:00 AM');
    expect(slots[0].label).toContain('Mon, Jun 29');
  });

  it('renders a 12-hour label in the local offset', () => {
    const slots = computeFreeSlots(base());
    // 16:00 UTC slot at offset 0 → "4:00 PM".
    expect(slots[7].label).toBe('Mon, Jun 29 · 4:00 PM');
  });
});

describe('suggestSlots & formatSlotOffer', () => {
  it('returns at most the requested count', () => {
    expect(suggestSlots(base(), 3)).toHaveLength(3);
    expect(suggestSlots(base(), 1)).toHaveLength(1);
  });

  it('formats a natural multi-slot offer', () => {
    const offer = formatSlotOffer(suggestSlots(base(), 3));
    expect(offer).toContain('I have a few openings');
    expect(offer).toContain(' or ');
    expect(offer.endsWith('Which works best for you?')).toBe(true);
  });

  it('offers a graceful fallback when there are no openings', () => {
    const offer = formatSlotOffer([]);
    expect(offer).toContain("don't have any openings");
  });
});
