export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string | null;
          business_name: string | null;
          timezone: string | null;
          plan: string | null;
          usage_month_count: number | null;
          usage_limit: number | null;
          fcm_token: string | null;
          created_at: string | null;
          updated_at: string | null;
          // Public portal fields (Phase 1.5)
          slug: string | null;
          display_name: string | null;
          headline: string | null;
          bio: string | null;
          avatar_url: string | null;
          location_label: string | null;
          published: boolean;
          age_gate_required: boolean;
        };
        Insert: {
          id: string;
          email?: string | null;
          business_name?: string | null;
          timezone?: string | null;
          plan?: string | null;
          usage_month_count?: number | null;
          usage_limit?: number | null;
          fcm_token?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
          slug?: string | null;
          display_name?: string | null;
          headline?: string | null;
          bio?: string | null;
          avatar_url?: string | null;
          location_label?: string | null;
          published?: boolean;
          age_gate_required?: boolean;
        };
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>;
      };
      subscription_entitlements: {
        Row: {
          user_id: string;
          product_id: string;
          plan_id: 'annual' | 'monthly';
          platform: 'ios' | 'android' | 'demo';
          transaction_id: string | null;
          original_transaction_id: string | null;
          expires_at: string | null;
          verified_at: string;
          active: boolean;
          source: 'purchase' | 'restore' | 'demo';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          product_id: string;
          plan_id: 'annual' | 'monthly';
          platform: 'ios' | 'android' | 'demo';
          transaction_id?: string | null;
          original_transaction_id?: string | null;
          expires_at?: string | null;
          verified_at?: string;
          active?: boolean;
          source?: 'purchase' | 'restore' | 'demo';
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['subscription_entitlements']['Insert']>;
      };
      services: {
        Row: {
          id: string;
          provider_id: string;
          name: string;
          description: string | null;
          duration_minutes: number;
          price_cents: number;
          currency: string;
          active: boolean;
          sort_order: number;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          provider_id: string;
          name: string;
          description?: string | null;
          duration_minutes?: number;
          price_cents?: number;
          currency?: string;
          active?: boolean;
          sort_order?: number;
          created_at?: string | null;
        };
        Update: Partial<Database['public']['Tables']['services']['Insert']>;
      };
      availability: {
        Row: {
          id: string;
          provider_id: string;
          day_of_week: number;
          start_time: string;
          end_time: string;
          timezone: string;
          active: boolean;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          provider_id: string;
          day_of_week: number;
          start_time: string;
          end_time: string;
          timezone?: string;
          active?: boolean;
          created_at?: string | null;
        };
        Update: Partial<Database['public']['Tables']['availability']['Insert']>;
      };
      provider_preferences: {
        Row: {
          user_id: string;
          business_category: string | null;
          agent_tone: string | null;
          approval_mode: 'manual' | 'auto_eligible';
          moderation_level: 'low' | 'medium' | 'strict';
          follow_up_enabled: boolean;
          notifications_enabled: boolean;
          notification_permission: 'granted' | 'denied' | 'unsupported' | 'skipped';
          message_channels: string[];
          common_questions: string[];
          response_boundaries: string | null;
          booking_context_enabled: boolean;
          setup_completed_at: string | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          user_id: string;
          business_category?: string | null;
          agent_tone?: string | null;
          approval_mode?: 'manual' | 'auto_eligible';
          moderation_level?: 'low' | 'medium' | 'strict';
          follow_up_enabled?: boolean;
          notifications_enabled?: boolean;
          notification_permission?: 'granted' | 'denied' | 'unsupported' | 'skipped';
          message_channels?: string[];
          common_questions?: string[];
          response_boundaries?: string | null;
          booking_context_enabled?: boolean;
          setup_completed_at?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: Partial<Database['public']['Tables']['provider_preferences']['Insert']>;
      };
      threads: {
        Row: {
          id: string;
          user_id: string;
          channel: string;
          external_thread_id: string | null;
          client_handle: string | null;
          state: string | null;
          last_activity_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          channel: string;
          external_thread_id?: string | null;
          client_handle?: string | null;
          state?: string | null;
          last_activity_at?: string | null;
        };
        Update: Partial<Database['public']['Tables']['threads']['Insert']>;
      };
      messages: {
        Row: {
          id: string;
          conversation_id: string | null;
          thread_id: string | null;
          user_id: string | null;
          text: string | null;
          sender: string | null;
          direction: string | null;
          filtered_text: string | null;
          is_voicemail: boolean | null;
          ai_label: string | null;
          ai_generated: boolean | null;
          ai_confidence: number | null;
          created_at: string | null;
          // Agent runtime / approval queue (Phase 2)
          approval_status: ApprovalStatus | null;
          response_source: ResponseSource | null;
          reply_to_message_id: string | null;
          delivered_at: string | null;
        };
        Insert: {
          id?: string;
          conversation_id?: string | null;
          thread_id?: string | null;
          user_id?: string | null;
          text?: string | null;
          sender?: string | null;
          direction?: string | null;
          filtered_text?: string | null;
          is_voicemail?: boolean | null;
          ai_label?: string | null;
          ai_generated?: boolean | null;
          ai_confidence?: number | null;
          created_at?: string | null;
          approval_status?: ApprovalStatus | null;
          response_source?: ResponseSource | null;
          reply_to_message_id?: string | null;
          delivered_at?: string | null;
        };
        Update: Partial<Database['public']['Tables']['messages']['Insert']>;
      };
      agent_channels: {
        Row: {
          id: string;
          user_id: string;
          channel: string;
          external_account_id: string | null;
          bot_token: string | null;
          webhook_secret: string;
          metadata: Record<string, unknown>;
          active: boolean;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          channel: string;
          external_account_id?: string | null;
          bot_token?: string | null;
          webhook_secret: string;
          metadata?: Record<string, unknown>;
          active?: boolean;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: Partial<Database['public']['Tables']['agent_channels']['Insert']>;
      };
      agent_events: {
        Row: {
          id: string;
          user_id: string | null;
          thread_id: string | null;
          message_id: string | null;
          kind: string;
          source: string | null;
          intent: string | null;
          confidence: number | null;
          detail: Record<string, unknown> | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          thread_id?: string | null;
          message_id?: string | null;
          kind: string;
          source?: string | null;
          intent?: string | null;
          confidence?: number | null;
          detail?: Record<string, unknown> | null;
          created_at?: string | null;
        };
        Update: Partial<Database['public']['Tables']['agent_events']['Insert']>;
      };
      bookings: {
        Row: {
          id: string;
          user_id: string;
          thread_id: string | null;
          calendar_event_id: string | null;
          start: string | null;
          end: string | null;
          status: string | null;
          created_at: string | null;
          // Portal + payment fields (Phase 1.5)
          service_id: string | null;
          client_name: string | null;
          client_contact: string | null;
          source: string | null;
          amount_cents: number | null;
          deposit_cents: number | null;
          currency: string | null;
          payment_status: string | null;
          payment_provider: string | null;
          payment_ref: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          thread_id?: string | null;
          calendar_event_id?: string | null;
          start?: string | null;
          end?: string | null;
          status?: string | null;
          created_at?: string | null;
          service_id?: string | null;
          client_name?: string | null;
          client_contact?: string | null;
          source?: string | null;
          amount_cents?: number | null;
          deposit_cents?: number | null;
          currency?: string | null;
          payment_status?: string | null;
          payment_provider?: string | null;
          payment_ref?: string | null;
        };
        Update: Partial<Database['public']['Tables']['bookings']['Insert']>;
      };
      faq: {
        Row: {
          id: string;
          user_id: string;
          trigger: string | null;
          reply_text: string | null;
          enabled: boolean | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          trigger?: string | null;
          reply_text?: string | null;
          enabled?: boolean | null;
          created_at?: string | null;
        };
        Update: Partial<Database['public']['Tables']['faq']['Insert']>;
      };
      landing_intents: {
        Row: {
          id: string;
          role: 'provider' | 'client';
          email: string;
          name: string;
          user_agent: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          role: 'provider' | 'client';
          email: string;
          name: string;
          user_agent?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['landing_intents']['Insert']>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}

export type Profile = Database['public']['Tables']['profiles']['Row'];
export type Thread = Database['public']['Tables']['threads']['Row'];
export type Message = Database['public']['Tables']['messages']['Row'];
export type FAQ = Database['public']['Tables']['faq']['Row'];
export type Booking = Database['public']['Tables']['bookings']['Row'];
export type Service = Database['public']['Tables']['services']['Row'];
export type Availability = Database['public']['Tables']['availability']['Row'];
export type ProviderPreferences = Database['public']['Tables']['provider_preferences']['Row'];
export type AgentChannel = Database['public']['Tables']['agent_channels']['Row'];
export type AgentEvent = Database['public']['Tables']['agent_events']['Row'];

export type ApprovalStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'sent'
  | 'auto_sent'
  | 'failed';
export type ResponseSource = 'faq' | 'llm' | 'fallback';

export interface ThreadWithMessages extends Thread {
  messages: Message[];
}

export interface BookingWithThread extends Booking {
  threads: {
    client_handle: string | null;
    channel: string;
  };
}

export type ChannelType = 'gv' | 'telegram' | 'whatsapp' | 'email' | 'sms' | 'webchat';
export type ThreadState =
  | 'open'
  | 'qualifying'
  | 'offering'
  | 'awaiting_client'
  | 'tentative'
  | 'confirmed'
  | 'cancelled'
  | 'abandoned';
export type MessageDirection = 'in' | 'out';
export type BookingStatus = 'tentative' | 'confirmed' | 'cancelled';
export type PlanType = 'starter' | 'pro' | 'premium';
