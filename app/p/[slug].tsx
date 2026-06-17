import React, { useEffect, useMemo, useState } from 'react';
import { Linking, Platform } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { ExternalLink, MapPin, MessageSquare, ShieldAlert } from 'lucide-react-native';
import { EmptyState, LoadingState, PageHeader, Screen, Section, Surface, Text, Button, Badge, XStack, YStack, colors } from '@/components/ui';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { buildWebchatLink, functionsBaseFromSupabaseUrl } from '@/utils/channelSetup';
import type { PublicProviderProfile } from '@/types/database';

export default function PublicProfileScreen() {
  const { slug } = useLocalSearchParams<{ slug?: string }>();
  const normalizedSlug = typeof slug === 'string' ? slug.trim().toLowerCase() : '';
  const [profile, setProfile] = useState<PublicProviderProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [unlocked, setUnlocked] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadProfile() {
      if (!normalizedSlug || !supabase) {
        if (active) {
          setProfile(null);
          setLoading(false);
        }
        return;
      }

      const { data, error } = await supabase
        .from('public_provider_profiles')
        .select('*')
        .eq('slug', normalizedSlug)
        .maybeSingle();

      if (!active) return;
      setProfile(error ? null : data);
      setUnlocked(false);
      setLoading(false);
    }

    void loadProfile();
    return () => {
      active = false;
    };
  }, [normalizedSlug]);

  const webchatLink = useMemo(() => {
    if (!profile?.slug) return null;
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !anonKey) return null;

    const widgetBase =
      Platform.OS === 'web' && typeof window !== 'undefined'
        ? new URL('/chat.html', window.location.origin).toString()
        : '/chat.html';

    return buildWebchatLink({
      widgetBase,
      slug: profile.slug,
      functionsBase: functionsBaseFromSupabaseUrl(supabaseUrl),
      anonKey,
      brand: profile.display_name || undefined,
    });
  }, [profile]);

  if (loading) {
    return (
      <Screen>
        <PageHeader title="Profile" subtitle="Loading public profile." />
        <LoadingState />
      </Screen>
    );
  }

  if (!isSupabaseConfigured) {
    return (
      <Screen>
        <PageHeader title="Profile unavailable" subtitle="Public pages need Supabase to load provider details." />
        <EmptyState title="Public profile unavailable" message="This environment is not connected to the provider database." />
      </Screen>
    );
  }

  if (!profile) {
    return (
      <Screen>
        <PageHeader title="Profile not found" subtitle="This public page is unavailable." />
        <EmptyState title="No public profile here" message="The provider may have changed their handle or unpublished this page." />
      </Screen>
    );
  }

  if (profile.age_gate_required && !unlocked) {
    return (
      <Screen>
        <PageHeader title={profile.display_name || 'Provider'} subtitle="Age confirmation required." />
        <Surface tone="warning">
          <YStack gap={12}>
            <XStack alignItems="center" gap={8}>
              <ShieldAlert size={18} color={colors.warning} />
              <Text fontSize={15} fontWeight="700" color={colors.text}>
                Adults only
              </Text>
            </XStack>
            <Text fontSize={14} color={colors.textSecondary}>
              This provider requires age confirmation before showing their public profile and chat entry point.
            </Text>
            <Button onPress={() => setUnlocked(true)}>View profile</Button>
          </YStack>
        </Surface>
      </Screen>
    );
  }

  return (
    <Screen>
      <PageHeader
        title={profile.display_name || 'Provider'}
        subtitle={profile.headline || 'Independent provider'}
      />

      <Section>
        <Surface tone="primary">
          <YStack gap={10}>
            <XStack alignItems="center" gap={8} flexWrap="wrap">
              <Badge tone="primary">@{profile.slug}</Badge>
              {profile.location_label ? (
                <XStack alignItems="center" gap={6}>
                  <MapPin size={14} color={colors.textSecondary} />
                  <Text fontSize={13} color={colors.textSecondary}>
                    {profile.location_label}
                  </Text>
                </XStack>
              ) : null}
            </XStack>
            <Text fontSize={15} color={colors.textSecondary}>
              {profile.display_name}
            </Text>
          </YStack>
        </Surface>
      </Section>

      <Section title="Connect">
        <YStack gap={10}>
          <Surface>
            <YStack gap={8}>
              <XStack alignItems="center" gap={8}>
                <MessageSquare size={18} color={colors.primary} />
                <Text fontSize={15} fontWeight="700" color={colors.text}>
                  Web chat
                </Text>
              </XStack>
              <Text fontSize={13} color={colors.textSecondary}>
                Start with a discreet web chat session routed directly to this provider workspace.
              </Text>
              {webchatLink ? (
                <Button icon={ExternalLink} onPress={() => Linking.openURL(webchatLink)}>
                  Open web chat
                </Button>
              ) : (
                <Badge tone="warning">Chat unavailable</Badge>
              )}
            </YStack>
          </Surface>
        </YStack>
      </Section>
    </Screen>
  );
}
