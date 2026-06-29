// Dedicated business SMS number provisioning — pure helpers.
//
// Issues a phone number for a provider's SMS channel when they don't already
// have one. The default implementation simulates provisioning (no external
// carrier) so the flow is fully testable; a real Twilio/Telnyx adapter can
// replace `provisionSmsNumber` behind the same interface without touching the
// callers. Number generation is pure (rand is injectable) so it is unit-tested.

export interface ProvisionedNumber {
  number: string; // E.164, e.g. +14155550199
  provider: 'simulated' | 'twilio' | 'telnyx';
}

/** True for a syntactically valid E.164 number (+ country code, 8–15 digits). */
export function isE164(value: string): boolean {
  return /^\+[1-9]\d{7,14}$/.test(value || '');
}

/**
 * Generate a plausible North American (+1) number following NANP digit rules
 * (area code and exchange start 2–9). `rand` is injectable for deterministic
 * tests; defaults to Math.random.
 */
export function generateSimulatedNumber(rand: () => number = Math.random): string {
  const digit = () => Math.floor(rand() * 10);
  const nonZeroLeading = () => 2 + Math.floor(rand() * 8); // 2–9
  const area = `${nonZeroLeading()}${digit()}${digit()}`;
  const exchange = `${nonZeroLeading()}${digit()}${digit()}`;
  const subscriber = `${digit()}${digit()}${digit()}${digit()}`;
  return `+1${area}${exchange}${subscriber}`;
}

/**
 * Provision a number. `isTaken` lets the caller reject collisions against
 * already-issued numbers; we retry a bounded number of times. Returns a
 * simulated number today; swap the body for a carrier API call later.
 */
export async function provisionSmsNumber(
  isTaken: (candidate: string) => Promise<boolean>,
  rand: () => number = Math.random,
): Promise<ProvisionedNumber> {
  for (let attempt = 0; attempt < 10; attempt++) {
    const candidate = generateSimulatedNumber(rand);
    if (!(await isTaken(candidate))) return { number: candidate, provider: 'simulated' };
  }
  throw new Error('could_not_allocate_number');
}
