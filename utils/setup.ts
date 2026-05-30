import AsyncStorage from '@react-native-async-storage/async-storage';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { Availability, Profile, ProviderPreferences, Service } from '@/types/database';

export type ApprovalMode = 'manual' | 'auto_eligible';
export type ModerationLevel = 'low' | 'medium' | 'strict';
export type NotificationPermissionState = 'granted' | 'denied' | 'unsupported' | 'skipped';

export type SetupServiceDraft = {
  name: string;
  durationMinutes: number;
  price: string;
};

export type SetupAvailabilityDraft = {
  days: number[];
  startTime: string;
  endTime: string;
};

export type SetupPayload = {
  businessCategory: string;
  businessName: string;
  displayName: string;
  headline: string;
  locationLabel: string;
  timezone: string;
  messageChannels: string[];
  commonQuestions: string[];
  responseBoundaries: string;
  bookingContextEnabled: boolean;
  services: SetupServiceDraft[];
  availability: SetupAvailabilityDraft;
  agentTone: string;
  approvalMode: ApprovalMode;
  followUpEnabled: boolean;
  moderationLevel: ModerationLevel;
  notificationsEnabled: boolean;
  notificationPermission: NotificationPermissionState;
};

export type LoadedSetupState = {
  profile: Profile | null;
  preferences: ProviderPreferences | null;
  services: Service[];
  availability: Availability[];
  demoPayload: SetupPayload | null;
};

const DEMO_SETUP_PREFIX = '@demo_setup_state:';
const DEMO_USER_KEY = '@demo_user';

export const defaultSetupPayload = (businessName = ''): SetupPayload => ({
  businessCategory: 'Wellness',
  businessName,
  displayName: businessName,
  headline: '',
  locationLabel: '',
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
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
});

function demoSetupKey(userId: string) {
  return `${DEMO_SETUP_PREFIX}${userId}`;
}

function dollarsToCents(value: string) {
  const parsed = Number(value.replace(/[^0-9.]/g, ''));
  if (!Number.isFinite(parsed)) {
    return 0;
  }
  return Math.max(0, Math.round(parsed * 100));
}

function centsToDollars(value: number) {
  return String(Math.round(value) / 100);
}

function mapAvailability(rows: Availability[]): SetupAvailabilityDraft {
  if (rows.length === 0) {
    return defaultSetupPayload().availability;
  }

  return {
    days: rows.map((row) => row.day_of_week).sort(),
    startTime: rows[0].start_time.slice(0, 5),
    endTime: rows[0].end_time.slice(0, 5),
  };
}

export function setupPayloadFromLoaded(state: LoadedSetupState, fallbackBusinessName = ''): SetupPayload {
  if (state.demoPayload) {
    return state.demoPayload;
  }

  const base = defaultSetupPayload(state.profile?.business_name ?? fallbackBusinessName);

  return {
    ...base,
    businessCategory: state.preferences?.business_category ?? base.businessCategory,
    businessName: state.profile?.business_name ?? base.businessName,
    displayName: state.profile?.display_name ?? state.profile?.business_name ?? base.displayName,
    headline: state.profile?.headline ?? '',
    locationLabel: state.profile?.location_label ?? '',
    timezone: state.profile?.timezone ?? base.timezone,
    messageChannels: state.preferences?.message_channels ?? base.messageChannels,
    commonQuestions: state.preferences?.common_questions ?? base.commonQuestions,
    responseBoundaries: state.preferences?.response_boundaries ?? '',
    bookingContextEnabled: state.preferences?.booking_context_enabled ?? base.bookingContextEnabled,
    services:
      state.services.length > 0
        ? state.services.map((service) => ({
            name: service.name,
            durationMinutes: service.duration_minutes,
            price: centsToDollars(service.price_cents),
          }))
        : base.services,
    availability: mapAvailability(state.availability),
    agentTone: state.preferences?.agent_tone ?? base.agentTone,
    approvalMode: state.preferences?.approval_mode ?? base.approvalMode,
    followUpEnabled: state.preferences?.follow_up_enabled ?? base.followUpEnabled,
    moderationLevel: state.preferences?.moderation_level ?? base.moderationLevel,
    notificationsEnabled: state.preferences?.notifications_enabled ?? base.notificationsEnabled,
    notificationPermission: state.preferences?.notification_permission ?? base.notificationPermission,
  };
}

