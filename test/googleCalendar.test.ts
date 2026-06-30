import { describe, expect, it } from 'vitest';
import {
  GOOGLE_CALENDAR_SCOPE,
  buildGoogleAuthUrl,
  buildGoogleEventBody,
  expiryIsoFromExpiresIn,
  isAccessTokenExpired,
} from '../supabase/functions/_shared/googleCalendar';

describe('buildGoogleAuthUrl', () => {
  it('requests offline calendar access with the given client/redirect/state', () => {
    const url = new URL(
      buildGoogleAuthUrl({ clientId: 'cid', redirectUri: 'https://x/cb', state: 'st' }),
    );
    expect(url.origin + url.pathname).toBe('https://accounts.google.com/o/oauth2/v2/auth');
    expect(url.searchParams.get('client_id')).toBe('cid');
    expect(url.searchParams.get('redirect_uri')).toBe('https://x/cb');
    expect(url.searchParams.get('state')).toBe('st');
    expect(url.searchParams.get('scope')).toBe(GOOGLE_CALENDAR_SCOPE);
    expect(url.searchParams.get('access_type')).toBe('offline');
    expect(url.searchParams.get('prompt')).toBe('consent');
    expect(url.searchParams.get('response_type')).toBe('code');
  });
});

describe('buildGoogleEventBody', () => {
  it('builds a minimal event from an offset-bearing instant', () => {
    expect(
      buildGoogleEventBody({ summary: 'Massage — Alex', startIso: '2026-06-30T14:00:00+00:00', endIso: '2026-06-30T15:00:00+00:00' }),
    ).toEqual({
      summary: 'Massage — Alex',
      start: { dateTime: '2026-06-30T14:00:00+00:00' },
      end: { dateTime: '2026-06-30T15:00:00+00:00' },
    });
  });

  it('includes timeZone and description when provided', () => {
    const body = buildGoogleEventBody({
      summary: 'S',
      startIso: 'a',
      endIso: 'b',
      timeZone: 'America/New_York',
      description: 'note',
    });
    expect(body.start).toEqual({ dateTime: 'a', timeZone: 'America/New_York' });
    expect(body.description).toBe('note');
  });
});

describe('token expiry helpers', () => {
  it('derives an ISO expiry from expires_in seconds', () => {
    expect(expiryIsoFromExpiresIn(3600, Date.parse('2026-06-30T00:00:00Z'))).toBe('2026-06-30T01:00:00.000Z');
  });

  it('treats missing, past, and near-expiry tokens as expired', () => {
    const now = Date.parse('2026-06-30T12:00:00Z');
    expect(isAccessTokenExpired(null, now)).toBe(true);
    expect(isAccessTokenExpired('2026-06-30T11:00:00Z', now)).toBe(true); // past
    expect(isAccessTokenExpired('2026-06-30T12:00:30Z', now)).toBe(true); // within 60s skew
    expect(isAccessTokenExpired('2026-06-30T13:00:00Z', now)).toBe(false); // valid
  });
});
