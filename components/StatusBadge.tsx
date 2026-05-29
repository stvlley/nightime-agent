import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface StatusBadgeProps {
  status: 'ai' | 'manual' | 'booking' | 'voice';
  size?: 'small' | 'medium';
}

export default function StatusBadge({ status, size = 'medium' }: StatusBadgeProps) {
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'ai':
        return {
          backgroundColor: '#dcfce7',
          textColor: '#059669',
          text: 'AI',
        };
      case 'booking':
        return {
          backgroundColor: '#dbeafe',
          textColor: '#2563eb',
          text: 'BOOKING',
        };
      case 'voice':
        return {
          backgroundColor: '#fef3c7',
          textColor: '#d97706',
          text: 'VOICE',
        };
      default:
        return {
          backgroundColor: '#f3f4f6',
          textColor: '#6b7280',
          text: 'MANUAL',
        };
    }
  };

  const config = getStatusConfig(status);
  const isSmall = size === 'small';

  return (
    <View style={[
      styles.badge,
      { backgroundColor: config.backgroundColor },
      isSmall && styles.smallBadge,
    ]}>
      <Text style={[
        styles.badgeText,
        { color: config.textColor },
        isSmall && styles.smallBadgeText,
      ]}>
        {config.text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  smallBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  smallBadgeText: {
    fontSize: 8,
  },
});