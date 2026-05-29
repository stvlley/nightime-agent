// Booking Agent Types and State Machine Definitions

export type ThreadState = 
  | 'OPEN' 
  | 'QUALIFYING' 
  | 'OFFERING' 
  | 'AWAITING_CLIENT' 
  | 'TENTATIVE' 
  | 'CONFIRMED' 
  | 'CANCELLED' 
  | 'ABANDONED';

export type MessageIntent = 
  | 'booking' 
  | 'cancel' 
  | 'reschedule' 
  | 'info' 
  | 'faq' 
  | 'complaint' 
  | 'compliment'
  | 'other';

export type ChannelType = 
  | 'gv' 
  | 'telegram' 
  | 'whatsapp' 
  | 'email';

export interface Channel {
  id: string;
  userId: string;
  type: ChannelType;
  handle: string; // phone number, email, etc.
  status: 'active' | 'inactive' | 'error';
  apiKey?: string;
  webhookUrl?: string;
  lastSync?: string;
  messageCount: number;
  errorCount: number;
  settings: {
    autoReply: boolean;
    businessHours: boolean;
    maxDailyMessages?: number;
  };
}

export interface Thread {
  id: string;
  userId: string;
  channelId: string;
  externalThreadId: string; // platform-specific thread/conversation ID
  clientHandle: string; // client's phone/email
  clientName?: string;
  lastActivityAt: string;
  state: ThreadState;
  priority: 'low' | 'medium' | 'high';
  tags: string[];
  metadata: {
    leadScore: number;
    sentiment: 'positive' | 'neutral' | 'negative';
    hasBookingHistory: boolean;
    lastBookingDate?: string;
    preferredServices?: string[];
    timezone?: string;
  };
  automationRules: string[];
  pendingOffer?: TimeSlotOffer;
}

export interface Message {
  id: string;
  threadId: string;
  userId: string;
  direction: 'in' | 'out';
  text: string;
  filteredText?: string; // after NSFW filtering
  isVoicemail: boolean;
  aiLabel: MessageIntent;
  messageType: 'text' | 'image' | 'audio' | 'file' | 'location';
  attachments?: string[];
  processed: boolean;
  confidence?: number;
  createdAt: string;
  metadata: {
    originalPlatform: string;
    clientTimezone?: string;
    phoneNumber?: string;
    emailAddress?: string;
  };
}

export interface TimeSlot {
  id: string;
  start: string; // ISO datetime
  end: string;   // ISO datetime
  duration: number; // minutes
  service?: string;
  price?: number;
  available: boolean;
}

export interface TimeSlotOffer {
  id: string;
  threadId: string;
  slots: TimeSlot[];
  expiresAt: string;
  context: {
    requestedService?: string;
    requestedDuration?: number;
    preferredTimeFrame?: string;
    clientPreferences?: any;
  };
  createdAt: string;
}

export interface Booking {
  id: string;
  userId: string;
  threadId: string;
  calendarEventId?: string;
  clientHandle: string;
  clientName?: string;
  service: string;
  start: string;
  end: string;
  duration: number;
  price: number;
  status: 'tentative' | 'confirmed' | 'cancelled' | 'no_show' | 'completed';
  notes?: string;
  paid: boolean;
  paymentMethod?: string;
  source: 'ai' | 'manual' | 'online' | 'phone';
  cancellationReason?: string;
  createdAt: string;
  confirmedAt?: string;
  cancelledAt?: string;
  metadata: {
    rebookingOffered?: boolean;
    reminderSent?: boolean;
    followUpSent?: boolean;
    reviewRequested?: boolean;
    originalSlotOfferId?: string;
  };
}

export interface Availability {
  id: string;
  userId: string;
  dayOfWeek: number; // 0 = Sunday, 6 = Saturday
  startTime: string; // HH:mm format
  endTime: string;   // HH:mm format
  timezone: string;
  bufferMinutes: number; // buffer between appointments
  minNoticeMinutes: number; // minimum advance booking time
  isActive: boolean;
  exceptions?: AvailabilityException[];
}

export interface AvailabilityException {
  id: string;
  date: string; // YYYY-MM-DD
  type: 'blocked' | 'custom_hours';
  startTime?: string;
  endTime?: string;
  reason?: string;
}

export interface FollowUp {
  id: string;
  userId: string;
  threadId: string;
  bookingId?: string;
  type: 'cancelled' | 'abandoned' | 'no_show' | 'review_request';
  scheduledFor: string;
  sentAt?: string;
  cancelledAt?: string;
  messageTemplate: string;
  metadata: {
    attemptNumber: number;
    maxAttempts: number;
    delayHours: number;
  };
}

export interface FilteringRule {
  id: string;
  userId: string;
  level: 'low' | 'medium' | 'strict';
  patterns: Array<{
    pattern: string;
    replacement: string;
    category: 'adult' | 'profanity' | 'spam' | 'custom';
  }>;
  isActive: boolean;
  customRules?: string[];
}

export interface OutboundMessage {
  id: string;
  threadId: string;
  text: string;
  status: 'draft' | 'queued' | 'sent' | 'failed';
  approvedBy?: string;
  approvedAt?: string;
  sentAt?: string;
  failureReason?: string;
  retryCount: number;
  maxRetries: number;
  metadata: {
    messageType: 'booking_offer' | 'confirmation' | 'cancellation' | 'follow_up' | 'faq' | 'manual';
    priority: 'low' | 'normal' | 'high';
    scheduledFor?: string;
  };
}

export interface BookingAgentConfig {
  userId: string;
  settings: {
    autoBookingEnabled: boolean;
    requireManualApproval: boolean;
    businessHoursOnly: boolean;
    maxOfferedSlots: number;
    defaultDuration: number; // minutes
    allowSameDayBooking: boolean;
    cancellationPolicy: {
      allowClientCancellation: boolean;
      minCancellationHours: number;
      autoOfferReschedule: boolean;
    };
    followUpSettings: {
      enabledTypes: ('cancelled' | 'abandoned' | 'no_show')[];
      delays: {
        firstFollowUp: number; // hours
        secondFollowUp: number; // hours
        maxFollowUps: number;
      };
    };
  };
  aiSettings: {
    model: string;
    temperature: number;
    maxTokens: number;
    systemPrompt: string;
    guardrails: string[];
  };
}

// State machine transitions
export const ThreadStateTransitions: Record<ThreadState, ThreadState[]> = {
  OPEN: ['QUALIFYING', 'ABANDONED'],
  QUALIFYING: ['OFFERING', 'OPEN', 'ABANDONED'],
  OFFERING: ['AWAITING_CLIENT', 'QUALIFYING', 'ABANDONED'],
  AWAITING_CLIENT: ['TENTATIVE', 'CONFIRMED', 'QUALIFYING', 'ABANDONED'],
  TENTATIVE: ['CONFIRMED', 'CANCELLED', 'ABANDONED'],
  CONFIRMED: ['CANCELLED', 'OPEN'],
  CANCELLED: ['OPEN', 'ABANDONED'],
  ABANDONED: ['OPEN']
};

export const MessageIntentPriority: Record<MessageIntent, number> = {
  booking: 10,
  cancel: 9,
  reschedule: 8,
  complaint: 7,
  info: 5,
  faq: 3,
  compliment: 2,
  other: 1
};