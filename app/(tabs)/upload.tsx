export interface User {
  id: string;
  email: string;
  businessName: string;
  plan: 'starter' | 'pro' | 'premium';
  createdAt: string;
}

export interface Platform {
  id: string;
  name: string;
  type: 'whatsapp' | 'sms' | 'email' | 'telegram';
  connected: boolean;
  lastSync?: string;
}

export interface Conversation {
  id: string;
  clientName: string;
  clientPhone?: string;
  platform: Platform['type'];
  messages: Message[];
  lastActivity: string;
  status: 'active' | 'archived';
  tags: string[];
}

export interface Message {
  id: string;
  conversationId: string;
  text: string;
  sender: 'client' | 'therapist' | 'ai';
  timestamp: string;
  aiGenerated?: boolean;
  aiConfidence?: number;
}

export interface Appointment {
  id: string;
  clientName: string;
  clientPhone?: string;
  service: string;
  datetime: string;
  duration: number;
  status: 'confirmed' | 'pending' | 'cancelled' | 'completed';
  notes?: string;
  reminderSent?: boolean;
}

export interface AISettings {
  enabled: boolean;
  moderationLevel: 'low' | 'medium' | 'strict';
  autoResponse: boolean;
  confidenceThreshold: number;
  learningEnabled: boolean;
}

export interface FAQ {
  id: string;
  trigger: string;
  response: string;
  category: string;
  priority: number;
  active: boolean;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  features: string[];
  limits: {
    aiResponses: number;
    platforms: number;
    storage: string;
  };
}