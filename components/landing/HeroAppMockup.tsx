import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Check, Phone, Sparkles, X } from 'lucide-react-native';
import { onb, tint } from '@/components/onboarding/theme';

// Hero product shot: a phone-framed mockup of the provider app inbox with the
// approval queue, showing a live Google Voice message being answered by the
// assistant and held for one-tap approval. This replaces the decorative owl on
// the landing hero so the first thing a provider sees is the actual product —
// and it foregrounds the Google Voice channel.
export function HeroAppMockup({ compact = false }: { compact?: boolean }) {
  return (
    <View
      style={[styles.device, compact && styles.deviceCompact]}
      accessibilityLabel="Nitime AI inbox showing a Google Voice message answered by the assistant, held for approval"
    >
      {/* App header */}
      <View style={styles.appHeader}>
        <View>
          <Text style={styles.appTitle}>Inbox</Text>
          <Text style={styles.appSubtitle}>Review client conversations</Text>
        </View>
        <View style={styles.notch} />
      </View>

      {/* Needs your approval */}
      <Text style={styles.sectionLabel}>Needs your approval · 1</Text>
      <View style={styles.draftCard}>
        <View style={styles.cardHead}>
          <Text style={styles.clientName}>+1 (415) 555-0148</Text>
          <View style={styles.badgeRow}>
            <View style={styles.channelBadge}>
              <Phone size={10} color={onb.primary} />
              <Text style={styles.channelBadgeText}>Google Voice</Text>
            </View>
            <View style={styles.aiBadge}>
              <Text style={styles.aiBadgeText}>AI</Text>
            </View>
          </View>
        </View>

        <Text style={styles.inbound}>
          Client: Hey! Are you free this Friday evening, and what are your rates?
        </Text>

        <View style={styles.draftBubble}>
          <Text style={styles.draftText}>
            Hi! Friday evening still has openings. My rate is $180 — want me to hold a time?
          </Text>
        </View>

        <View style={styles.actionRow}>
          <View style={styles.approveBtn}>
            <Check size={13} color={onb.onColor} />
            <Text style={styles.approveText}>Approve &amp; send</Text>
          </View>
          <View style={styles.rejectBtn}>
            <X size={13} color={onb.inkSoft} />
          </View>
        </View>
      </View>

      {/* Conversations */}
      <Text style={styles.sectionLabel}>Conversations</Text>
      <ConvRow name="Mia R." preview="Tomorrow at 3 PM is open." channel="WhatsApp" auto />
      <ConvRow name="Sam Rivera" preview="Booking confirmed for Thu." channel="Telegram" />

      {/* Auto-answer footer pill */}
      <View style={styles.footerPill}>
        <Sparkles size={12} color={onb.primary} />
        <Text style={styles.footerPillText}>Routine questions answered in your voice — 24/7</Text>
      </View>
    </View>
  );
}

function ConvRow({
  name,
  preview,
  channel,
  auto = false,
}: {
  name: string;
  preview: string;
  channel: string;
  auto?: boolean;
}) {
  return (
    <View style={styles.convRow}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{name.charAt(0)}</Text>
      </View>
      <View style={styles.convBody}>
        <Text style={styles.convName} numberOfLines={1}>
          {name}
        </Text>
        <Text style={styles.convPreview} numberOfLines={1}>
          {preview}
        </Text>
      </View>
      <View style={styles.convMeta}>
        {auto ? (
          <View style={styles.autoTag}>
            <Text style={styles.autoTagText}>auto</Text>
          </View>
        ) : null}
        <Text style={styles.convChannel}>{channel}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  device: {
    width: 320,
    maxWidth: '100%',
    backgroundColor: onb.bg,
    borderRadius: 32,
    borderWidth: 10,
    borderColor: '#1b1838',
    padding: 16,
    gap: 10,
    shadowColor: onb.shadow,
    shadowOffset: { width: 0, height: 24 },
    shadowOpacity: 1,
    shadowRadius: 40,
    elevation: 12,
  },
  deviceCompact: {
    width: 280,
  },
  appHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 2,
  },
  appTitle: {
    color: onb.ink,
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.4,
  },
  appSubtitle: {
    color: onb.inkFaint,
    fontSize: 11,
    marginTop: 1,
  },
  notch: {
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: onb.borderStrong,
    marginTop: 6,
  },
  sectionLabel: {
    color: onb.inkSoft,
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 2,
  },
  draftCard: {
    backgroundColor: onb.warnBg,
    borderWidth: 1,
    borderColor: tint(onb.warnInk, 0.25),
    borderRadius: 14,
    padding: 12,
    gap: 9,
  },
  cardHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  clientName: {
    color: onb.ink,
    fontSize: 13,
    fontWeight: '800',
    flexShrink: 1,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  channelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: tint(onb.primary, 0.12),
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  channelBadgeText: {
    color: onb.primaryDeep,
    fontSize: 10,
    fontWeight: '800',
  },
  aiBadge: {
    backgroundColor: onb.successBg,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  aiBadgeText: {
    color: onb.successInk,
    fontSize: 10,
    fontWeight: '800',
  },
  inbound: {
    color: onb.inkSoft,
    fontSize: 12,
    lineHeight: 17,
  },
  draftBubble: {
    backgroundColor: onb.card,
    borderWidth: 1,
    borderColor: onb.border,
    borderRadius: 12,
    padding: 10,
  },
  draftText: {
    color: onb.ink,
    fontSize: 12.5,
    lineHeight: 18,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 1,
  },
  approveBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: onb.primary,
    borderRadius: 9,
    paddingVertical: 9,
  },
  approveText: {
    color: onb.onColor,
    fontSize: 12.5,
    fontWeight: '900',
  },
  rejectBtn: {
    width: 38,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: onb.card,
    borderWidth: 1,
    borderColor: onb.borderStrong,
    borderRadius: 9,
  },
  convRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: onb.card,
    borderWidth: 1,
    borderColor: onb.border,
    borderRadius: 12,
    padding: 10,
  },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: tint(onb.primary, 0.14),
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: onb.primaryDeep,
    fontSize: 13,
    fontWeight: '900',
  },
  convBody: {
    flex: 1,
    minWidth: 0,
  },
  convName: {
    color: onb.ink,
    fontSize: 13,
    fontWeight: '800',
  },
  convPreview: {
    color: onb.inkFaint,
    fontSize: 11.5,
    marginTop: 1,
  },
  convMeta: {
    alignItems: 'flex-end',
    gap: 3,
  },
  autoTag: {
    backgroundColor: onb.successBg,
    borderRadius: 5,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  autoTagText: {
    color: onb.successInk,
    fontSize: 9,
    fontWeight: '800',
  },
  convChannel: {
    color: onb.inkFaint,
    fontSize: 10,
    fontWeight: '700',
  },
  footerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: tint(onb.primary, 0.1),
    borderRadius: 10,
    paddingVertical: 9,
    paddingHorizontal: 10,
    marginTop: 2,
  },
  footerPillText: {
    color: onb.primaryDeep,
    fontSize: 11,
    fontWeight: '700',
  },
});
