import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { ConsentPreference } from './types';
import { styles } from './styles';

type CookieConsentBannerProps = {
  isNarrow: boolean;
  visible: boolean;
  onSavePreference: (preference: ConsentPreference) => void;
};

export function CookieConsentBanner({
  isNarrow,
  visible,
  onSavePreference,
}: CookieConsentBannerProps) {
  if (!visible) {
    return null;
  }

  return (
    <View style={[styles.cookieBanner, isNarrow && styles.cookieBannerMobile]}>
      <Text style={styles.cookieText}>
        Nightime Agent uses essential storage for this page and will only add optional analytics after consent.
      </Text>
      <View style={styles.cookieActions}>
        <Pressable
          style={styles.cookieGhost}
          onPress={() => onSavePreference('rejected')}
          accessibilityRole="button"
          accessibilityLabel="Reject optional cookies"
        >
          <Text style={styles.cookieGhostLabel}>Reject optional</Text>
        </Pressable>
        <Pressable
          style={styles.cookieAccept}
          onPress={() => onSavePreference('accepted')}
          accessibilityRole="button"
          accessibilityLabel="Accept all cookies"
        >
          <Text style={styles.cookieAcceptLabel}>Accept all</Text>
        </Pressable>
      </View>
    </View>
  );
}