export const setupService = {
  async load(userId: string): Promise<LoadedSetupState> {
    const empty = {
      profile: null,
      preferences: null,
      services: [],
      availability: [],
      demoPayload: null,
    };

    if (!supabase) {
      const stored = await AsyncStorage.getItem(demoSetupKey(userId));
      return {
        ...empty,
        demoPayload: stored ? (JSON.parse(stored) as SetupPayload) : null,
      };
    }

    const [profileResult, preferencesResult, servicesResult, availabilityResult] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
      supabase.from('provider_preferences').select('*').eq('user_id', userId).maybeSingle(),
      supabase.from('services').select('*').eq('provider_id', userId).order('sort_order', { ascending: true }),
      supabase.from('availability').select('*').eq('provider_id', userId).order('day_of_week', { ascending: true }),
    ]);

    if (profileResult.error) throw profileResult.error;
    if (preferencesResult.error) throw preferencesResult.error;
    if (servicesResult.error) throw servicesResult.error;
    if (availabilityResult.error) throw availabilityResult.error;

    return {
      profile: profileResult.data,
      preferences: preferencesResult.data,
      services: servicesResult.data ?? [],
      availability: availabilityResult.data ?? [],
      demoPayload: null,
    };
  },

  async save(userId: string, email: string, payload: SetupPayload): Promise<void> {
    const setupCompletedAt = new Date().toISOString();

    if (!supabase) {
      await AsyncStorage.setItem(demoSetupKey(userId), JSON.stringify(payload));
      const storedUser = await AsyncStorage.getItem(DEMO_USER_KEY);
      if (storedUser) {
        const demoUser = JSON.parse(storedUser);
        demoUser.profile = {
          ...demoUser.profile,
          business_name: payload.businessName,
          display_name: payload.displayName,
          headline: payload.headline || null,
          location_label: payload.locationLabel || null,
          timezone: payload.timezone,
          updated_at: setupCompletedAt,
        };
        await AsyncStorage.setItem(DEMO_USER_KEY, JSON.stringify(demoUser));
      }
      return;
    }

    const { error: profileError } = await supabase.from('profiles').upsert(
      {
        id: userId,
        email,
        business_name: payload.businessName,
        display_name: payload.displayName,
        headline: payload.headline || null,
        location_label: payload.locationLabel || null,
        timezone: payload.timezone,
        updated_at: setupCompletedAt,
      },
      { onConflict: 'id' }
    );
    if (profileError) throw profileError;

    const { error: preferencesError } = await supabase.from('provider_preferences').upsert(
      {
        user_id: userId,
        business_category: payload.businessCategory,
        agent_tone: payload.agentTone,
        approval_mode: payload.approvalMode,
        moderation_level: payload.moderationLevel,
        follow_up_enabled: payload.followUpEnabled,
        notifications_enabled: payload.notificationsEnabled,
        notification_permission: payload.notificationPermission,
        message_channels: payload.messageChannels,
        common_questions: payload.commonQuestions,
        response_boundaries: payload.responseBoundaries || null,
        booking_context_enabled: payload.bookingContextEnabled,
        setup_completed_at: setupCompletedAt,
      },
      { onConflict: 'user_id' }
    );
    if (preferencesError) throw preferencesError;

    const { error: deleteServicesError } = await supabase.from('services').delete().eq('provider_id', userId);
    if (deleteServicesError) throw deleteServicesError;

    const services = payload.services
      .filter((service) => service.name.trim())
      .map((service, index) => ({
        provider_id: userId,
        name: service.name.trim(),
        duration_minutes: service.durationMinutes,
        price_cents: dollarsToCents(service.price),
        currency: 'USD',
        active: true,
        sort_order: index,
      }));

    if (services.length > 0) {
      const { error: servicesError } = await supabase.from('services').insert(services);
      if (servicesError) throw servicesError;
    }

    const { error: deleteAvailabilityError } = await supabase.from('availability').delete().eq('provider_id', userId);
    if (deleteAvailabilityError) throw deleteAvailabilityError;

    const availability = payload.bookingContextEnabled
      ? payload.availability.days.map((day) => ({
          provider_id: userId,
          day_of_week: day,
          start_time: payload.availability.startTime,
          end_time: payload.availability.endTime,
          timezone: payload.timezone,
          active: true,
        }))
      : [];

    if (availability.length > 0) {
      const { error: availabilityError } = await supabase.from('availability').insert(availability);
      if (availabilityError) throw availabilityError;
    }
  },

  isPersistentConfigured: isSupabaseConfigured,
};
