import { describe, expect, it } from 'vitest';
import { generateSimulatedNumber, isE164, provisionSmsNumber } from '../supabase/functions/_shared/smsNumber';

describe('isE164', () => {
  it.each(['+14155550199', '+447911123456', '+12002000000'])('accepts %s', (n) => {
    expect(isE164(n)).toBe(true);
  });
  it.each(['4155550199', '+0123456789', '+1', 'not-a-number', ''])('rejects %s', (n) => {
    expect(isE164(n)).toBe(false);
  });
});

describe('generateSimulatedNumber', () => {
  it('produces a valid +1 E.164 number', () => {
    const n = generateSimulatedNumber(() => 0.5);
    expect(isE164(n)).toBe(true);
    expect(n.startsWith('+1')).toBe(true);
    expect(n).toHaveLength(12); // +1 plus 10 digits
  });

  it('follows NANP leading-digit rules (area & exchange start 2–9)', () => {
    const n = generateSimulatedNumber(() => 0); // smallest values
    // +1 [area=2,0,0] [exchange=2,0,0] [subscriber=0000]
    expect(n).toBe('+12002000000');
    expect(n[2]).not.toBe('0');
    expect(n[2]).not.toBe('1');
    expect(n[5]).not.toBe('0'); // exchange leading digit
  });
});

describe('provisionSmsNumber', () => {
  it('returns a free simulated number', async () => {
    const result = await provisionSmsNumber(async () => false, () => 0.3);
    expect(result.provider).toBe('simulated');
    expect(isE164(result.number)).toBe(true);
  });

  it('retries past a collision until it finds a free number', async () => {
    let calls = 0;
    // First candidate is "taken", second is free. Vary rand so candidates differ.
    const rand = () => ((calls % 2) === 0 ? 0.1 : 0.9);
    const isTaken = async () => {
      calls++;
      return calls === 1; // only the very first candidate collides
    };
    const result = await provisionSmsNumber(isTaken, rand);
    expect(isE164(result.number)).toBe(true);
    expect(calls).toBeGreaterThanOrEqual(2);
  });

  it('throws if it cannot allocate after retries', async () => {
    await expect(provisionSmsNumber(async () => true, () => 0.5)).rejects.toThrow('could_not_allocate_number');
  });
});
