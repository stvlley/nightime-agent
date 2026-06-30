import { describe, expect, it } from 'vitest';
import { buildEventTitle, makeLocalEventId } from '../supabase/functions/_shared/calendarLogic';

describe('makeLocalEventId', () => {
  it('produces a local evt id of hex chars', () => {
    const id = makeLocalEventId(() => 0.5);
    expect(id).toMatch(/^evt-[0-9a-f]{16}$/);
  });
  it('varies with the random source', () => {
    expect(makeLocalEventId(() => 0)).not.toBe(makeLocalEventId(() => 0.99));
  });
});

describe('buildEventTitle', () => {
  it('combines service and client', () => {
    expect(buildEventTitle('Deep Tissue Massage', 'Sara')).toBe('Deep Tissue Massage — Sara');
  });
  it('falls back to Appointment when no service', () => {
    expect(buildEventTitle(null, 'Sara')).toBe('Appointment — Sara');
  });
  it('omits the dash when no client', () => {
    expect(buildEventTitle('Swedish Massage', null)).toBe('Swedish Massage');
  });
});
