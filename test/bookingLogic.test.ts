import { describe, expect, it } from 'vitest';
import {
  formatBookingConfirmation,
  isAffirmative,
  isDecline,
  parseClockMinutes,
  selectSlot,
} from '../supabase/functions/_shared/bookingLogic';
import type { OpenSlot } from '../supabase/functions/_shared/availability';

function slot(label: string, startIso = '2026-06-30T00:00:00.000Z'): OpenSlot {
  return { startIso, endIso: startIso, label };
}

// Three offers: Tue 9:00 AM, Tue 2:00 PM, Wed 10:00 AM.
const OFFERS: OpenSlot[] = [
  slot('Tue, Jun 30 · 9:00 AM'),
  slot('Tue, Jun 30 · 2:00 PM'),
  slot('Wed, Jul 1 · 10:00 AM'),
];

describe('isAffirmative / isDecline', () => {
  it.each(['yes', 'that works', 'sounds good', 'book it', 'sure'])('treats %s as affirmative', (t) => {
    expect(isAffirmative(t)).toBe(true);
  });
  it.each(['none of those work', 'can\'t make it', 'another time please', 'never mind'])(
    'treats %s as a decline',
    (t) => {
      expect(isDecline(t)).toBe(true);
    },
  );
  it('does not treat a decline as affirmative', () => {
    expect(isAffirmative('no thanks, another time')).toBe(false);
  });
});

describe('parseClockMinutes', () => {
  it.each([
    ['2pm', 14 * 60],
    ['2:30 pm', 14 * 60 + 30],
    ['11 am', 11 * 60],
    ['12pm', 12 * 60],
    ['12 am', 0],
    ['14:00', 14 * 60],
    ['09:15', 9 * 60 + 15],
  ])('parses %s', (text, expected) => {
    expect(parseClockMinutes(text)).toBe(expected);
  });
  it('returns null when there is no time', () => {
    expect(parseClockMinutes('sometime next week')).toBeNull();
  });
});

describe('selectSlot', () => {
  it('selects by explicit unique time', () => {
    const sel = selectSlot('2pm works for me', OFFERS);
    expect(sel?.index).toBe(1);
    expect(sel?.reason).toBe('time');
  });

  it('disambiguates a duplicated time with a weekday', () => {
    const dupes = [slot('Tue, Jun 30 · 9:00 AM'), slot('Wed, Jul 1 · 9:00 AM')];
    const sel = selectSlot('wednesday at 9am', dupes);
    expect(sel?.index).toBe(1);
    expect(sel?.reason).toBe('weekday_time');
  });

  it('selects by ordinal words and "option N"', () => {
    expect(selectSlot('the first one please', OFFERS)?.index).toBe(0);
    expect(selectSlot('option 2', OFFERS)?.index).toBe(1);
    expect(selectSlot('the last one', OFFERS)?.index).toBe(2);
  });

  it('selects by unique weekday', () => {
    const sel = selectSlot('wednesday is best', OFFERS);
    expect(sel?.index).toBe(2);
    expect(sel?.reason).toBe('weekday');
  });

  it('does not select when a weekday is ambiguous across offers', () => {
    // "tuesday" matches both offer 0 and 1 with no time → ambiguous.
    expect(selectSlot('tuesday', OFFERS)).toBeNull();
  });

  it('accepts a plain yes only when a single slot was offered', () => {
    const one = [slot('Tue, Jun 30 · 9:00 AM')];
    expect(selectSlot('yes please', one)?.index).toBe(0);
    expect(selectSlot('yes please', one)?.reason).toBe('single_affirmation');
    // With multiple offers, a bare "yes" is ambiguous.
    expect(selectSlot('yes please', OFFERS)).toBeNull();
  });

  it('returns null on a decline even if a time appears', () => {
    expect(selectSlot('2pm doesn\'t work, another time', OFFERS)).toBeNull();
  });

  it('returns null with no offers', () => {
    expect(selectSlot('the first one', [])).toBeNull();
  });

  it('prefers an exact weekday+time pinpoint over ordinals', () => {
    const sel = selectSlot('tuesday at 2pm', OFFERS);
    expect(sel?.index).toBe(1);
    expect(sel?.reason).toBe('weekday_time');
  });
});

describe('formatBookingConfirmation', () => {
  it('includes the slot label and business name', () => {
    const msg = formatBookingConfirmation(OFFERS[1], 'Luna Wellness');
    expect(msg).toContain('Tue, Jun 30 · 2:00 PM');
    expect(msg).toContain('Luna Wellness');
    expect(msg).toContain('reminder');
  });
  it('works without a business name', () => {
    expect(formatBookingConfirmation(OFFERS[0])).toContain('Tue, Jun 30 · 9:00 AM');
  });
});
