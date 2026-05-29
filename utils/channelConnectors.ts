// Channel Connectors for Multi-Platform Messaging
import { Channel, Thread, Message } from '@/types/booking';

export interface ChannelConnector {
  type: string;
  sendMessage(channel: Channel, recipient: string, message: string): Promise<boolean>;
  parseInboundWebhook(payload: any): Promise<NormalizedMessage | null>;
  validateWebhook(payload: any, signature?: string): boolean;
}

export interface NormalizedMessage {
  externalThreadId: string;
  clientHandle: string;
  clientName?: string;
  text: string;
  messageType: 'text' | 'image' | 'audio' | 'file' | 'location';
  attachments?: string[];
  timestamp: string;
  metadata: Record<string, any>;
}

// Google Voice Connector (via Gmail API)
export class GoogleVoiceConnector implements ChannelConnector {
  type = 'gv';

  async sendMessage(channel: Channel, recipient: string, message: string): Promise<boolean> {
    try {
      // Send SMS via Gmail API to phone@txt.voice.google.com
      const toAddress = `${recipient}@txt.voice.google.com`;
      
      const response = await fetch('/api/gmail/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: channel.userId,
          to: toAddress,
          subject: '', // SMS don't need subjects
          body: message
        })
      });

      return response.ok;
    } catch (error) {
      console.error('Google Voice send error:', error);
      return false;
    }
  }

  async parseInboundWebhook(payload: any): Promise<NormalizedMessage | null> {
    try {
      // Parse Gmail webhook for Google Voice messages
      const { historyId, emailAddress } = payload;
      
      // Fetch the actual message from Gmail API
      const messageData = await this.fetchGmailMessage(historyId);
      
      if (!messageData || !this.isGoogleVoiceMessage(messageData)) {
        return null;
      }

      return {
        externalThreadId: messageData.threadId,
        clientHandle: this.extractPhoneNumber(messageData.from),
        clientName: this.extractClientName(messageData.from),
        text: messageData.body,
        messageType: messageData.attachments?.length > 0 ? 'file' : 'text',
        attachments: messageData.attachments,
        timestamp: messageData.date,
        metadata: {
          gmailMessageId: messageData.id,
          isVoicemail: messageData.subject?.includes('Voicemail'),
          originalFrom: messageData.from
        }
      };
    } catch (error) {
      console.error('Google Voice parse error:', error);
      return null;
    }
  }

  validateWebhook(payload: any): boolean {
    return Boolean(payload?.historyId);
  }

  private async fetchGmailMessage(historyId: string): Promise<any> {
    // Mock implementation - would call Gmail API
    return {
      id: 'msg123',
      threadId: 'thread123',
      from: 'John Doe <+15551234567>',
      body: 'Hi, I\'d like to book a massage for tomorrow at 2pm',
      date: new Date().toISOString(),
      subject: 'SMS from +15551234567',
      attachments: []
    };
  }

  private isGoogleVoiceMessage(messageData: any): boolean {
    return messageData.from?.includes('voice-noreply@google.com') ||
           messageData.subject?.includes('SMS from') ||
           messageData.subject?.includes('Voicemail from');
  }

  private extractPhoneNumber(from: string): string {
    const phoneMatch = from.match(/\+?1?(\d{10})/);
    return phoneMatch ? phoneMatch[0] : from;
  }

  private extractClientName(from: string): string {
    const nameMatch = from.match(/^([^<]+)</);
    return nameMatch ? nameMatch[1].trim() : '';
  }
}

// WhatsApp Connector
export class WhatsAppConnector implements ChannelConnector {
  type = 'whatsapp';

