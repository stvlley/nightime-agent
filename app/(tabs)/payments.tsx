import React, { useEffect, useMemo, useState } from 'react';
import { Linking, Pressable, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { ArrowLeft, Check, ExternalLink } from 'lucide-react-native';
import { router } from 'expo-router';
import {
  Badge,
  Button,
  EmptyState,
  Field,
  IconButton,
  LoadingState,
  PageHeader,
  Screen,
  Section,
  Surface,
  Text,
  XStack,
  YStack,
  colors,
} from '@/components/ui';
import {
  PAYMENT_METHODS,
  PaymentHandles,
  PaymentMethodDef,
  loadPaymentHandles,
  savePaymentHandles,
} from '@/utils/paymentLinks';

export default function PaymentsScreen() {
  const [handles, setHandles] = useState<PaymentHandles>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  // Start in client view when at least one method is set; otherwise editing.
  const [mode, setMode] = useState<'edit' | 'client'>('edit');

  useEffect(() => {
    loadPaymentHandles()
      .then((stored) => {
        setHandles(stored);
        if (Object.keys(stored).length > 0) setMode('client');
      })
      .finally(() => setLoading(false));
  }, []);

  const configured = useMemo(
    () => PAYMENT_METHODS.filter((m) => (handles[m.id] ?? '').trim().length > 0),
    [handles]
  );

  const update = (id: PaymentMethodDef['id'], value: string) => {
    setHandles((prev) => ({ ...prev, [id]: value }));
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await savePaymentHandles(handles);
      setSaved(true);
      if (configured.length > 0) setMode('client');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Screen>
        <PageHeader title="Payment links" subtitle="A scannable card of your payment options." />
        <LoadingState variant="card" />
      </Screen>
    );
  }

  return (
    <Screen>
      <XStack alignItems="center" gap={8}>
        <IconButton icon={ArrowLeft} label="Back" onPress={() => router.back()} />
        <YStack flex={1}>
          <PageHeader
            title="Payment links"
            subtitle="Clients scan to pay you directly — money never moves through nitime."
          />
        </YStack>
      </XStack>

      <SegmentedToggle mode={mode} onChange={setMode} configuredCount={configured.length} />

      {mode === 'edit' ? (
        <Section title="Your payment handles">
          <YStack gap={14}>
            {PAYMENT_METHODS.map((method) => (
              <YStack key={method.id} gap={6}>
                <XStack alignItems="center" gap={8}>
                  <View
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: 5,
                      backgroundColor: method.color,
                    }}
                  />
                  <Text fontSize={14} fontWeight="700" color={colors.text}>
                    {method.label}
                  </Text>
                </XStack>
                <Field
                  value={handles[method.id] ?? ''}
                  onChangeText={(v) => update(method.id, v)}
                  placeholder={method.placeholder}
                />
                <Text fontSize={12} color={colors.textMuted}>
                  {method.hint}
                </Text>
              </YStack>
            ))}

            <Button icon={saved ? Check : undefined} onPress={handleSave} loading={saving} disabled={saving}>
              {saved ? 'Saved' : 'Save payment links'}
            </Button>
          </YStack>
        </Section>
      ) : configured.length === 0 ? (
        <EmptyState
          title="No payment links yet"
          message="Add at least one handle in Edit to show a scannable payment card."
        />
      ) : (
        <Section title="Scan to pay">
          <YStack gap={14}>
            {configured.map((method) => (
              <PaymentCard key={method.id} method={method} handle={(handles[method.id] ?? '').trim()} />
            ))}
            <Text fontSize={12} color={colors.textMuted}>
              Show this screen to a client, or screenshot a code to share. Payments go straight to your
              own PayPal, Venmo, Cash App, or Zelle — nitime never touches the money.
            </Text>
          </YStack>
        </Section>
      )}
    </Screen>
  );
}

function SegmentedToggle({
  mode,
  onChange,
  configuredCount,
}: {
  mode: 'edit' | 'client';
  onChange: (m: 'edit' | 'client') => void;
  configuredCount: number;
}) {
  return (
    <XStack
      gap={4}
      style={{
        backgroundColor: colors.surfaceMuted,
        borderRadius: 8,
        padding: 4,
      }}
    >
      {(['client', 'edit'] as const).map((value) => {
        const active = mode === value;
        const label = value === 'client' ? `Client view${configuredCount ? ` (${configuredCount})` : ''}` : 'Edit';
        return (
          <Pressable
            key={value}
            onPress={() => onChange(value)}
            accessibilityRole="button"
            accessibilityLabel={value === 'client' ? 'Client view' : 'Edit payment links'}
            style={{
              flex: 1,
              alignItems: 'center',
              justifyContent: 'center',
              paddingVertical: 9,
              borderRadius: 7,
              backgroundColor: active ? colors.surface : 'transparent',
              borderWidth: active ? 1 : 0,
              borderColor: colors.border,
            }}
          >
            <Text fontSize={13} fontWeight="800" color={active ? colors.text : colors.textMuted}>
              {label}
            </Text>
          </Pressable>
        );
      })}
    </XStack>
  );
}

function PaymentCard({ method, handle }: { method: PaymentMethodDef; handle: string }) {
  const payload = method.buildPayload(handle);
  const display = `${method.prefix ?? ''}${handle.replace(/^[@$]/, '')}`;

  return (
    <Surface>
      <XStack gap={14} alignItems="center">
        <View
          style={{
            backgroundColor: '#ffffff',
            borderRadius: 8,
            padding: 10,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <QRCode value={payload} size={104} backgroundColor="#ffffff" color="#000000" />
        </View>

        <YStack flex={1} gap={8}>
          <XStack alignItems="center" gap={8}>
            <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: method.color }} />
            <Text fontSize={16} fontWeight="800" color={colors.text}>
              {method.label}
            </Text>
          </XStack>
          <Text fontSize={14} color={colors.text}>
            {display}
          </Text>
          {method.openable ? (
            <Button variant="secondary" icon={ExternalLink} onPress={() => Linking.openURL(payload)}>
              Open link
            </Button>
          ) : (
            <Badge tone="neutral">Scan in your bank app</Badge>
          )}
        </YStack>
      </XStack>
    </Surface>
  );
}
