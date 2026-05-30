import React from 'react';
import { ActivityIndicator } from 'react-native';
import { colors } from '@/components/ui';

interface LoadingSpinnerProps {
  size?: number;
  color?: string;
}

export default function LoadingSpinner({ color = colors.primary }: LoadingSpinnerProps) {
  return <ActivityIndicator color={color} />;
}
