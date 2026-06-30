import { describe, expect, it } from 'vitest';
import { signState, verifyState } from '../supabase/functions/_shared/oauthState';

const SECRET = 'test-secret';

describe('oauth state signing', () => {
  it('round-trips a valid, unexpired state back to the userId', async () => {
    const state = await signState(SECRET, 'user-123', 600_000, 1_000_000);
    expect(await verifyState(SECRET, state, 1_000_001)).toBe('user-123');
  });

  it('rejects a tampered userId', async () => {
    const state = await signState(SECRET, 'user-123', 600_000, 1_000_000);
    const forged = state.replace('user-123', 'user-999');
    expect(await verifyState(SECRET, forged, 1_000_001)).toBeNull();
  });

  it('rejects a wrong secret', async () => {
    const state = await signState(SECRET, 'user-123', 600_000, 1_000_000);
    expect(await verifyState('other-secret', state, 1_000_001)).toBeNull();
  });

  it('rejects an expired state', async () => {
    const state = await signState(SECRET, 'user-123', 600_000, 1_000_000);
    expect(await verifyState(SECRET, state, 1_000_000 + 600_001)).toBeNull();
  });

  it('rejects malformed input', async () => {
    expect(await verifyState(SECRET, 'garbage', 1)).toBeNull();
    expect(await verifyState(SECRET, '', 1)).toBeNull();
  });
});
