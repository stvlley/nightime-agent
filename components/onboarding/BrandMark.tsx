import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { OwlMascot } from '@/components/landing/OwlMascot';
import { fonts } from '@/components/ui';
import { onb } from './theme';

// Small nitime lockup (owl + wordmark) for the light conversion screens.
export function BrandMark({ size = 26 }: { size?: number }) {
  return (
    <View style={styles.row} accessibilityRole="header" accessibilityLabel="nitime">
      <OwlMascot size={size} glow={false} />
      <Text style={styles.name}>nitime</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  name: {
    color: onb.ink,
    fontFamily: fonts.rounded,
    fontSize: 18,
    fontWeight: '700',
  },
});
