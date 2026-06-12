import { Alert, Platform } from 'react-native';

/**
 * Cross-platform destructive-action confirmation. React Native Web's
 * Alert.alert with buttons is a no-op, so web uses the browser dialog.
 */
export function confirmAsync(title: string, message: string, confirmLabel = 'Confirm'): Promise<boolean> {
  if (Platform.OS === 'web') {
    return Promise.resolve(window.confirm(`${title}\n\n${message}`));
  }
  return new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
      { text: confirmLabel, style: 'destructive', onPress: () => resolve(true) },
    ]);
  });
}