  async sendMessage(channel: Channel, recipient: string, message: string): Promise<boolean> {
    try {
      const phoneNumberId = process.env.EXPO_PUBLIC_WHATSAPP_PHONE_NUMBER_ID;
      if (!phoneNumberId) {
        throw new Error('EXPO_PUBLIC_WHATSAPP_PHONE_NUMBER_ID is not configured');
      }

      const response = await fetch(`https://graph.facebook.com/v18.0/${phoneNumberId}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${channel.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: recipient,
          type: 'text',
          text: { body: message }
        })
      });

      return response.ok;
    } catch (error) {
      console.error('WhatsApp send error:', error);
      return false;
    }
  }

  async parseInboundWebhook(payload: any): Promise<NormalizedMessage | null> {
    try {
      const entry = payload.entry?.[0];
      const change = entry?.changes?.[0];
      const value = change?.value;
      
      if (change?.field !== 'messages') {
        return null;
      }

      const message = value?.messages?.[0];
      if (!message) {
        return null;
      }

      const contact = value?.contacts?.[0];
      
      return {
        externalThreadId: message.from,
        clientHandle: message.from,
        clientName: contact?.profile?.name,
        text: message.text?.body || '',
        messageType: message.type as any,
        attachments: message.image ? [message.image.id] : undefined,
        timestamp: new Date(parseInt(message.timestamp) * 1000).toISOString(),
        metadata: {
          whatsappMessageId: message.id,
          messageType: message.type,
          context: message.context
        }
      };
    } catch (error) {
      console.error('WhatsApp parse error:', error);
      return null;
    }
  }

  validateWebhook(payload: any, signature?: string): boolean {
    if (!signature) return false;

    return Boolean(payload?.entry?.[0]?.changes?.[0]?.value);
  }
}

// Telegram Connector
export class TelegramConnector implements ChannelConnector {
  type = 'telegram';

  async sendMessage(channel: Channel, recipient: string, message: string): Promise<boolean> {
    try {
      const response = await fetch(`https://api.telegram.org/bot${channel.apiKey}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: recipient,
          text: message,
          parse_mode: 'HTML'
        })
      });

      return response.ok;
    } catch (error) {
      console.error('Telegram send error:', error);
      return false;
    }
  }

  async parseInboundWebhook(payload: any): Promise<NormalizedMessage | null> {
    try {
      const message = payload.message;
      if (!message) {
        return null;
      }

      return {
        externalThreadId: message.chat.id.toString(),
        clientHandle: message.from.id.toString(),
        clientName: `${message.from.first_name} ${message.from.last_name || ''}`.trim(),
        text: message.text || message.caption || '',
        messageType: this.getTelegramMessageType(message),
        attachments: this.extractTelegramAttachments(message),
        timestamp: new Date(message.date * 1000).toISOString(),
        metadata: {
          telegramMessageId: message.message_id,
          chatType: message.chat.type,
          username: message.from.username
        }
      };
    } catch (error) {
      console.error('Telegram parse error:', error);
      return null;
    }
  }

  validateWebhook(payload: any): boolean {
    return payload.message && payload.message.from;
  }

  private getTelegramMessageType(message: any): 'text' | 'image' | 'audio' | 'file' | 'location' {
    if (message.photo) return 'image';
    if (message.voice || message.audio) return 'audio';
    if (message.document) return 'file';
    if (message.location) return 'location';
    return 'text';
  }

  private extractTelegramAttachments(message: any): string[] {
    const attachments: string[] = [];
    
    if (message.photo) {
      // Get the highest resolution photo
      const photo = message.photo[message.photo.length - 1];
      attachments.push(photo.file_id);
    }
    
    if (message.document) {
      attachments.push(message.document.file_id);
    }
    
    if (message.voice) {
      attachments.push(message.voice.file_id);
    }
    
    if (message.audio) {
      attachments.push(message.audio.file_id);
    }
    
    return attachments;
  }
}

// Email Connector
export class EmailConnector implements ChannelConnector {
  type = 'email';

  async sendMessage(channel: Channel, recipient: string, message: string): Promise<boolean> {
    try {
      const response = await fetch('/api/gmail/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: channel.userId,
          to: recipient,
          subject: 'Re: Appointment Inquiry',
          body: message
        })
      });

      return response.ok;
    } catch (error) {
      console.error('Email send error:', error);
      return false;
    }
  }

  async parseInboundWebhook(payload: any): Promise<NormalizedMessage | null> {
    try {
      // Parse Gmail webhook for emails from platforms like RentMasseur
      const messageData = await this.fetchEmailMessage(payload.messageId);
      
      if (!messageData) {
        return null;
      }

      return {
        externalThreadId: messageData.threadId,
        clientHandle: messageData.from,
        clientName: this.extractEmailName(messageData.from),
        text: messageData.body,
        messageType: messageData.attachments?.length > 0 ? 'file' : 'text',
        attachments: messageData.attachments,
        timestamp: messageData.date,
        metadata: {
          emailMessageId: messageData.id,
          subject: messageData.subject,
          platform: this.detectEmailPlatform(messageData.from, messageData.subject)
        }
      };
    } catch (error) {
      console.error('Email parse error:', error);
      return null;
    }
  }

  validateWebhook(payload: any): boolean {
    return payload.messageId && payload.historyId;
  }

  private async fetchEmailMessage(messageId: string): Promise<any> {
    // Mock implementation - would call Gmail API
    return {
      id: messageId,
      threadId: 'thread123',
      from: 'client@rentmasseur.com',
      subject: 'New booking inquiry',
      body: 'I would like to book a massage session',
      date: new Date().toISOString(),
      attachments: []
    };
  }

  private extractEmailName(from: string): string {
    const nameMatch = from.match(/^([^<]+)</);
    return nameMatch ? nameMatch[1].trim() : from.split('@')[0];
  }

  private detectEmailPlatform(from: string, subject: string): string {
    if (from.includes('rentmasseur.com')) return 'RentMasseur';
    if (from.includes('massagetherapy.com')) return 'MassageTherapy';
    return 'Email';
  }
}

// Channel Manager
export class ChannelManager {
  private connectors: Map<string, ChannelConnector> = new Map();

  constructor() {
    this.connectors.set('gv', new GoogleVoiceConnector());
    this.connectors.set('whatsapp', new WhatsAppConnector());
    this.connectors.set('telegram', new TelegramConnector());
    this.connectors.set('email', new EmailConnector());
  }

  async sendMessage(channel: Channel, recipient: string, message: string): Promise<boolean> {
    const connector = this.connectors.get(channel.type);
    if (!connector) {
      throw new Error(`Unsupported channel type: ${channel.type}`);
    }

    return await connector.sendMessage(channel, recipient, message);
  }

  async parseInboundMessage(channelType: string, payload: any): Promise<NormalizedMessage | null> {
    const connector = this.connectors.get(channelType);
    if (!connector) {
      console.error(`No connector found for channel type: ${channelType}`);
      return null;
    }

    return await connector.parseInboundWebhook(payload);
  }

  validateWebhook(channelType: string, payload: any, signature?: string): boolean {
    const connector = this.connectors.get(channelType);
    if (!connector) {
      return false;
    }

    return connector.validateWebhook(payload, signature);
  }
}
