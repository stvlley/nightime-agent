import React, { useState } from 'react';
import { Check, CreditCard } from 'lucide-react-native';
import { XStack, YStack, Text, Badge, Button, ListRow, PageHeader, ProgressBar, Screen, Section, Surface, colors } from '@/components/ui';

interface Plan {
  id: string;
  name: string;
  price: string;
  features: string[];
  popular?: boolean;
  current?: boolean;
}

export default function BillingScreen() {
  const [currentPlan, setCurrentPlan] = useState('starter');

  const plans: Plan[] = [
    {
      id: 'starter',
      name: 'Starter',
      price: '$29/month',
      features: ['100 agent replies/month', '2 connected channels', 'Booking calendar', 'Email support'],
      current: currentPlan === 'starter',
    },
    {
      id: 'pro',
      name: 'Pro',
      price: '$79/month',
      features: ['1,000 agent replies/month', '5 connected channels', 'Advanced booking automation', 'Priority support'],
      popular: true,
      current: currentPlan === 'pro',
    },
    {
      id: 'premium',
      name: 'Premium',
      price: '$149/month',
      features: ['Unlimited agent replies', 'All supported channels', 'Custom training', 'Advanced reporting'],
      current: currentPlan === 'premium',
    },
  ];

  const usageStats = [
    { label: 'Agent replies', value: 67, limit: 100 },
    { label: 'Connected channels', value: 3, limit: 5 },
    { label: 'Bookings this month', value: 45, limit: 100 },
  ];

  const activePlan = plans.find((plan) => plan.current);

  return (
    <Screen>
      <PageHeader title="Plan & Billing" subtitle="Subscription and monthly usage." />

      <Section title="Current plan">
        <Surface tone="primary">
          <YStack gap={8}>
            <XStack justifyContent="space-between" alignItems="center" gap={12}>
              <Text fontSize={16} fontWeight="700" color={colors.text}>{activePlan?.name}</Text>
              <Badge tone="primary">current</Badge>
            </XStack>
            <Text fontSize={28} fontWeight="800" color={colors.text}>{activePlan?.price}</Text>
          </YStack>
        </Surface>
      </Section>

      <Section title="Usage">
        <YStack gap={10}>
          {usageStats.map((stat) => (
            <Surface key={stat.label}>
              <YStack gap={10}>
                <XStack justifyContent="space-between">
                  <Text fontSize={14} fontWeight="700" color={colors.text}>{stat.label}</Text>
                  <Text fontSize={13} color={colors.textSecondary}>{stat.value} / {stat.limit}</Text>
                </XStack>
                <ProgressBar value={(stat.value / stat.limit) * 100} />
              </YStack>
            </Surface>
          ))}
        </YStack>
      </Section>

      <Section title="Plans">
        <YStack gap={10}>
          {plans.map((plan) => (
            <Surface key={plan.id} tone={plan.current ? 'primary' : plan.popular ? 'warning' : 'neutral'}>
              <YStack gap={12}>
                <XStack justifyContent="space-between" alignItems="center" gap={12}>
                  <YStack>
                    <Text fontSize={17} fontWeight="800" color={colors.text}>{plan.name}</Text>
                    <Text fontSize={14} color={colors.textSecondary}>{plan.price}</Text>
                  </YStack>
                  {plan.popular ? <Badge tone="warning">popular</Badge> : null}
                  {plan.current ? <Badge tone="primary">current</Badge> : null}
                </XStack>
                <YStack gap={6}>
                  {plan.features.map((feature) => (
                    <XStack key={feature} alignItems="center" gap={8}>
                      <Check size={15} color={colors.success} />
                      <Text fontSize={13} color={colors.textSecondary}>{feature}</Text>
                    </XStack>
                  ))}
                </YStack>
                <Button
                  variant={plan.current ? 'secondary' : 'primary'}
                  disabled={plan.current}
                  onPress={() => setCurrentPlan(plan.id)}
                >
                  {plan.current ? 'Current plan' : currentPlan === 'starter' ? 'Upgrade' : 'Select plan'}
                </Button>
              </YStack>
            </Surface>
          ))}
        </YStack>
      </Section>

      <Section title="Payment method">
        <ListRow icon={CreditCard} title="Card ending 4242" subtitle="Next billing date is not connected yet." />
      </Section>
    </Screen>
  );
}
