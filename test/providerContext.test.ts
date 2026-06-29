import { describe, expect, it } from 'vitest';
import { formatPrice, summarizeHours, summarizeServices } from '../supabase/functions/_shared/providerContext';

describe('formatPrice', () => {
  it('formats whole and fractional dollar amounts', () => {
    expect(formatPrice(25000)).toBe('$250');
    expect(formatPrice(25050)).toBe('$250.50');
  });

  it('returns null for missing or non-positive prices', () => {
    expect(formatPrice(0)).toBeNull();
    expect(formatPrice(null)).toBeNull();
    expect(formatPrice(undefined)).toBeNull();
  });

  it('uses the currency code for non-USD', () => {
    expect(formatPrice(12000, 'EUR')).toBe('120 EUR');
  });
});

describe('summarizeServices', () => {
  it('renders name, duration, and price', () => {
    expect(summarizeServices([{ name: 'Massage', durationMinutes: 60, priceCents: 25000, currency: 'USD' }])).toBe(
      'Massage (60 min, $250)',
    );
  });

  it('joins multiple services and omits a missing price', () => {
    expect(
      summarizeServices([
        { name: 'Massage', durationMinutes: 60, priceCents: 25000 },
        { name: 'Deep Tissue', durationMinutes: 90, priceCents: null },
      ]),
    ).toBe('Massage (60 min, $250); Deep Tissue (90 min)');
  });

  it('returns just the name when nothing else is set', () => {
    expect(summarizeServices([{ name: 'Consultation' }])).toBe('Consultation');
  });
});

describe('summarizeHours', () => {
  it('collapses consecutive same-window days into a range', () => {
    const rows = [1, 2, 3, 4, 5].map((d) => ({ dayOfWeek: d, startTime: '09:00', endTime: '17:00' }));
    expect(summarizeHours(rows)).toBe('Mon–Fri 9 AM–5 PM');
  });

  it('splits non-contiguous days and differing windows', () => {
    expect(
      summarizeHours([
        { dayOfWeek: 1, startTime: '09:00', endTime: '17:00' },
        { dayOfWeek: 2, startTime: '09:00', endTime: '17:00' },
        { dayOfWeek: 6, startTime: '10:00', endTime: '14:30' },
      ]),
    ).toBe('Mon–Tue 9 AM–5 PM; Sat 10 AM–2:30 PM');
  });

  it('returns an empty string when there is no availability', () => {
    expect(summarizeHours([])).toBe('');
  });
});
