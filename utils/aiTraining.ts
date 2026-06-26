import { ParsedConversation, extractConversationInsights } from './chatParsers';
import { sendTrainingData, type WebhookPayload } from './webhooks';

export interface TrainingData {
  conversationId: string;
  platform: string;
  clientName: string;
  messageCount: number;
  insights: {
    commonQuestions: string[];
    businessResponses: string[];
    bookingPatterns: string[];
    serviceInquiries: string[];
    pricingQuestions: string[];
  };
  rawConversation: ParsedConversation;
}

export interface AILearningProgress {
  totalConversations: number;
  totalMessages: number;
  platformBreakdown: Record<string, number>;
  confidenceScore: number;
  lastTrainingDate: string;
}

function webhookSourceForPlatform(platform: string): WebhookPayload['source'] {
  const normalized = platform.toLowerCase().replace(/[\s-]+/g, '_');
  if (normalized.includes('whatsapp')) return 'whatsapp';
  if (normalized.includes('telegram')) return 'telegram';
  if (normalized.includes('google_voice')) return 'google_voice';
  if (normalized.includes('imessage')) return 'imessage';
  return 'email';
}

// Process conversation for AI training
export const processConversationForAI = async (
  conversation: ParsedConversation,
  userId: string
): Promise<TrainingData> => {
  const insights = extractConversationInsights(conversation);
  
  const trainingData: TrainingData = {
    conversationId: `${Date.now()}_${conversation.platform}`,
    platform: conversation.platform,
    clientName: conversation.clientName,
    messageCount: conversation.totalMessages,
    insights,
    rawConversation: conversation,
  };

  // Send to Make.com webhook for AI training
  try {
    await sendTrainingData({
      userId,
      source: webhookSourceForPlatform(conversation.platform),
      data: trainingData,
      fileData: JSON.stringify(trainingData),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Failed to send training data:', error);
    throw new Error('Failed to process conversation for AI training');
  }

  return trainingData;
};

// Generate FAQ suggestions from conversation insights
export const generateFAQSuggestions = (insights: TrainingData['insights']) => {
  const suggestions: Array<{
    trigger: string;
    response: string;
    category: string;
    confidence: number;
  }> = [];

  // Process common questions and pair with business responses
  insights.commonQuestions.forEach((question, index) => {
    const relatedResponse = insights.businessResponses[index] || 
                           insights.businessResponses.find(response => 
                             response.length > 20 && response.length < 200
                           );
    
    if (relatedResponse) {
      suggestions.push({
        trigger: question,
        response: relatedResponse,
        category: categorizeQuestion(question),
        confidence: calculateConfidence(question, relatedResponse),
      });
    }
  });

  return suggestions.filter(s => s.confidence > 0.6).slice(0, 10);
};

// Categorize questions for better organization
const categorizeQuestion = (question: string): string => {
  const q = question.toLowerCase();
  
  if (q.includes('price') || q.includes('cost') || q.includes('rate') || q.includes('$')) {
    return 'Pricing';
  }
  if (q.includes('book') || q.includes('appointment') || q.includes('schedule') || q.includes('available')) {
    return 'Booking';
  }
  if (q.includes('service') || q.includes('massage') || q.includes('therapy') || q.includes('treatment')) {
    return 'Services';
  }
  if (q.includes('location') || q.includes('address') || q.includes('where')) {
    return 'Location';
  }
  if (q.includes('cancel') || q.includes('reschedule') || q.includes('change')) {
    return 'Changes';
  }
  
  return 'General';
};

// Calculate confidence score for FAQ suggestions
const calculateConfidence = (question: string, response: string): number => {
  let confidence = 0.5;
  
  // Higher confidence for complete questions
  if (question.includes('?')) confidence += 0.2;
  
  // Higher confidence for detailed responses
  if (response.length > 50) confidence += 0.1;
  if (response.length > 100) confidence += 0.1;
  
  // Higher confidence for business-like responses
  if (response.includes('appointment') || response.includes('book') || response.includes('available')) {
    confidence += 0.1;
  }
  
  return Math.min(confidence, 1.0);
};

// Analyze conversation patterns for booking automation
export const analyzeBookingPatterns = (conversations: ParsedConversation[]) => {
  const patterns = {
    commonBookingRequests: [] as string[],
    typicalResponses: [] as string[],
    timePreferences: [] as string[],
    serviceRequests: [] as string[],
  };

  conversations.forEach(conv => {
    conv.messages.forEach(msg => {
      const message = msg.message.toLowerCase();
      
      if (msg.isFromClient) {
        if (message.includes('book') || message.includes('appointment')) {
          patterns.commonBookingRequests.push(msg.message);
        }
        
        if (message.includes('time') || message.includes('when') || message.includes('available')) {
          patterns.timePreferences.push(msg.message);
        }
        
        if (message.includes('massage') || message.includes('therapy') || message.includes('treatment')) {
          patterns.serviceRequests.push(msg.message);
        }
      } else {
        if (message.includes('available') || message.includes('book') || message.includes('appointment')) {
          patterns.typicalResponses.push(msg.message);
        }
      }
    });
  });

  return patterns;
};

// Generate AI training summary
export const generateTrainingSummary = (trainingData: TrainingData[]): AILearningProgress => {
  const totalMessages = trainingData.reduce((sum, data) => sum + data.messageCount, 0);
  const platformBreakdown: Record<string, number> = {};
  
  trainingData.forEach(data => {
    platformBreakdown[data.platform] = (platformBreakdown[data.platform] || 0) + 1;
  });

  // Calculate confidence score based on data quality and quantity
  let confidenceScore = Math.min(totalMessages / 1000, 0.8); // Max 80% from message count
  if (trainingData.length > 5) confidenceScore += 0.1; // Bonus for multiple conversations
  if (Object.keys(platformBreakdown).length > 2) confidenceScore += 0.1; // Bonus for platform diversity

  return {
    totalConversations: trainingData.length,
    totalMessages,
    platformBreakdown,
    confidenceScore: Math.min(confidenceScore, 1.0),
    lastTrainingDate: new Date().toISOString(),
  };
};
