import { beforeEach, describe, expect, it, vi } from 'vitest';

const sendTrainingData = vi.fn();

vi.mock('../utils/webhooks', () => ({
  sendTrainingData,
}));

describe('aiTraining', () => {
  beforeEach(() => {
    sendTrainingData.mockReset();
  });

  it('processConversationForAI packages parsed conversations and sends training data', async () => {
    sendTrainingData.mockResolvedValue(true);
    const { processConversationForAI } = await import('../utils/aiTraining');

    const conversation = {
      platform: 'WhatsApp',
      clientName: 'Alex Client',
      messages: [
        {
          timestamp: '2026-06-17 10:00:00',
          sender: 'Alex Client',
          message: 'What are your rates?',
          isFromClient: true,
        },
        {
          timestamp: '2026-06-17 10:01:00',
          sender: 'You',
          message: '60 minutes is $80.',
          isFromClient: false,
        },
      ],
      totalMessages: 2,
      dateRange: {
        start: '2026-06-17 10:00:00',
        end: '2026-06-17 10:01:00',
      },
    };

    const result = await processConversationForAI(conversation, 'provider-1');

    expect(result.platform).toBe('WhatsApp');
    expect(result.clientName).toBe('Alex Client');
    expect(result.messageCount).toBe(2);
    expect(result.insights.commonQuestions).toContain('What are your rates?');
    expect(sendTrainingData).toHaveBeenCalledTimes(1);
    expect(sendTrainingData).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'provider-1',
        source: 'whatsapp',
      })
    );
  });

  it('surfaces webhook failures as upload-processing failures', async () => {
    sendTrainingData.mockRejectedValue(new Error('webhook offline'));
    const { processConversationForAI } = await import('../utils/aiTraining');

    const conversation = {
      platform: 'WhatsApp',
      clientName: 'Alex Client',
      messages: [
        {
          timestamp: '2026-06-17 10:00:00',
          sender: 'Alex Client',
          message: 'Hello?',
          isFromClient: true,
        },
      ],
      totalMessages: 1,
      dateRange: {
        start: '2026-06-17 10:00:00',
        end: '2026-06-17 10:00:00',
      },
    };

    await expect(processConversationForAI(conversation, 'provider-1')).rejects.toThrow(
      'Failed to process conversation for AI training'
    );
  });

  it('generates FAQ suggestions from paired questions and business responses', async () => {
    const { generateFAQSuggestions } = await import('../utils/aiTraining');

    const suggestions = generateFAQSuggestions({
      commonQuestions: ['What are your rates?'],
      businessResponses: ['60 minutes is $80, 90 minutes is $120.'],
      bookingPatterns: [],
      serviceInquiries: [],
      pricingQuestions: ['What are your rates?'],
    });

    expect(suggestions).toHaveLength(1);
    expect(suggestions[0]).toEqual(
      expect.objectContaining({
        trigger: 'What are your rates?',
        response: '60 minutes is $80, 90 minutes is $120.',
        category: 'Pricing',
      })
    );
  });
});
