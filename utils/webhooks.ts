// Webhook utilities for external integrations

export interface WebhookPayload {
  userId: string;
  source: 'whatsapp' | 'telegram' | 'google_voice' | 'imessage' | 'email';
  data: unknown;
  timestamp: string;
}

export interface TrainingWebhookPayload extends WebhookPayload {
  fileData: string;
}

export interface MessageWebhookPayload extends WebhookPayload {
  clientMessage: string;
  phone: string;
}

// Training webhook for AI learning
export const sendTrainingData = async (payload: TrainingWebhookPayload): Promise<boolean> => {
  try {
    const webhookUrl = process.env.EXPO_PUBLIC_TRAINING_WEBHOOK_URL;
    if (!webhookUrl) {
      throw new Error('EXPO_PUBLIC_TRAINING_WEBHOOK_URL is not configured');
    }

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Source': 'nightime-agent-mobile',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Training webhook failed: ${response.status}`);
    }

    return true;
  } catch (error) {
    console.error('Failed to send training data:', error);
    throw error;
  }
};

// Message processing webhook
export const sendMessageForProcessing = async (payload: MessageWebhookPayload): Promise<unknown> => {
  try {
    const webhookUrl = process.env.EXPO_PUBLIC_MESSAGE_WEBHOOK_URL;
    if (!webhookUrl) {
      throw new Error('EXPO_PUBLIC_MESSAGE_WEBHOOK_URL is not configured');
    }

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      return await response.json();
    }
    
    throw new Error('Failed to process message');
  } catch (error) {
    console.error('Failed to process message:', error);
    throw error;
  }
};

// Content moderation
export const moderateContent = (content: string, level: 'low' | 'medium' | 'strict'): boolean => {
  const adultKeywords = ['explicit', 'nsfw', 'adult', 'sexual'];
  const moderateKeywords = ['inappropriate', 'offensive'];
  
  const contentLower = content.toLowerCase();
  
  switch (level) {
    case 'strict':
      return !moderateKeywords.some(keyword => contentLower.includes(keyword));
    case 'medium':
      return !adultKeywords.some(keyword => contentLower.includes(keyword));
    case 'low':
      return !adultKeywords.slice(0, 2).some(keyword => contentLower.includes(keyword));
    default:
      return true;
  }
};
