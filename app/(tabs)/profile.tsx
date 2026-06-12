import React, { useState } from 'react';
import { router } from 'expo-router';
import { ArrowLeft, Check, Save } from 'lucide-react-native';
import { useAuth } from '@/hooks/useAuth';
import { isValidSlug, slugifyHandle } from '@/utils/channelSetup';
import {
  XStack,
  YStack,
  Button,
  Field,
  IconButton,
  PageHeader,
  Screen,
  Section,
  Surface,
  Text,
  colors,
} from '@/components/ui';

export default function ProfileScreen() {
  const { user, updateProfile, isSupabaseConfigured } = useAuth();
  const profile = user?.profile;

  const [businessName, setBusinessName] = useState(profile?.business_name ?? '');
  const [displayName, setDisplayName] = useState(profile?.display_name ?? '');
  const [headline, setHeadline] = useState(profile?.headline ?? '');
  const [locationLabel, setLocationLabel] = useState(profile?.location_label ?? '');
  const [slug, setSlug] = useState(profile?.slug ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const trimmedSlug = slug.trim().toLowerCase();
  const slugInvalid = trimmedSlug.length > 0 && !isValidSlug(trimmedSlug);

  const handleSuggestSlug = () => {
    const basis = displayName || businessName || user?.email || 'provider';
    setSlug(slugifyHandle(basis));
    setError(null);
  };

  const handleSave = async () => {
    if (!businessName.trim()) {
      setError('Business name is required — it is how the agent introduces you.');
      return;
    }
    if (slugInvalid) {
      setError('The chat handle can only use lowercase letters, numbers, and single dashes.');
      return;
    }
    setSaving(true);
    setError(null);
    setSaved(false);
    const result = await updateProfile({
      business_name: businessName.trim(),
      display_name: displayName.trim() || businessName.trim(),
      headline: headline.trim() || null,
      location_label: locationLabel.trim() || null,
      slug: trimmedSlug || null,
    });
    setSaving(false);
    if (result.success) {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } else {
      setError(
        result.error?.includes('profiles_slug')
          ? 'That chat handle is already taken — try another.'
          : result.error ?? 'Could not save the profile.'
      );
    }
  };

  return (
    <Screen>
      <PageHeader
        title="Profile & business"
        subtitle="How your agent introduces you to clients."
        action={<IconButton icon={ArrowLeft} label="Back to settings" onPress={() => router.back()} />}
      />

      {!isSupabaseConfigured ? (
        <Surface tone="info">
          <Text fontSize={13} color={colors.textSecondary}>
            Demo mode — changes are stored on this device only.
          </Text>
        </Surface>
      ) : null}

      <Section title="Identity">
        <YStack gap={12}>
          <Field
            label="Business name"
            value={businessName}
            onChangeText={setBusinessName}
            placeholder="Luna Massage"
          />
          <Field
            label="Display name (shown to clients)"
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="Luna"
          />
          <Field
            label="Headline (optional)"
            value={headline}
            onChangeText={setHeadline}
            placeholder="Evening & late-night appointments"
          />
          <Field
            label="Location label (optional)"
            value={locationLabel}
            onChangeText={setLocationLabel}
            placeholder="Berlin Mitte"
          />
        </YStack>
      </Section>

      <Section title="Chat handle">
        <YStack gap={10}>
          <Field
            label="Public handle (used in your web chat link)"
            value={slug}
            onChangeText={(value) => {
              setSlug(value);
              setError(null);
            }}
            placeholder="luna-massage"
          />
          {slugInvalid ? (
            <Text fontSize={13} color={colors.danger}>
              Lowercase letters, numbers, and single dashes only — like luna-massage.
            </Text>
          ) : (
            <Text fontSize={12} color={colors.textMuted}>
              Clients see this in your web chat link. Changing it changes the link.
            </Text>
          )}
          <XStack>
            <Button variant="secondary" onPress={handleSuggestSlug}>
              Suggest from name
            </Button>
          </XStack>
        </YStack>
      </Section>

      {error ? (
        <Text fontSize={13} color={colors.danger}>
          {error}
        </Text>
      ) : null}

      {saved ? (
        <Surface tone="success">
          <XStack alignItems="center" gap={8}>
            <Check size={16} color={colors.success} />
            <Text fontSize={13} color={colors.text}>
              Profile saved.
            </Text>
          </XStack>
        </Surface>
      ) : null}

      <Button icon={Save} loading={saving} disabled={saving} onPress={handleSave}>
        Save profile
      </Button>
    </Screen>
  );
}
