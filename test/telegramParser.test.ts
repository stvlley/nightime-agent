import { describe, expect, it } from 'vitest';
import { parseTelegramUpdate } from '../supabase/functions/_shared/telegramParser';

describe('parseTelegramUpdate', () => {
  it('normalizes a text message update', () => {
    const update = {
      update_id: 1,
      message: {
        message_id: 42,
        from: { id: 777, first_name: 'Sam', last_name: 'Rivera', username: 'samr' },
        chat: { id: -1001, type: 'private' },
        date: 1_700_000_000,
        text: 'Hi, are you available tomorrow?',
      },
    };
    const r = parseTelegramUpdate(update);
    expect(r).not.toBeNull();
    expect(r!.externalThreadId).toBe('-1001');
    expect(r!.externalMessageId).toBe('42');
    expect(r!.clientHandle).toBe('@samr');
    expect(r!.clientName).toBe('Sam Rivera');
    expect(r!.text).toBe('Hi, are you available tomorrow?');
    expect(r!.messageType).toBe('text');
    expect(r!.timestamp).toBe(new Date(1_700_000_000 * 1000).toISOString());
  });

  it('falls back to the numeric id when there is no username', () => {
    const r = parseTelegramUpdate({
      message: { message_id: 1, from: { id: 9, first_name: 'A' }, chat: { id: 9 }, date: 1, text: 'hey' },
    });
    expect(r!.clientHandle).toBe('9');
  });

  it('reads the caption for a photo message', () => {
    const r = parseTelegramUpdate({
      message: {
        message_id: 5,
        from: { id: 1, first_name: 'P' },
        chat: { id: 1 },
        date: 1,
        caption: 'see attached',
        photo: [{ file_id: 'abc' }],
      },
    });
    expect(r!.messageType).toBe('image');
    expect(r!.text).toBe('see attached');
  });

  it('handles edited messages', () => {
    const r = parseTelegramUpdate({
      edited_message: { message_id: 7, from: { id: 1, first_name: 'E' }, chat: { id: 1 }, date: 1, text: 'fixed' },
    });
    expect(r!.text).toBe('fixed');
  });

  it('returns null for non-message updates', () => {
    expect(parseTelegramUpdate({ update_id: 1 })).toBeNull();
    expect(parseTelegramUpdate({ message: { text: 'no chat or from' } })).toBeNull();
    expect(parseTelegramUpdate(null)).toBeNull();
  });
});
