import { describe, expect, it } from 'vitest';
import {
  parseConversationFile,
  parseEmailConversation,
  parseGoogleVoiceChat,
  parseTelegramChat,
  parseWhatsAppChat,
} from '../utils/chatParsers';

describe('parseWhatsAppChat', () => {
  it('parses exported WhatsApp text conversations', () => {
    const parsed = parseWhatsAppChat(`
[16/06/2026, 10:00:00] You: Hi there
[16/06/2026, 10:01:00] Alex Client: What are your rates?
    `.trim());

    expect(parsed.platform).toBe('WhatsApp');
    expect(parsed.clientName).toBe('Alex Client');
    expect(parsed.totalMessages).toBe(2);
    expect(parsed.messages[1]?.isFromClient).toBe(true);
    expect(parsed.messages[1]?.message).toBe('What are your rates?');
  });
});

describe('parseGoogleVoiceChat', () => {
  it('parses Google Voice JSON exports', () => {
    const parsed = parseGoogleVoiceChat(
      JSON.stringify({
        messages: [
          { direction: 'incoming', from: '+15551234567', contactName: 'Mia Client', timestamp: '2026-06-16T10:00:00Z', text: 'Do you have anything tomorrow?' },
          { direction: 'outgoing', timestamp: '2026-06-16T10:01:00Z', text: 'Tomorrow at 3 PM is open.' },
        ],
      })
    );

    expect(parsed.platform).toBe('Google Voice');
    expect(parsed.clientName).toBe('Mia Client');
    expect(parsed.clientPhone).toBe('+15551234567');
    expect(parsed.totalMessages).toBe(2);
    expect(parsed.messages[0]?.isFromClient).toBe(true);
  });
});

describe('parseTelegramChat', () => {
  it('parses Telegram CSV exports', () => {
    const parsed = parseTelegramChat(`
Date,Time,Sender,Message
2026-06-16,10:00,You,"Hi there"
2026-06-16,10:01,Sam Rivera,"Can I reschedule?"
    `.trim());

    expect(parsed.platform).toBe('Telegram');
    expect(parsed.clientName).toBe('Sam Rivera');
    expect(parsed.totalMessages).toBe(2);
    expect(parsed.messages[1]?.isFromClient).toBe(true);
  });
});

describe('parseEmailConversation', () => {
  it('parses simple email conversation blocks', () => {
    const parsed = parseEmailConversation(`
From: Alex Client <alex@example.com>
Date: Tue, 16 Jun 2026 10:00:00 +0000
Subject: Booking

Hi, are you accepting new clients?
    `.trim());

    expect(parsed.platform).toBe('Email');
    expect(parsed.clientName).toBe('Alex Client');
    expect(parsed.clientPhone).toBe('alex@example.com');
    expect(parsed.totalMessages).toBe(1);
    expect(parsed.messages[0]?.message).toContain('accepting new clients');
  });
});

describe('parseConversationFile', () => {
  it('routes by file extension', () => {
    const whatsapp = parseConversationFile(
      'chat.txt',
      '[16/06/2026, 10:01:00] Alex Client: What are your rates?'
    );
    const voice = parseConversationFile(
      'voice.json',
      JSON.stringify({ messages: [{ direction: 'incoming', from: '+1555', timestamp: '2026-06-16T10:00:00Z', text: 'hello' }] })
    );
    const telegram = parseConversationFile(
      'tg.csv',
      'Date,Time,Sender,Message\n2026-06-16,10:01,Alex,Hello'
    );

    expect(whatsapp.platform).toBe('WhatsApp');
    expect(voice.platform).toBe('Google Voice');
    expect(telegram.platform).toBe('Telegram');
  });

  it('rejects unsupported formats', () => {
    expect(() => parseConversationFile('notes.pdf', '...')).toThrow('Unsupported file format: pdf');
  });
});
