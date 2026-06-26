import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Check, Pencil } from 'lucide-react-native';
import { landingFonts, landingPalette } from './styles';

const palette = {
  ink: '#0a090f',
  panel: '#16121d',
  card: landingPalette.paper,
  text: landingPalette.paper,
  muted: landingPalette.muted,
  darkText: landingPalette.darkText,
  darkMuted: landingPalette.bodyText,
  border: landingPalette.borderDark,
  accent: landingPalette.purpleAccent,
  accentDark: landingPalette.purpleActive,
  accentDim: landingPalette.purpleDim,
  primary: landingPalette.purple,
  onPrimary: landingPalette.onPurple,
};

const roundedText = {
  fontFamily: landingFonts.rounded,
};

export function HeroAppMockup({ compact = false }: { compact?: boolean }) {
  return (
    <View
      style={[styles.shell, compact && styles.shellCompact]}
      accessibilityLabel="nitime provider workspace showing one booking request, a drafted reply, and approval controls"
    >
      <View style={styles.topBar}>
        <Text style={styles.productTitle}>{"Tonight's request"}</Text>
      </View>

      <View style={styles.requestCard}>
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.clientLine}>Private request</Text>
            <Text style={styles.timeText}>8:42 PM via Google Voice</Text>
          </View>
        </View>

        <Text style={styles.inboundText}>
          {'"Are you available Friday evening? I would like to know the rate and booking steps."'}
        </Text>

        <View style={styles.contextBlock}>
          <Text style={styles.contextTitle}>Attached context</Text>
          <Text style={styles.contextText}>
            Friday 7:30 PM is open. Deposit before confirmation.
          </Text>
        </View>

        <View style={styles.draftBox}>
          <Text style={styles.draftTitle}>Reply draft</Text>
          <Text style={styles.draftText}>
            Friday evening is available. I can hold 7:30 PM after the deposit is
            received. Would you like the booking details?
          </Text>
        </View>

        <View style={styles.actionRow}>
          <View style={styles.approveButton}>
            <Check size={14} color={palette.onPrimary} />
            <Text style={styles.approveText}>Approve reply</Text>
          </View>
          <View style={styles.editButton}>
            <Pencil size={13} color={palette.accentDark} />
            <Text style={styles.editText}>Edit</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    width: 430,
    maxWidth: '100%',
    backgroundColor: palette.panel,
    borderColor: palette.border,
    borderWidth: 1,
    borderRadius: 8,
    padding: 18,
    gap: 14,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 28 },
    shadowOpacity: 0.28,
    shadowRadius: 34,
    elevation: 12,
  },
  shellCompact: {
    width: 328,
    padding: 14,
  },
  topBar: {
    gap: 3,
  },
  productLabel: {
    ...roundedText,
    color: palette.muted,
    fontSize: 11,
    fontWeight: '800',
  },
  productTitle: {
    ...roundedText,
    color: palette.text,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '900',
  },
  requestCard: {
    backgroundColor: palette.card,
    borderRadius: 8,
    padding: 15,
    gap: 13,
  },
  cardHeader: {
    gap: 4,
  },
  clientLine: {
    ...roundedText,
    color: palette.darkText,
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '900',
  },
  timeText: {
    ...roundedText,
    color: palette.darkMuted,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '700',
  },
  inboundText: {
    ...roundedText,
    color: palette.darkText,
    fontSize: 14,
    lineHeight: 21,
  },
  contextBlock: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: palette.accentDim,
    paddingVertical: 11,
    gap: 4,
  },
  contextTitle: {
    ...roundedText,
    color: palette.accentDark,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '900',
  },
  contextText: {
    ...roundedText,
    color: palette.darkMuted,
    fontSize: 13,
    lineHeight: 20,
  },
  draftBox: {
    backgroundColor: palette.ink,
    borderRadius: 8,
    padding: 12,
    gap: 7,
  },
  draftTitle: {
    ...roundedText,
    color: palette.accent,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '900',
  },
  draftText: {
    ...roundedText,
    color: palette.text,
    fontSize: 12.5,
    lineHeight: 19,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  approveButton: {
    flex: 1,
    minHeight: 40,
    borderRadius: 8,
    backgroundColor: palette.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  approveText: {
    ...roundedText,
    color: palette.onPrimary,
    fontSize: 13,
    fontWeight: '900',
  },
  editButton: {
    width: 82,
    minHeight: 40,
    borderRadius: 8,
    borderColor: palette.accentDim,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  editText: {
    ...roundedText,
    color: palette.accentDark,
    fontSize: 13,
    fontWeight: '900',
  },
});
