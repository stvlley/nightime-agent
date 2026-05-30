import React from 'react';
import { Brain, Calendar, MessageSquare, Target } from 'lucide-react-native';
import { Badge, Button, ProgressBar, StatBlock, Surface, Text, XStack, YStack, colors } from '@/components/ui';

interface AIInsightsCardProps {
  totalConversations: number;
  totalMessages: number;
  confidenceScore: number;
  platformBreakdown: Record<string, number>;
  onViewDetails: () => void;
}

function toneForConfidence(score: number) {
  if (score >= 0.8) return 'success' as const;
  if (score >= 0.6) return 'warning' as const;
  return 'danger' as const;
}

export default function AIInsightsCard({
  totalConversations,
  totalMessages,
  confidenceScore,
  platformBreakdown,
  onViewDetails,
}: AIInsightsCardProps) {
  const confidenceTone = toneForConfidence(confidenceScore);

  return (
    <Surface>
      <YStack gap={16}>
        <XStack alignItems="center" justifyContent="space-between" gap={12}>
          <XStack alignItems="center" gap={10}>
            <Brain size={20} color={colors.primary} />
            <YStack>
              <Text fontSize={16} fontWeight="700">Agent training</Text>
              <Text fontSize={13} color={colors.textSecondary}>Conversation import quality</Text>
            </YStack>
          </XStack>
          <Button variant="secondary" onPress={onViewDetails}>Details</Button>
        </XStack>

        <XStack flexWrap="wrap" gap={10}>
          <YStack flex={1} minWidth={130}>
            <StatBlock label="Messages" value={totalMessages.toLocaleString()} icon={MessageSquare} tone="info" />
          </YStack>
          <YStack flex={1} minWidth={130}>
            <StatBlock label="Conversations" value={String(totalConversations)} icon={Calendar} tone="success" />
          </YStack>
          <YStack flex={1} minWidth={130}>
            <StatBlock label="Confidence" value={`${Math.round(confidenceScore * 100)}%`} icon={Target} tone={confidenceTone} />
          </YStack>
        </XStack>

        <YStack gap={8}>
          <ProgressBar value={confidenceScore * 100} tone={confidenceTone} />
          <XStack flexWrap="wrap" gap={6}>
            {Object.entries(platformBreakdown).map(([platform, count]) => (
              <Badge key={platform}>{platform} ({count})</Badge>
            ))}
          </XStack>
        </YStack>
      </YStack>
    </Surface>
  );
}
