import React from 'react';
import { Check, CreditCard } from 'lucide-react-native';
import { useAuth } from '@/hooks/useAuth';
import { XStack, YStack, Text, Badge, ListRow, PageHeader, ProgressBar, Screen, Section, Surface, colors } from '@/components/ui';

interface Plan {
  id: string;
  name: string;
  price: string;
  features: string[];
  popular?: boolean;
}

const PLANS: Plan[] = [
  {
    id: 'starter',
    name: 'Starter',
    price: '$29/month',
    features: ['100 agent replies/month', '2 connected channels', 'Booking calendar', 'Email support'],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '$79/month',
    features: ['1,000 agent replies/month', '5 connected channels', 'Advanced booking automation', 'Priority support'],
    popular: true,
  },
  {
    id: 'premium',
    name: 'Premium',
    price: '$149/month',
    features: ['Unlimited agent replies', 'All supported channels', 'Custom training', 'Advanced reporting'],
  },
];

export default function BillingScreen() {
  const { user, isSupabaseConfigured } = useAuth();
  const profile = user?.profile;

  const currentPlanId = profile?.plan ?? 'starter';
  const activePlan = PLANS.find((plan) => plan.id === currentPlanId) ?? PLANS[0];
  const usageCount = profile?.usage_month_count ?? 0;
  const usageLimit = profile?.usage_limit ?? 100;

  return (
    <Screen>
      <PageHeader title="Plan & Billing" subtitle="Subscription and monthly usage." />

      <Surface tone="info">
        <Text fontSize={13} color={colors.textSecondary}>
          Billing is free during early access — paid plans and checkout open at launch. The plans
          below show what will be included.
        </Text>
      </Surface>

      <Section title="Current plan">
        <Surface tone="primary">
          <YStack gap={8}>
            <XStack justifyContent="space-between" alignItems="center" gap={12}>
              <Text fontSize={16} fontWeight="700" color={colors.text}>{activePlan.name}</Text>
              <Badge tone="success">free during early access</Badge>
            </XStack>
            <Text fontSize={14} color={colors.textSecondary}>
              {activePlan.price} at launch
            </Text>
          </YStack>
        </Surface>
      </Section>

      <Section title="Usage this month">
        <Surface>
          <YStack gap={10}>
            <XStack justifyContent="space-between">
              <Text fontSize={14} fontWeight="700" color={colors.text}>Agent replies</Text>
              <Text fontSize={13} color={colors.textSecondary}>
                {usageCount} / {usageLimit}
              </Text>
            </XStack>
            <ProgressBar value={usageLimit > 0 ? (usageCount / usageLimit) * 100 : 0} />
            {!isSupabaseConfigured ? (
              <Text fontSize={12} color={colors.textMuted}>
                Demo mode — usage is not tracked without Supabase.
              </Text>
            ) : null}
          </YStack>
        </Surface>
      </Section>

      <Section title="Plans at launch">
        <YStack gap={10}>
          {PLANS.map((plan) => (
            <Surface key={plan.id} tone={plan.id === currentPlanId ? 'primary' : plan.popular ? 'warning' : 'neutral'}>
              <YStack gap={12}>
                <XStack justifyContent="space-between" alignItems="center" gap={12}>
                  <YStack>
                    <Text fontSize={17} fontWeight="800" color={colors.text}>{plan.name}</Text>
                    <Text fontSize={14} color={colors.textSecondary}>{plan.price}</Text>
                  </YStack>
                  {plan.popular ? <Badge tone="warning">popular</Badge> : null}
                  {plan.id === currentPlanId ? <Badge tone="primary">your plan</Badge> : null}
                </XStack>
                <YStack gap={6}>
                  {plan.features.map((feature) => (
                    <XStack key={feature} alignItems="center" gap={8}>
                      <Check size={15} color={colors.success} />
                      <Text fontSize={13} color={colors.textSecondary}>{feature}</Text>
                    </XStack>
                  ))}
                </YStack>
              </YStack>
            </Surface>
          ))}
        </YStack>
      </Section>

      <Section title="Payment method">
        <ListRow
          icon={CreditCard}
          title="No payment method needed yet"
          subtitle="Checkout opens when paid plans launch. You will be asked before anything is charged."
        />
      </Section>
    </Screen>
  );
}
