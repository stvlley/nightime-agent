import { describe, expect, it } from 'vitest';
import { parseWhatsAppWebhook } from '../supabase/functions/_shared/whatsappParser';

describe('parseWhatsAppWebhook', () => {
  it('normalizes a text message', () => {
    const rows = parseWhatsAppWebhook({
      entry: [
        {
          changes: [
            {
              field: 'messages',
              value: {
                metadata: { phone_number_id: '12345' },
                contacts: [{ wa_id: '15551234567', profile: { name: 'Alex Client' } }],
                messages: [
                  {
                    id: 'wamid.abc',
                    from: '15551234567',
                    timestamp: '1700000000',
                    type: 'text',
                    text: { body: 'Are you available tonight?' },
                  },
                ],
              },
            },
          ],
        },
      ],
    });

    expect(rows).toHaveLength(1);
    expect(rows[0].phoneNumberId).toBe('12345');
    expect(rows[0].externalThreadId).toBe('15551234567');
    expect(rows[0].clientName).toBe('Alex Client');
    expect(rows[0].text).toBe('Are you available tonight?');
    expect(rows[0].messageType).toBe('text');
    expect(rows[0].externalMessageId).toBe('wamid.abc');
  });

  it('ignores status-only webhooks', () => {
    const rows = parseWhatsAppWebhook({
      entry: [{ changes: [{ field: 'messages', value: { metadata: { phone_number_id: '1' }, statuses: [{ id: 'x' }] } }] }],
    });
    expect(rows).toEqual([]);
  });

  it('reads button and interactive replies as text', () => {
    const base = {
      entry: [
        {
          changes: [
            {
              field: 'messages',
              value: {
                metadata: { phone_number_id: '1' },
                messages: [
                  { id: 'button', from: '1', timestamp: '1', type: 'button', button: { text: 'Yes' } },
                  {
                    id: 'list',
                    from: '1',
                    timestamp: '1',
                    type: 'interactive',
                    interactive: { list_reply: { title: 'Tomorrow' } },
                  },
                ],
              },
            },
          ],
        },
      ],
    };
    expect(parseWhatsAppWebhook(base).map((r) => r.text)).toEqual(['Yes', 'Tomorrow']);
  });
});
