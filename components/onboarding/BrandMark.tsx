import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { OwlMascot } from '@/components/landing/OwlMascot';
import { onb } from './theme';

// Small Nitime AI lockup (owl + wordmark) for the light conversion screens.
export function BrandMark({ size = 26 }: { size?: number }) {
  return (
    <View style={styles.row} accessibilityRole="header" accessibilityLabel="Nitime AI">
      <OwlMascot size={size} glow={false} />
      <Text style={styles.name}>nitime ai</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  name: {
    color: onb.ink,
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});
