import { describe, expect, it } from 'vitest';
import {
  applySetupChatAnswer,
  buildSetupReviewItems,
  formatSetupChatAnswer,
  getNextSetupChatNodeId,
  getSetupChatNode,
  validateSetupChatAnswer,
} from '../utils/setupChatFlow';
import {
  applySetupInferenceSuggestions,
  suggestSetupDefaults,
} from '../utils/setupInference';
import type { SetupPayload } from '../utils/setup';

function defaultSetupPayload(businessName = ''): SetupPayload {
  return {
    businessCategory: 'Wellness',
    businessName,
    displayName: businessName,
    headline: '',
    locationLabel: '',
    timezone: 'America/New_York',
    messageChannels: [],
    commonQuestions: [],
    responseBoundaries: '',
    bookingContextEnabled: false,
    services: [{ name: 'Consultation', durationMinutes: 60, price: '100' }],
    availability: { days: [1, 2, 3, 4, 5], startTime: '09:00', endTime: '17:00' },
    agentTone: 'Warm and concise',
    approvalMode: 'manual',
    followUpEnabled: true,
    moderationLevel: 'medium',
    notificationsEnabled: false,
    notificationPermission: 'skipped',
  };
}

describe('setup chat flow', () => {
  it('starts with a business prompt', () => {
    expect(getSetupChatNode('business')).toMatchObject({
      answerKind: 'text',
      label: 'Business',
    });
  });

  it('applies core message-provider answers', () => {
    let payload = defaultSetupPayload();
    payload = applySetupChatAnswer('business', payload, 'Night Studio');
    payload = applySetupChatAnswer('channels', payload, ['Instagram DM', 'SMS']);
    payload = applySetupChatAnswer('questions', payload, 'Rates?\nAre you available tonight?');

    expect(payload.businessName).toBe('Night Studio');
    expect(payload.messageChannels).toEqual(['Instagram DM', 'SMS']);
    expect(payload.commonQuestions).toEqual(['Rates?', 'Are you available tonight?']);
  });

  it('skips availability when booking context is off', () => {
    const payload = applySetupChatAnswer('booking', defaultSetupPayload(), false);
    expect(getNextSetupChatNodeId('booking', payload)).toBe('tone');
  });

  it('offers suggestions after common questions', () => {
    const payload = applySetupChatAnswer('questions', defaultSetupPayload(), 'Rates?\nCan I book tonight?');
    expect(getNextSetupChatNodeId('questions', payload)).toBe('suggestions');
  });

  it('includes availability when booking context is on', () => {
    const payload = applySetupChatAnswer('booking', defaultSetupPayload(), true);
    expect(getNextSetupChatNodeId('booking', payload)).toBe('availability');
  });

  it('validates required message channels', () => {
    expect(validateSetupChatAnswer('channels', [], defaultSetupPayload())).toMatchObject({
      valid: false,
      title: 'Choose a channel',
    });
  });

  it('formats answers for transcript bubbles', () => {
    expect(formatSetupChatAnswer('channels', ['Telegram', 'Email'])).toBe('Telegram, Email');
    expect(formatSetupChatAnswer('booking', true)).toBe('Yes, booking happens in messages');
  });

  it('builds a review summary', () => {
    const payload = {
      ...defaultSetupPayload('Night Studio'),
      messageChannels: ['Instagram DM'],
      commonQuestions: ['Rates?'],
    };
    expect(buildSetupReviewItems(payload).map((item) => item.label)).toContain('Channels');
  });

  it('suggests editable defaults without saving hidden state', async () => {
    const payload = {
      ...defaultSetupPayload('Night Studio'),
      businessCategory: 'Consulting',
      commonQuestions: ['Can I book an intro call?'],
      messageChannels: [],
      services: [],
    };
    const result = await suggestSetupDefaults(payload);
    const applied = applySetupInferenceSuggestions(payload, result.suggestions);

    expect(result.source).toBe('deterministic');
    expect(result.suggestions.messageChannels).toContain('Email');
    expect(applied.messageChannels.length).toBeGreaterThan(0);
    expect(payload.messageChannels).toEqual([]);
  });
});
