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
        };
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>;
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
        };
        Update: Partial<Database['public']['Tables']['messages']['Insert']>;
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

export interface ThreadWithMessages extends Thread {
  messages: Message[];
}

export interface BookingWithThread extends Booking {
  threads: {
    client_handle: string | null;
    channel: string;
  };
}

export type ChannelType = 'gv' | 'telegram' | 'whatsapp' | 'email' | 'sms';
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
