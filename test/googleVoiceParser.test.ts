import { describe, expect, it } from 'vitest';
import { parseGmailPubSub, parseGoogleVoiceMessage, type GmailMessage } from '../supabase/functions/_shared/googleVoiceParser';

function b64url(value: string): string {
  return btoa(value).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function message(overrides: Partial<GmailMessage> = {}): GmailMessage {
  return {
    id: 'msg-1',
    threadId: 'thread-1',
    internalDate: '1710000000000',
    payload: {
      mimeType: 'multipart/alternative',
      headers: [
        { name: 'From', value: 'Google Voice <voice-noreply@google.com>' },
        { name: 'Reply-To', value: '+15551234567@txt.voice.google.com' },
        { name: 'Subject', value: 'SMS from +1 555-123-4567' },
        { name: 'Date', value: 'Fri, 01 Mar 2024 12:00:00 +0000' },
      ],
      parts: [
        {
          mimeType: 'text/plain',
          body: { data: b64url('Hi, are you available tomorrow?\n\nOn Fri someone wrote:\nold text') },
        },
      ],
    },
    ...overrides,
  };
}

describe('parseGmailPubSub', () => {
  it('decodes Gmail Pub/Sub message data', () => {
    const parsed = parseGmailPubSub({
      message: { data: b64url(JSON.stringify({ emailAddress: 'Owner@Example.com', historyId: '987' })) },
    });
    expect(parsed).toEqual({ emailAddress: 'owner@example.com', historyId: '987' });
  });

  it('rejects malformed notifications', () => {
    expect(parseGmailPubSub({})).toBeNull();
    expect(parseGmailPubSub({ message: { data: 'not-json' } })).toBeNull();
  });
});

describe('parseGoogleVoiceMessage', () => {
  it('normalizes a Google Voice SMS email into an inbound message', () => {
    const parsed = parseGoogleVoiceMessage(message());
    expect(parsed).not.toBeNull();
    expect(parsed!.externalThreadId).toBe('+15551234567@txt.voice.google.com');
    expect(parsed!.externalMessageId).toBe('msg-1');
    expect(parsed!.clientHandle).toBe('+15551234567');
    expect(parsed!.text).toBe('Hi, are you available tomorrow?');
    expect(parsed!.messageType).toBe('text');
    expect(parsed!.replyToEmail).toBe('+15551234567@txt.voice.google.com');
    expect(parsed!.gmailThreadId).toBe('thread-1');
  });

  it('ignores non-Google-Voice email', () => {
    const parsed = parseGoogleVoiceMessage(
      message({
        payload: {
          headers: [
            { name: 'From', value: 'Someone <person@example.com>' },
            { name: 'Subject', value: 'Hello' },
          ],
          body: { data: b64url('hello') },
          mimeType: 'text/plain',
        },
      }),
    );
    expect(parsed).toBeNull();
  });

  it('ignores notification-only Google Voice email without a reply address', () => {
    const parsed = parseGoogleVoiceMessage(
      message({
        payload: {
          headers: [
            { name: 'From', value: 'Google Voice <voice-noreply@google.com>' },
            { name: 'Subject', value: 'SMS from +1 555-123-4567' },
          ],
          body: { data: b64url('New text message') },
          mimeType: 'text/plain',
        },
      }),
    );
    expect(parsed).toBeNull();
  });
});
