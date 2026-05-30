import React from 'react';
import { Badge, toneForStatus } from '@/components/ui';

interface StatusBadgeProps {
  status: 'ai' | 'manual' | 'booking' | 'voice';
  size?: 'small' | 'medium';
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const label = status === 'ai' ? 'agent' : status;
  return <Badge tone={toneForStatus(status)}>{label}</Badge>;
}
